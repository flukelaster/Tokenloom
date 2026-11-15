import { describe, expect, it, vi } from 'vitest';
import type { GenerationConfig } from '@schema';
import { getLibraryById } from '@libraries';
import type { PluginToUiMessage } from '@shared';
import { bootPluginMain } from '../../src/plugin/main';
import { createFigmaMock } from '../helpers/figma-mock';

function lastMsg<T extends PluginToUiMessage['type']>(
  messages: PluginToUiMessage[],
  type: T,
): Extract<PluginToUiMessage, { type: T }> {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].type === type) {
      return messages[i] as Extract<PluginToUiMessage, { type: T }>;
    }
  }
  throw new Error(`Expected message of type "${type}" in [${messages.map((m) => m.type).join(', ')}]`);
}

function makeDefaultConfig(
  libraryId: string,
  overrides: Partial<GenerationConfig> = {},
): GenerationConfig {
  const lib = getLibraryById(libraryId)!;
  return {
    libraryId,
    namespace: `Acme ${lib.defaultNamespace}`,
    locale: 'en',
    pageNaming: 'numbered',
    scope: 'core',
    selectedComponentIds: [],
    brandHex: lib.defaultBrandHex,
    fontPresetId: lib.defaultFontPresetId,
    radiusPreset: lib.defaultRadiusPreset,
    density: 'default',
    tokenPrefix: '',
    strictFidelity: false,
    ...overrides,
  };
}

describe('Figma Plugin End-to-End Integration Pipeline (dynamic-page Runtime)', () => {
  it('generates full shadcn/ui Core (15 families + 3-tier Variables + Docs + Playground + Validator) with 0 errors', async () => {
    const harness = createFigmaMock({ fileName: 'Shadcn Production File' });
    harness.installGlobals();
    bootPluginMain();

    await harness.sendUiMessage({ type: 'INIT_REQUEST' });
    const initMsg = lastMsg(harness.sentToUi, 'INIT_STATE');
    expect(initMsg.fileName).toBe('Shadcn Production File');

    const config = makeDefaultConfig('shadcn', { locale: 'th' });
    await harness.sendUiMessage({ type: 'GENERATE_SYSTEM', config });

    const finished = lastMsg(harness.sentToUi, 'JOB_FINISHED');
    expect(finished.status).toBe('completed');

    // 1. Live Output Validator must pass with 0 errors
    expect(finished.validationReport?.passed).toBe(true);
    expect(finished.validationReport?.summaryCounts.error).toBe(0);
    expect(finished.installedSystems).toHaveLength(1);

    // 2. Verify 3 Variable collections & Light/Dark modes
    const stats = harness.getStats();
    expect(stats.collections).toBe(3); // Zero leftover probe collections!
    expect(stats.variables).toBe(109);
    expect(stats.componentSets).toBe(15);
    expect(stats.standaloneComponents).toBe(8); // 8 helper icons
    expect(stats.pages).toBe(22); // Initial Page 1 + 21 managed pages

    const collections = await harness.figma.variables.getLocalVariableCollectionsAsync();
    const semanticCol = collections.find((c) => c.name.endsWith('/Semantic'))!;
    expect(semanticCol.modes.map((m) => m.name)).toEqual(['Light', 'Dark']);

    // 3. Verify Thai descriptions & cross-collection VARIABLE_ALIAS chains
    const vars = await harness.figma.variables.getLocalVariablesAsync();
    for (const v of vars) {
      expect(v.description.length).toBeGreaterThan(10);
    }
    const actionPrimaryBg = vars.find((v) => v.name === 'action/primary/background')!;
    const lightVal = actionPrimaryBg.valuesByMode[semanticCol.modes[0].modeId];
    expect(lightVal).toMatchObject({ type: 'VARIABLE_ALIAS' });

    // 4. Verify Button ComponentSet has TEXT, BOOLEAN, and INSTANCE_SWAP properties + zero root mode lock
    const sys = finished.installedSystems[0];
    const buttonSetId = sys.objects.button.figmaId;
    const buttonSet = (await harness.figma.getNodeByIdAsync(buttonSetId)) as ComponentSetNode;
    expect(buttonSet.type).toBe('COMPONENT_SET');
    expect(buttonSet.explicitVariableModes?.[semanticCol.id]).toBeUndefined();

    const propTypes = Object.values(buttonSet.componentPropertyDefinitions).map((d) => d.type);
    expect(propTypes).toContain('VARIANT');
    expect(propTypes).toContain('TEXT');
    expect(propTypes).toContain('BOOLEAN');
    expect(propTypes).toContain('INSTANCE_SWAP');

    // 5. Verify Theme Playground sets explicit Light & Dark modes on its two root columns
    const lightCol = (await harness.figma.getNodeByIdAsync(
      sys.objects['playground.column.light'].figmaId,
    )) as FrameNode;
    const darkCol = (await harness.figma.getNodeByIdAsync(
      sys.objects['playground.column.dark'].figmaId,
    )) as FrameNode;
    expect(lightCol.explicitVariableModes?.[semanticCol.id]).toBe(semanticCol.modes[0].modeId);
    expect(darkCol.explicitVariableModes?.[semanticCol.id]).toBe(semanticCol.modes[1].modeId);

    // 6. Active page switched to 00 Start Here at completion
    expect(harness.figma.currentPage.name).toContain('00 Start Here');
  });

  it('is strictly idempotent on re-run (zero duplicates and 100% preserved Figma IDs)', async () => {
    const harness = createFigmaMock();
    harness.installGlobals();
    bootPluginMain();

    const config = makeDefaultConfig('shadcn', { scope: 'technical-slice' });
    await harness.sendUiMessage({ type: 'GENERATE_SYSTEM', config });

    const firstFinish = lastMsg(harness.sentToUi, 'JOB_FINISHED');
    const firstSys = firstFinish.installedSystems[0];
    const statsAfterRun1 = harness.getStats();

    // Re-run identical config
    await harness.sendUiMessage({
      type: 'GENERATE_SYSTEM',
      config,
      existingSystemInstanceId: firstSys.systemInstanceId,
    });

    const secondFinish = lastMsg(harness.sentToUi, 'JOB_FINISHED');
    const secondSys = secondFinish.installedSystems[0];
    const statsAfterRun2 = harness.getStats();

    expect(statsAfterRun2.collections).toBe(statsAfterRun1.collections);
    expect(statsAfterRun2.variables).toBe(statsAfterRun1.variables);
    expect(statsAfterRun2.pages).toBe(statsAfterRun1.pages);
    expect(statsAfterRun2.componentSets).toBe(statsAfterRun1.componentSets);
    expect(statsAfterRun2.standaloneComponents).toBe(statsAfterRun1.standaloneComponents);

    // Verify Figma IDs of managed variables, pages, and ComponentSets were preserved in-place
    expect(secondSys.objects.button.figmaId).toBe(firstSys.objects.button.figmaId);
    expect(secondSys.objects.input.figmaId).toBe(firstSys.objects.input.figmaId);
    expect(secondSys.objects['semantic.action.primary.bg'].figmaId).toBe(
      firstSys.objects['semantic.action.primary.bg'].figmaId,
    );

    // Verify Propstar Matrix layers inside showcase container are never duplicated on re-run
    const buttonShowcase = (await harness.figma.getNodeByIdAsync(
      secondSys.objects['frame.showcase.button'].figmaId,
    )) as FrameNode;
    expect(
      buttonShowcase.children.filter((c) => c.name === '_Propstar Grid & Axis Labels'),
    ).toHaveLength(1);
    expect(
      buttonShowcase.children.filter((c) => c.name === '_Boolean Permutations'),
    ).toHaveLength(1);
    expect(buttonShowcase.children.filter((c) => c.type === 'COMPONENT_SET')).toHaveLength(1);
  });

  it('preserves local Figma edits, resolves Three-Way Diff conflicts, and protects Custom Notes', async () => {
    const harness = createFigmaMock();
    harness.installGlobals();
    bootPluginMain();

    const config = makeDefaultConfig('shadcn', { scope: 'technical-slice', brandHex: '#2563EB' });
    await harness.sendUiMessage({ type: 'GENERATE_SYSTEM', config });

    const finish1 = lastMsg(harness.sentToUi, 'JOB_FINISHED');
    const sys = finish1.installedSystems[0];

    // 1. User adds custom team note inside Button page's Custom Notes frame
    const buttonPage = harness.figma.root.children.find((p) => p.name.includes('Button'))!;
    const customNotesFrame = buttonPage.children.find((f) =>
      f.name.startsWith('Custom Notes'),
    ) as FrameNode;
    expect(customNotesFrame).toBeDefined();
    const teamAnnotation = harness.figma.createRectangle();
    teamAnnotation.name = 'Team_Custom_Callout_Marker';
    customNotesFrame.appendChild(teamAnnotation);

    // 2. User edits brand.600 variable description locally in Figma
    const brand600Id = sys.objects['primitive.color.brand.600'].figmaId;
    const vars = await harness.figma.variables.getLocalVariablesAsync();
    const brand600Var = vars.find((v) => v.id === brand600Id)!;
    brand600Var.description = 'Team custom brand primary 600 override note';

    // 3. Preview diff with a NEW brandHex (#E11D48) -> brand.600 should be flagged as 'conflict'!
    const nextConfig: GenerationConfig = { ...config, brandHex: '#E11D48' };
    await harness.sendUiMessage({
      type: 'PREVIEW_DIFF_REQUEST',
      systemInstanceId: sys.systemInstanceId,
      nextConfig,
    });

    const diffMsg = lastMsg(harness.sentToUi, 'DIFF_PREVIEW_RESULT');
    const brand600Diff = diffMsg.diffReport.entries.find(
      (e) => e.logicalId === 'primitive.color.brand.600',
    );
    expect(brand600Diff?.action).toBe('conflict');

    // 4. Apply update choosing 'keep' for brand.600 -> local description stays intact AND Custom Notes stay intact!
    await harness.sendUiMessage({
      type: 'APPLY_SYSTEM_UPDATE',
      systemInstanceId: sys.systemInstanceId,
      nextConfig,
      conflictResolutions: { 'primitive.color.brand.600': 'keep' },
    });

    expect(brand600Var.description).toBe('Team custom brand primary 600 override note');
    expect(
      customNotesFrame.children.some((c) => c.name === 'Team_Custom_Callout_Marker'),
    ).toBe(true);

    // 5. Refresh Documentation -> Custom Notes still preserved!
    await harness.sendUiMessage({
      type: 'REFRESH_DOCUMENTATION',
      systemInstanceId: sys.systemInstanceId,
    });
    expect(
      customNotesFrame.children.some((c) => c.name === 'Team_Custom_Callout_Marker'),
    ).toBe(true);
  });

  it('supports Ant Design (compact density), MUI, Carbon (Apache-2.0 NOTICE), and blocks Coming Soon & colliding namespaces', async () => {
    const harness = createFigmaMock();
    harness.installGlobals();
    bootPluginMain();

    // 1. Coming soon library (Chakra UI) is blocked cleanly by Quality Gate
    await harness.sendUiMessage({
      type: 'GENERATE_SYSTEM',
      config: makeDefaultConfig('chakra'),
    });
    const gateErr = lastMsg(harness.sentToUi, 'OPERATION_ERROR');
    expect(gateErr.code).toBe('PACKAGE_GATE_FAILED');
    expect(harness.getStats().collections).toBe(0);

    // 2. Ant Design with Compact density
    await harness.sendUiMessage({
      type: 'GENERATE_SYSTEM',
      config: makeDefaultConfig('antd', {
        namespace: 'Enterprise AntD',
        scope: 'technical-slice',
        density: 'compact',
      }),
    });
    const antdFinish = lastMsg(harness.sentToUi, 'JOB_FINISHED');
    expect(antdFinish.status).toBe('completed');

    // 3. Namespace collision check: trying to generate MUI into 'Enterprise AntD' fails safely
    await harness.sendUiMessage({
      type: 'GENERATE_SYSTEM',
      config: makeDefaultConfig('mui', {
        namespace: 'Enterprise AntD',
        scope: 'technical-slice',
      }),
    });
    const collisionErr = lastMsg(harness.sentToUi, 'OPERATION_ERROR');
    expect(collisionErr.code).toBe('NAMESPACE_COLLISION');

    // 4. MUI in its own isolated namespace succeeds alongside AntD in the same Figma file!
    await harness.sendUiMessage({
      type: 'GENERATE_SYSTEM',
      config: makeDefaultConfig('mui', {
        namespace: 'Consumer MUI',
        scope: 'technical-slice',
      }),
    });
    const muiFinish = lastMsg(harness.sentToUi, 'JOB_FINISHED');
    expect(muiFinish.status).toBe('completed');
    expect(muiFinish.installedSystems).toHaveLength(2);

    // 5. Carbon Design System (Beta, Apache-2.0) succeeds and passes live validation
    await harness.sendUiMessage({
      type: 'GENERATE_SYSTEM',
      config: makeDefaultConfig('carbon', {
        namespace: 'Cloud Carbon',
        scope: 'core',
      }),
    });
    const carbonFinish = lastMsg(harness.sentToUi, 'JOB_FINISHED');
    expect(carbonFinish.status).toBe('completed');
    expect(carbonFinish.validationReport?.passed).toBe(true);
  });

  it('handles Starter plan 1-mode limit cleanly without leaving probe collections behind', async () => {
    const starterHarness = createFigmaMock({ maxModesPerCollection: 1 });
    starterHarness.installGlobals();
    bootPluginMain();

    await starterHarness.sendUiMessage({
      type: 'GENERATE_SYSTEM',
      config: makeDefaultConfig('shadcn', { scope: 'technical-slice' }),
    });

    const errMsg = lastMsg(starterHarness.sentToUi, 'OPERATION_ERROR');
    expect(errMsg.code).toBe('MODE_LIMIT_EXCEEDED');

    // Zero leftover probe collections or mutated pages!
    const stats = starterHarness.getStats();
    expect(stats.collections).toBe(0);
    expect(stats.variables).toBe(0);
    expect(stats.pages).toBe(1);
  });

  it('supports mid-run Cancel, Resume, Scoped Theme Switch, and External-Ref-Safe Delete', async () => {
    const harness = createFigmaMock();
    harness.installGlobals();
    const orchestrator = bootPluginMain();

    // Intercept JOB_PROGRESS to trigger mid-run cancel during 'components' stage
    const origPost = harness.figma.ui.postMessage;
    let cancelledOnce = false;
    harness.figma.ui.postMessage = (msg: unknown) => {
      origPost(msg);
      const typed = msg as { type?: string; progress?: { stage?: string } };
      if (!cancelledOnce && typed.type === 'JOB_PROGRESS' && typed.progress?.stage === 'components') {
        cancelledOnce = true;
        orchestrator.requestCancel();
      }
    };

    const config = makeDefaultConfig('shadcn', { scope: 'technical-slice' });
    await harness.sendUiMessage({ type: 'GENERATE_SYSTEM', config });

    const cancelFinish = lastMsg(harness.sentToUi, 'JOB_FINISHED');
    expect(cancelFinish.status).toBe('cancelled');
    expect(cancelFinish.incompleteJournals).toHaveLength(1);
    const interruptedRunId = cancelFinish.incompleteJournals[0].runId;

    // Restore normal postMessage and test Resume of interrupted journal!
    harness.figma.ui.postMessage = origPost;
    await harness.sendUiMessage({
      type: 'RESUME_INTERRUPTED_JOB',
      runId: interruptedRunId,
    });

    const resumedFinish = lastMsg(harness.sentToUi, 'JOB_FINISHED');
    expect(resumedFinish.status).toBe('completed');
    expect(resumedFinish.incompleteJournals).toHaveLength(0);
    const sys = resumedFinish.installedSystems[0];

    // Test Scoped Canvas Theme Switcher: unrelated user frame on Page 1 must NOT be mutated!
    const userPage = harness.figma.root.children.find((p) => p.name === 'Page 1')!;
    await harness.figma.setCurrentPageAsync(userPage);
    const unrelatedUserFrame = harness.figma.createFrame();
    unrelatedUserFrame.name = 'Unrelated Marketing Frame';

    await harness.sendUiMessage({
      type: 'SWITCH_CANVAS_THEME',
      systemInstanceId: sys.systemInstanceId,
      mode: 'dark',
      scope: 'managed-roots',
    });
    const themeSwitchMsg = lastMsg(harness.sentToUi, 'THEME_SWITCH_RESULT');
    expect(themeSwitchMsg.updatedFrameCount).toBeGreaterThan(0);
    expect(Object.keys(unrelatedUserFrame.explicitVariableModes ?? {})).toHaveLength(0);

    // Place a live Button instance onto user's Page 1, then Delete System -> Button ComponentSet must be preserved!
    const buttonSet = (await harness.figma.getNodeByIdAsync(
      sys.objects.button.figmaId,
    )) as ComponentSetNode;
    const externalInstance = buttonSet.defaultVariant.createInstance();
    unrelatedUserFrame.appendChild(externalInstance);

    await harness.sendUiMessage({
      type: 'DELETE_SYSTEM',
      systemInstanceId: sys.systemInstanceId,
    });
    const deleteMsg = lastMsg(harness.sentToUi, 'DELETE_SYSTEM_RESULT');
    expect(deleteMsg.skippedExternalRefs.length).toBeGreaterThan(0);
    expect(await harness.figma.getNodeByIdAsync(buttonSet.id)).not.toBeNull();
  });

  it('runs cleanly inside a QuickJS-like sandbox where global URL is undefined and enforces Auto Layout sizing order', async () => {
    vi.stubGlobal('URL', undefined);
    try {
      expect(typeof URL).toBe('undefined');

      const harness = createFigmaMock({ fileName: 'DSS Testing' });
      harness.installGlobals();
      bootPluginMain();

      const config = makeDefaultConfig('shadcn', {
        namespace: 'shadcn',
        scope: 'core',
        tokenPrefix: 'acme.v1 ',
      });
      await harness.sendUiMessage({ type: 'GENERATE_SYSTEM', config });

      const finished = lastMsg(harness.sentToUi, 'JOB_FINISHED');
      expect(finished.status).toBe('completed');
      expect(finished.validationReport?.passed).toBe(true);

      // Verify Figma FLOAT opacity variables use 0..100 percentage scale (50 = 50% opacity)
      const vars = await harness.figma.variables.getLocalVariablesAsync();
      const disabledOpacity = vars.find((v) => v.name.endsWith('opacity/disabled'))!;
      expect(Object.values(disabledOpacity.valuesByMode)[0]).toBe(50);

      const sys = finished.installedSystems[0];
      const startHereRoot = (await harness.figma.getNodeByIdAsync(
        sys.objects['docs.start-here'].figmaId,
      )) as FrameNode;
      expect(startHereRoot.primaryAxisSizingMode).toBe('AUTO');
      expect(startHereRoot.counterAxisSizingMode).toBe('FIXED');

      const buttonSet = (await harness.figma.getNodeByIdAsync(
        sys.objects.button.figmaId,
      )) as ComponentSetNode;
      expect(buttonSet.layoutMode).toBe('NONE');
      expect(buttonSet.clipsContent).toBe(false);

      // Verify Propstar Embedded 2D Matrix on Button (Leading Icon + Trailing Icon + Size + Variant + State)
      const buttonStage = (await harness.figma.getNodeByIdAsync(
        sys.objects['frame.showcase.button'].figmaId,
      )) as FrameNode;
      expect(buttonStage.clipsContent).toBe(false);
      expect(buttonStage.layoutMode).toBe('NONE');
      expect(buttonStage.width).toBeGreaterThanOrEqual(buttonSet.x + buttonSet.width);
      expect(buttonStage.height).toBeGreaterThanOrEqual(buttonSet.y + buttonSet.height);

      // Topmost child in z-order must be the native ComponentSetNode so variants remain directly clickable
      expect(buttonStage.children[buttonStage.children.length - 1].id).toBe(buttonSet.id);
      const gridLayer = buttonStage.children.find(
        (c) => c.name === '_Propstar Grid & Axis Labels',
      ) as FrameNode;
      const boolLayer = buttonStage.children.find(
        (c) => c.name === '_Boolean Permutations',
      ) as FrameNode;
      expect(gridLayer).toBeDefined();
      expect(gridLayer.locked).toBe(true);
      expect(boolLayer).toBeDefined();
      expect(boolLayer.children.length).toBeGreaterThan(0);

      // Variants must form a true 2D centered grid (3 Size column centerlines x 25 Variant*State row centerlines)
      const variantNodes = buttonSet.children.filter(
        (c): c is ComponentNode => c.type === 'COMPONENT',
      );
      const distinctColCenters = new Set(
        variantNodes.map((v) => Math.round(v.x + v.width / 2)),
      );
      const distinctRowCenters = new Set(
        variantNodes.map((v) => Math.round(v.y + v.height / 2)),
      );
      expect(distinctColCenters.size).toBe(3); // Small, Medium, Large
      expect(distinctRowCenters.size).toBe(25); // 5 Variants x 5 States (with Small/Large Pressed left as clean empty cells)

      // Verify Documentation frame sits cleanly below the full Propstar Matrix with zero overlap
      const buttonDocs = (await harness.figma.getNodeByIdAsync(
        sys.objects['docs.component.button'].figmaId,
      )) as FrameNode;
      expect(buttonDocs.clipsContent).toBe(false);
      expect(buttonDocs.y).toBeGreaterThanOrEqual(buttonStage.y + buttonStage.height + 40);

      // Verify wide surface components (Dialog, Card, Alert) never clip in either Showcase or Docs
      for (const compId of ['dialog', 'card', 'alert', 'tabs', 'tooltip']) {
        const compStage = (await harness.figma.getNodeByIdAsync(
          sys.objects[`frame.showcase.${compId}`].figmaId,
        )) as FrameNode;
        const compOwner = (await harness.figma.getNodeByIdAsync(
          sys.objects[compId].figmaId,
        )) as ComponentSetNode;
        expect(compStage.clipsContent).toBe(false);
        expect(compOwner.clipsContent).toBe(false);
        expect(compStage.width).toBeGreaterThanOrEqual(compOwner.x + compOwner.width);
        expect(compStage.height).toBeGreaterThanOrEqual(compOwner.y + compOwner.height);
      }
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('cleans up an interrupted run safely even when figma.currentPage is one of the created pages', async () => {
    const harness = createFigmaMock({ fileName: 'DSS Testing' });
    harness.installGlobals();
    const orchestrator = bootPluginMain();

    const origPost = harness.figma.ui.postMessage;
    let cancelledInVars = false;
    harness.figma.ui.postMessage = (msg: unknown) => {
      origPost(msg);
      const typed = msg as { type?: string; progress?: { stage?: string } };
      if (!cancelledInVars && typed.type === 'JOB_PROGRESS' && typed.progress?.stage === 'variables') {
        cancelledInVars = true;
        orchestrator.requestCancel();
      }
    };

    const config = makeDefaultConfig('shadcn', { scope: 'technical-slice' });
    await harness.sendUiMessage({ type: 'GENERATE_SYSTEM', config });
    harness.figma.ui.postMessage = origPost;

    const cancelledMsg = lastMsg(harness.sentToUi, 'JOB_FINISHED');
    expect(cancelledMsg.status).toBe('cancelled');
    const interruptedRunId = cancelledMsg.incompleteJournals[0].runId;

    // Simulate user clicking onto one of the newly created empty pages (e.g., Badge/Button page)
    const createdManagedPage = harness.figma.root.children.find((p) =>
      p.name.includes('Button'),
    )!;
    await harness.figma.setCurrentPageAsync(createdManagedPage);

    await harness.sendUiMessage({
      type: 'CLEANUP_INTERRUPTED_JOB',
      runId: interruptedRunId,
    });

    const cleanupMsg = lastMsg(harness.sentToUi, 'JOB_FINISHED');
    expect(cleanupMsg.incompleteJournals).toHaveLength(0);
    expect(harness.getStats().pages).toBe(1);
    expect(harness.figma.currentPage.name).toBe('Page 1');
  });
});
