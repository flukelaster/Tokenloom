import {
  GENERATOR_VERSION,
  SCHEMA_VERSION,
  type InstalledSystemRecord,
  type RunJournal,
  type ValidationReport,
} from '@schema';
import {
  buildCanonicalTokenExport,
  compileExecutionPlan,
  computeThreeWayDiff,
  verifyExportedTokenBundle,
  type LiveDocumentSnapshot,
} from '@engine';
import { getLibraryById } from '@libraries';
import {
  DEFAULT_UI_SETTINGS,
  type PluginToUiMessage,
  type UiSettings,
  type UiToPluginMessage,
} from '@shared';

type MessageListener = (msg: PluginToUiMessage) => void;

const listeners = new Set<MessageListener>();

export const isStandaloneBrowser =
  typeof window !== 'undefined' && window.parent === window;

export function subscribePluginMessages(listener: MessageListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function dispatchToListeners(msg: PluginToUiMessage): void {
  for (const fn of listeners) {
    fn(msg);
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('message', (event: MessageEvent) => {
    const pluginMessage = event.data?.pluginMessage as PluginToUiMessage | undefined;
    if (pluginMessage && typeof pluginMessage.type === 'string') {
      dispatchToListeners(pluginMessage);
    }
  });
}

// Standalone Browser Simulator State (used ONLY when developing/testing iframe UI outside Figma)
let simInstalledSystems: InstalledSystemRecord[] = [];
let simIncompleteJournals: RunJournal[] = [];
let simSettings: UiSettings = { ...DEFAULT_UI_SETTINGS };
let simCancelFlag = false;

function buildSimulatedValidationReport(
  record: InstalledSystemRecord,
): ValidationReport {
  const lib = getLibraryById(record.libraryId)!;
  const plan = compileExecutionPlan(lib, record.config);
  const warnings = plan.contrastAudit.filter((c) => !c.passed);

  return {
    systemInstanceId: record.systemInstanceId,
    libraryId: record.libraryId,
    namespace: record.namespace,
    timestamp: new Date().toISOString(),
    passed: true,
    summaryCounts: {
      pass: 10 - (warnings.length > 0 ? 1 : 0),
      warning: warnings.length,
      error: 0,
    },
    categoryStatus: {
      tokens: 'pass',
      bindings: 'pass',
      themes: 'pass',
      components: 'pass',
      docs: 'pass',
      pages: 'pass',
      idempotency: 'pass',
      contrast: warnings.length > 0 ? 'warning' : 'pass',
      fonts: 'pass',
      license: 'pass',
    },
    issues: warnings.map((w, idx) => ({
      id: `SIM-${idx + 1}`,
      category: 'contrast',
      severity: 'warning',
      title: `Contrast warning (${w.componentLogicalId})`,
      detail: `${w.label}: Light ${w.lightRatio}:1, Dark ${w.darkRatio}:1`,
    })),
    nonBindableExceptions: plan.orderedComponents.flatMap((c) =>
      c.recipe.nonBindableExceptions.map((ex) => ({
        componentLogicalId: c.logicalId,
        nodeId: ex.nodeId,
        field: ex.field,
        reason: ex.reason[plan.config.locale],
      })),
    ),
    contrastChecks: plan.contrastAudit,
  };
}

async function handleStandaloneSimulation(msg: UiToPluginMessage): Promise<void> {
  if (msg.type === 'INIT_REQUEST') {
    dispatchToListeners({
      type: 'INIT_STATE',
      fileName: 'Design System Sandbox (Standalone UI Preview)',
      installedSystems: [...simInstalledSystems],
      incompleteJournals: [...simIncompleteJournals],
      settings: { ...simSettings },
      generatorVersion: GENERATOR_VERSION,
    });
    return;
  }

  if (msg.type === 'CANCEL_JOB') {
    simCancelFlag = true;
    return;
  }

  if (msg.type === 'GENERATE_SYSTEM' || msg.type === 'APPLY_SYSTEM_UPDATE') {
    const config =
      msg.type === 'GENERATE_SYSTEM'
        ? msg.config
        : msg.nextConfig ??
          simInstalledSystems.find((s) => s.systemInstanceId === msg.systemInstanceId)!.config;

    const lib = getLibraryById(config.libraryId);
    if (!lib || lib.readiness === 'coming-soon') {
      dispatchToListeners({
        type: 'OPERATION_ERROR',
        code: 'PACKAGE_GATE_FAILED',
        message: `Library "${lib?.displayName ?? config.libraryId}" is Coming Soon and locked by Quality Gate.`,
        recoverable: true,
      });
      return;
    }

    simCancelFlag = false;
    const runId = `sim_run_${Date.now()}`;
    const plan = compileExecutionPlan(lib, config);

    const stages: Array<[RunJournal['currentStage'], string, number, number, string]> = [
      ['preflight', 'Preflight & Capability Checks', 3, 3, 'Mode capability verified'],
      ['variables', 'Variables, Modes & Styles', plan.tokens.length, plan.tokens.length, `Variables (${plan.tokens.length})`],
      ['components', 'Native Components & Variants', plan.orderedComponents.length, plan.orderedComponents.length, `Components (${plan.orderedComponents.length})`],
      ['documentation', 'Documentation & Foundations', plan.pages.length, plan.pages.length, 'Component Docs & Examples'],
      ['validate', 'Output Validation', 2, 2, '98 Quality Report'],
    ];

    for (const [stage, stageLabel, done, total, itemLabel] of stages) {
      await new Promise((r) => setTimeout(r, 35));
      if (simCancelFlag) {
        const cancelledJournal: RunJournal = {
          runId,
          systemInstanceId: `ds_sim_${Date.now()}`,
          libraryId: lib.libraryId,
          namespace: plan.config.namespace,
          startedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'cancelled',
          currentStage: stage,
          config: plan.config,
          createdCollectionIds: [],
          createdVariableIds: [],
          createdStyleIds: [],
          createdNodeIds: [],
          createdPageIds: [],
          completedComponentIds: ['button'],
          errorMessage: 'Cancelled by user.',
        };
        simIncompleteJournals = [cancelledJournal];
        dispatchToListeners({
          type: 'JOB_FINISHED',
          runId,
          status: 'cancelled',
          message: 'Generation cancelled at batch checkpoint.',
          installedSystems: [...simInstalledSystems],
          incompleteJournals: [...simIncompleteJournals],
        });
        return;
      }
      dispatchToListeners({
        type: 'JOB_PROGRESS',
        progress: {
          runId,
          stage,
          stageLabel,
          completedInStage: done,
          totalInStage: total,
          currentItemLabel: itemLabel,
          elapsedMs: 120,
          stageTimingsMs: { preflight: 25 },
        },
      });
    }

    const existingIdx = simInstalledSystems.findIndex(
      (s) =>
        (msg.type === 'APPLY_SYSTEM_UPDATE' && s.systemInstanceId === msg.systemInstanceId) ||
        (msg.type === 'GENERATE_SYSTEM' &&
          (s.systemInstanceId === msg.existingSystemInstanceId ||
            (s.namespace.toLowerCase() === plan.config.namespace.toLowerCase() &&
              s.libraryId === lib.libraryId))),
    );

    const nowIso = new Date().toISOString();
    const objects: InstalledSystemRecord['objects'] = {};
    for (const tok of plan.tokens) {
      objects[tok.logicalId] = {
        logicalId: tok.logicalId,
        figmaId: `sim:var:${tok.logicalId}`,
        objectKind: 'variable',
        displayName: tok.name,
        lastGeneratedHash: plan.tokenHashes[tok.logicalId],
        managedFields: { name: tok.name },
      };
    }
    for (const comp of plan.orderedComponents) {
      objects[comp.logicalId] = {
        logicalId: comp.logicalId,
        figmaId: `sim:comp:${comp.logicalId}`,
        objectKind: comp.recipe.variantAxes.length > 0 ? 'component-set' : 'component',
        displayName: comp.recipe.name,
        lastGeneratedHash: comp.hash,
        managedFields: { name: comp.recipe.name },
      };
    }

    const record: InstalledSystemRecord = {
      systemInstanceId:
        existingIdx >= 0 ? simInstalledSystems[existingIdx].systemInstanceId : `ds_sim_${Date.now()}`,
      libraryId: lib.libraryId,
      libraryDisplayName: lib.displayName,
      namespace: plan.config.namespace,
      schemaVersion: SCHEMA_VERSION,
      packageVersion: lib.packageVersion,
      generatorVersion: GENERATOR_VERSION,
      generatedAt: existingIdx >= 0 ? simInstalledSystems[existingIdx].generatedAt : nowIso,
      updatedAt: nowIso,
      docsRefreshedAt: nowIso,
      config: plan.config,
      objects,
    };

    if (existingIdx >= 0) {
      simInstalledSystems[existingIdx] = record;
    } else {
      simInstalledSystems.push(record);
    }

    const validationReport = buildSimulatedValidationReport(record);
    dispatchToListeners({
      type: 'JOB_FINISHED',
      runId,
      status: 'completed',
      systemInstanceId: record.systemInstanceId,
      message: `${record.namespace} (${lib.displayName} v${lib.packageVersion}) generated successfully.`,
      validationReport,
      installedSystems: [...simInstalledSystems],
      incompleteJournals: [...simIncompleteJournals],
    });
    return;
  }

  if (msg.type === 'CLEANUP_INTERRUPTED_JOB') {
    simIncompleteJournals = simIncompleteJournals.filter((j) => j.runId !== msg.runId);
    dispatchToListeners({
      type: 'JOB_FINISHED',
      runId: msg.runId,
      status: 'cancelled',
      message: 'Cleaned up interrupted run artifacts.',
      installedSystems: [...simInstalledSystems],
      incompleteJournals: [...simIncompleteJournals],
    });
    return;
  }

  if (msg.type === 'RESUME_INTERRUPTED_JOB') {
    const j = simIncompleteJournals.find((x) => x.runId === msg.runId);
    if (j) {
      simIncompleteJournals = simIncompleteJournals.filter((x) => x.runId !== msg.runId);
      await handleStandaloneSimulation({
        type: 'GENERATE_SYSTEM',
        config: j.config,
        existingSystemInstanceId: j.systemInstanceId,
      });
    }
    return;
  }

  if (msg.type === 'PREVIEW_DIFF_REQUEST') {
    const record = simInstalledSystems.find((s) => s.systemInstanceId === msg.systemInstanceId);
    if (!record) return;
    const lib = getLibraryById(record.libraryId)!;
    const nextPlan = compileExecutionPlan(lib, msg.nextConfig ?? record.config);
    const liveSnap: LiveDocumentSnapshot = {
      systemInstanceId: record.systemInstanceId,
      objectsByLogicalId: Object.fromEntries(
        Object.entries(record.objects).map(([id, o]) => [
          id,
          {
            logicalId: id,
            figmaId: o.figmaId,
            exists: true,
            currentDisplayName: o.displayName,
            currentHash: o.lastGeneratedHash,
          },
        ]),
      ),
    };
    const diffReport = computeThreeWayDiff(record, liveSnap, nextPlan);
    dispatchToListeners({
      type: 'DIFF_PREVIEW_RESULT',
      systemInstanceId: record.systemInstanceId,
      diffReport,
    });
    return;
  }

  if (msg.type === 'VALIDATE_SYSTEM') {
    const record = simInstalledSystems.find((s) => s.systemInstanceId === msg.systemInstanceId);
    if (!record) return;
    dispatchToListeners({
      type: 'VALIDATION_RESULT',
      report: buildSimulatedValidationReport(record),
    });
    return;
  }

  if (msg.type === 'EXPORT_TOKENS_REQUEST') {
    const record = msg.systemInstanceId
      ? simInstalledSystems.find((s) => s.systemInstanceId === msg.systemInstanceId)
      : undefined;
    const config = record?.config ?? msg.adHocConfig;
    if (!config) return;
    const lib = getLibraryById(config.libraryId);
    if (!lib) return;
    const plan = compileExecutionPlan(lib, config);
    const bundle = buildCanonicalTokenExport(plan);
    const verification = verifyExportedTokenBundle(bundle);
    dispatchToListeners({
      type: 'EXPORT_TOKENS_RESULT',
      filename: `${lib.libraryId}-tokens.json`,
      bundle,
      bundleJson: JSON.stringify(bundle, null, 2),
      verification,
    });
    return;
  }

  if (msg.type === 'SWITCH_CANVAS_THEME') {
    dispatchToListeners({
      type: 'THEME_SWITCH_RESULT',
      updatedFrameCount: 6,
      mode: msg.mode,
      scope: msg.scope,
      message: `Switched 6 ${msg.scope === 'selection' ? 'selected' : 'managed root'} frames to ${msg.mode} mode.`,
    });
    return;
  }

  if (msg.type === 'DELETE_SYSTEM') {
    simInstalledSystems = simInstalledSystems.filter(
      (s) => s.systemInstanceId !== msg.systemInstanceId,
    );
    dispatchToListeners({
      type: 'DELETE_SYSTEM_RESULT',
      deletedCount: 124,
      skippedExternalRefs: [],
      installedSystems: [...simInstalledSystems],
      message: 'Removed Design System instance.',
    });
    return;
  }

  if (msg.type === 'SAVE_UI_SETTINGS') {
    simSettings = { ...msg.settings };
    dispatchToListeners({
      type: 'SETTINGS_SAVED',
      settings: { ...simSettings },
    });
  }
}

export function postToPlugin(message: UiToPluginMessage): void {
  if (isStandaloneBrowser) {
    void handleStandaloneSimulation(message);
    return;
  }
  window.parent.postMessage({ pluginMessage: message }, '*');
}
