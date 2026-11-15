import {
  GENERATOR_VERSION,
  SCHEMA_VERSION,
  type GenerationConfig,
  type InstalledSystemRecord,
  type ManagedObjectRecord,
  type RunJournal,
  type RunStage,
  type ValidationReport,
} from '@schema';
import {
  buildCanonicalTokenExport,
  compileExecutionPlan,
  computeThreeWayDiff,
  verifyExportedTokenBundle,
  type ConflictResolutionChoice,
  type ThreeWayDiffReport,
} from '@engine';
import { getLibraryById } from '@libraries';
import type { JobProgressPayload, PluginToUiMessage } from '@shared';
import {
  materializeSingleComponentPlan,
  type ComponentRenderContext,
  type MaterializedComponentEntry,
} from './components-engine';
import {
  ensureManagedPages,
  renderChangelogAndLicensePage,
  renderComponentDocumentationPage,
  renderFoundationsPage,
  renderPatternsPage,
  renderQualityReportPage,
  renderStartHerePage,
  renderThemePlaygroundPage,
} from './docs-engine';
import { FontManager } from './fonts';
import { runPreflightChecks } from './preflight';
import {
  getInstalledSystem,
  getNodeManagedMeta,
  getRunJournal,
  listIncompleteJournals,
  listInstalledSystems,
  removeInstalledSystemRecord,
  removeRunJournal,
  saveInstalledSystem,
  saveRunJournal,
} from './storage';
import { captureLiveDocumentSnapshot, validateInstalledSystemLive } from './validator-live';
import { materializeVariablesAndStyles } from './variables-engine';

class JobCancelledError extends Error {
  constructor() {
    super('Generation cancelled by user at batch checkpoint.');
    this.name = 'JobCancelledError';
  }
}

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function generateId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 9);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

export class PluginOrchestrator {
  private activeRunId: string | null = null;
  private cancelRequested = false;

  constructor(private readonly sendToUi: (msg: PluginToUiMessage) => void) {}

  requestCancel(runId?: string): void {
    if (!this.activeRunId) return;
    if (!runId || runId === this.activeRunId) {
      this.cancelRequested = true;
    }
  }

  private async checkpoint(): Promise<void> {
    await yieldToMain();
    if (this.cancelRequested) {
      throw new JobCancelledError();
    }
  }

  async executeGenerationOrUpdate(params: {
    config: GenerationConfig;
    existingSystemInstanceId?: string;
    conflictResolutions?: Record<string, ConflictResolutionChoice>;
    resumeJournal?: RunJournal;
  }): Promise<void> {
    if (this.activeRunId) {
      this.sendToUi({
        type: 'OPERATION_ERROR',
        code: 'JOB_ALREADY_RUNNING',
        message: 'A generation job is already in progress.',
        recoverable: true,
      });
      return;
    }

    const library = getLibraryById(params.config.libraryId);
    if (!library) {
      this.sendToUi({
        type: 'OPERATION_ERROR',
        code: 'UNKNOWN_LIBRARY',
        message: `Library "${params.config.libraryId}" does not exist in the catalog.`,
        recoverable: false,
      });
      return;
    }

    const runId = params.resumeJournal?.runId ?? generateId('run');
    this.activeRunId = runId;
    this.cancelRequested = false;

    const jobStartedMs = Date.now();
    const stageTimingsMs: Partial<Record<RunStage, number>> = {};
    let stageStartMs = Date.now();
    let currentStage: RunStage = 'preflight';

    const reportProgress = async (
      stage: RunStage,
      stageLabel: string,
      completedInStage: number,
      totalInStage: number,
      currentItemLabel: string,
    ) => {
      if (stage !== currentStage) {
        stageTimingsMs[currentStage] = Date.now() - stageStartMs;
        currentStage = stage;
        stageStartMs = Date.now();
      }
      const progress: JobProgressPayload = {
        runId,
        stage,
        stageLabel,
        completedInStage,
        totalInStage,
        currentItemLabel,
        elapsedMs: Date.now() - jobStartedMs,
        stageTimingsMs: { ...stageTimingsMs },
      };
      this.sendToUi({ type: 'JOB_PROGRESS', progress });
      await this.checkpoint();
    };

    const plan = compileExecutionPlan(library, params.config);
    const fontManager = new FontManager();

    const matchingIncomplete = !params.resumeJournal
      ? listIncompleteJournals().find(
          (j) =>
            j.libraryId === library.libraryId &&
            j.namespace.trim().toLowerCase() === plan.config.namespace.trim().toLowerCase(),
        )
      : undefined;

    let journal: RunJournal =
      params.resumeJournal ?? {
        runId,
        systemInstanceId:
          params.existingSystemInstanceId ??
          matchingIncomplete?.systemInstanceId ??
          generateId('ds'),
        libraryId: library.libraryId,
        namespace: plan.config.namespace,
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'in_progress',
        currentStage: 'preflight',
        config: plan.config,
        createdCollectionIds: [],
        createdVariableIds: [],
        createdStyleIds: [],
        createdNodeIds: [],
        createdPageIds: [],
        completedComponentIds: [],
      };

    try {
      await figma.currentPage.loadAsync();
      // Steps 1–5: Preflight, Schema/License check, Font preload & Mode capability probe
      await reportProgress('preflight', 'Preflight & Capability Checks', 1, 3, 'Auditing package & namespace');
      const preflight = await runPreflightChecks(
        library,
        plan,
        params.existingSystemInstanceId ?? params.resumeJournal?.systemInstanceId,
      );

      if (!preflight.ok) {
        this.activeRunId = null;
        this.sendToUi({
          type: 'OPERATION_ERROR',
          code: preflight.errorCode ?? 'PREFLIGHT_FAILED',
          message: preflight.errorMessage ?? 'Preflight failed.',
          recoverable: true,
        });
        this.sendToUi({
          type: 'JOB_FINISHED',
          runId,
          status: 'failed',
          message: preflight.errorMessage ?? 'Preflight check stopped generation before modifying canvas.',
          installedSystems: listInstalledSystems(),
          incompleteJournals: listIncompleteJournals(),
        });
        return;
      }

      const existingRecord = preflight.matchedExistingSystem;
      const systemInstanceId =
        existingRecord?.systemInstanceId ?? journal.systemInstanceId;
      journal.systemInstanceId = systemInstanceId;

      await reportProgress('preflight', 'Preflight & Capability Checks', 2, 3, 'Preloading fonts & fallbacks');
      await fontManager.preloadPlanFonts(plan.activeFontPreset, plan.config.locale);

      // Compute skipLogicalIds so local edits are preserved on re-run & update! (Section 12)
      const skipLogicalIds = new Set<string>();
      if (existingRecord) {
        const liveSnap = await captureLiveDocumentSnapshot(existingRecord);
        const diff = computeThreeWayDiff(existingRecord, liveSnap, plan);
        for (const entry of diff.entries) {
          if (entry.action === 'preserve-local') {
            skipLogicalIds.add(entry.logicalId);
          } else if (entry.action === 'conflict') {
            const choice = params.conflictResolutions?.[entry.logicalId] ?? 'keep';
            if (choice === 'keep' || choice === 'skip') {
              skipLogicalIds.add(entry.logicalId);
            }
          }
        }
      }

      await reportProgress('preflight', 'Preflight & Capability Checks', 3, 3, 'Initializing run journal');
      journal.status = 'in_progress';
      journal.updatedAt = new Date().toISOString();
      saveRunJournal(journal);

      const recordedObjects: Record<string, ManagedObjectRecord> = existingRecord
        ? { ...existingRecord.objects }
        : {};
      const recordObject = (obj: ManagedObjectRecord) => {
        recordedObjects[obj.logicalId] = obj;
      };

      // Step 6: Create/sync Pages in manifest order
      const pagesByLogicalId = await ensureManagedPages(
        plan.pages,
        systemInstanceId,
        library.libraryId,
        library.packageVersion,
        existingRecord,
        skipLogicalIds,
        journal.createdPageIds,
        recordObject,
      );
      saveRunJournal(journal);

      // Step 7 & 8a: Variables & Styles
      journal.currentStage = 'variables';
      saveRunJournal(journal);
      const tokensCtx = await materializeVariablesAndStyles({
        systemInstanceId,
        plan,
        existingRecord,
        skipLogicalIds,
        journal,
        fontManager,
        recordObject,
        onProgress: async (done, total, label) => {
          await reportProgress('variables', 'Variables, Modes & Styles', done, total, label);
        },
      });
      saveRunJournal(journal);

      // Step 8b & 9: Components in topological order
      journal.currentStage = 'components';
      saveRunJournal(journal);

      const componentsByLogicalId = new Map<string, MaterializedComponentEntry>();
      const renderCtx: ComponentRenderContext = {
        systemInstanceId,
        plan,
        tokensCtx,
        fontManager,
        pagesByLogicalId,
        componentsByLogicalId,
        existingRecord,
        skipLogicalIds,
        journal,
        recordObject,
      };

      const totalComponents = plan.orderedComponents.length;
      for (let i = 0; i < totalComponents; i++) {
        const compPlan = plan.orderedComponents[i];
        await reportProgress(
          'components',
          'Native Components & Variants',
          i + 1,
          totalComponents,
          `Component: ${compPlan.recipe.name} (${compPlan.variants.length} variant${compPlan.variants.length === 1 ? '' : 's'})`,
        );
        await materializeSingleComponentPlan(compPlan, renderCtx);
        if (!journal.completedComponentIds.includes(compPlan.logicalId)) {
          journal.completedComponentIds.push(compPlan.logicalId);
        }
        journal.updatedAt = new Date().toISOString();
        saveRunJournal(journal);
      }

      // Deprecate removed components without deleting them (Section 12)
      if (existingRecord) {
        const plannedCompIds = new Set(plan.orderedComponents.map((c) => c.logicalId));
        for (const [oldId, oldObj] of Object.entries(existingRecord.objects)) {
          if (
            (oldObj.objectKind === 'component-set' || oldObj.objectKind === 'component') &&
            !plannedCompIds.has(oldId)
          ) {
            const oldNode = await figma.getNodeByIdAsync(oldObj.figmaId);
            if (
              oldNode &&
              (oldNode.type === 'COMPONENT_SET' || oldNode.type === 'COMPONENT') &&
              !oldNode.description.startsWith('[DEPRECATED]')
            ) {
              oldNode.description = `[DEPRECATED] ${oldNode.description}`;
            }
            recordObject({ ...oldObj, deprecated: true });
          }
        }
      }

      // Step 10a: Documentation & Foundations Pages
      journal.currentStage = 'documentation';
      saveRunJournal(journal);
      const nowIso = new Date().toISOString();
      const userFacingComponents = plan.orderedComponents.filter(
        (c) => c.recipe.tier !== 'helper',
      );
      const totalDocsSteps = userFacingComponents.length + 3;

      await reportProgress('documentation', 'Documentation & Foundations', 1, totalDocsSteps, '00 Start Here');
      await renderStartHerePage(renderCtx, nowIso);

      await reportProgress('documentation', 'Documentation & Foundations', 2, totalDocsSteps, '01 Foundations');
      await renderFoundationsPage(renderCtx, nowIso);

      for (let i = 0; i < userFacingComponents.length; i++) {
        const compPlan = userFacingComponents[i];
        await reportProgress(
          'documentation',
          'Documentation & Foundations',
          i + 3,
          totalDocsSteps,
          `Docs: ${compPlan.recipe.name}`,
        );
        await renderComponentDocumentationPage(compPlan, renderCtx, nowIso);
      }

      await reportProgress(
        'documentation',
        'Documentation & Foundations',
        totalDocsSteps,
        totalDocsSteps,
        '99 Changelog & License',
      );
      await renderChangelogAndLicensePage(renderCtx);

      // Step 10b: Composed Patterns & Light/Dark Theme Playground
      journal.currentStage = 'patterns-playground';
      saveRunJournal(journal);
      await reportProgress('patterns-playground', 'Patterns & Theme Playground', 1, 2, '90 Composed Patterns');
      await renderPatternsPage(renderCtx);

      await reportProgress('patterns-playground', 'Patterns & Theme Playground', 2, 2, '91 Light/Dark Playground');
      await renderThemePlaygroundPage(renderCtx);

      // Step 11: Save Baseline Registry + Run Live Validator + Render 98 Quality Report
      const installedRecord: InstalledSystemRecord = {
        systemInstanceId,
        libraryId: library.libraryId,
        libraryDisplayName: library.displayName,
        namespace: plan.config.namespace,
        schemaVersion: SCHEMA_VERSION,
        packageVersion: library.packageVersion,
        generatorVersion: GENERATOR_VERSION,
        generatedAt: existingRecord?.generatedAt ?? nowIso,
        updatedAt: nowIso,
        docsRefreshedAt: nowIso,
        config: plan.config,
        objects: recordedObjects,
      };
      saveInstalledSystem(installedRecord);

      journal.currentStage = 'validate';
      saveRunJournal(journal);
      await reportProgress('validate', 'Output Validation', 1, 2, 'Auditing bindings, aliases & modes');
      const validationReport: ValidationReport = await validateInstalledSystemLive(
        installedRecord,
        fontManager.fallbackNotes,
      );

      await reportProgress('validate', 'Output Validation', 2, 2, 'Writing 98 Quality Report page');
      await renderQualityReportPage(renderCtx, validationReport);
      // Persist updated quality-report frame object in registry
      installedRecord.objects = recordedObjects;
      saveInstalledSystem(installedRecord);

      // Mark Journal Complete & Remove any superseded incomplete journals for the same system/namespace
      removeRunJournal(runId);
      for (const stale of listIncompleteJournals()) {
        if (
          stale.systemInstanceId === systemInstanceId ||
          (stale.libraryId === library.libraryId &&
            stale.namespace.trim().toLowerCase() === plan.config.namespace.trim().toLowerCase())
        ) {
          removeRunJournal(stale.runId);
        }
      }

      // Step 12: Switch active page to 00 Start Here overview while keeping plugin open
      const startPage = pagesByLogicalId.get('page.start-here');
      if (startPage) {
        await figma.setCurrentPageAsync(startPage);
      }

      stageTimingsMs[currentStage] = Date.now() - stageStartMs;
      this.activeRunId = null;

      this.sendToUi({
        type: 'JOB_FINISHED',
        runId,
        status: 'completed',
        systemInstanceId,
        message: `${plan.config.namespace} (${library.displayName} v${library.packageVersion}) ready — ${userFacingComponents.length} component families, ${plan.tokens.length} variables.`,
        validationReport,
        installedSystems: listInstalledSystems(),
        incompleteJournals: listIncompleteJournals(),
      });
    } catch (err) {
      this.activeRunId = null;
      if (err instanceof JobCancelledError) {
        journal.status = 'cancelled';
        journal.updatedAt = new Date().toISOString();
        journal.errorMessage = 'Cancelled by user at checkpoint.';
        saveRunJournal(journal);
        this.sendToUi({
          type: 'JOB_FINISHED',
          runId,
          status: 'cancelled',
          systemInstanceId: journal.systemInstanceId,
          message: `Generation cancelled cleanly after ${journal.completedComponentIds.length} components. You can Resume or Clean up artifacts from this run.`,
          installedSystems: listInstalledSystems(),
          incompleteJournals: listIncompleteJournals(),
        });
        return;
      }

      const errorDetail = err instanceof Error ? err.message : String(err);
      journal.status = 'failed';
      journal.updatedAt = new Date().toISOString();
      journal.errorMessage = errorDetail;
      saveRunJournal(journal);

      this.sendToUi({
        type: 'OPERATION_ERROR',
        code: 'GENERATION_FAILED',
        message: errorDetail,
        recoverable: true,
      });
      this.sendToUi({
        type: 'JOB_FINISHED',
        runId,
        status: 'failed',
        systemInstanceId: journal.systemInstanceId,
        message: `Generation stopped due to error: ${errorDetail}`,
        installedSystems: listInstalledSystems(),
        incompleteJournals: listIncompleteJournals(),
      });
    }
  }

  async resumeInterruptedRun(runId: string): Promise<void> {
    const journal = getRunJournal(runId);
    if (!journal) {
      this.sendToUi({
        type: 'OPERATION_ERROR',
        code: 'JOURNAL_NOT_FOUND',
        message: `Run journal "${runId}" was not found.`,
        recoverable: false,
      });
      return;
    }
    await this.executeGenerationOrUpdate({
      config: journal.config,
      existingSystemInstanceId: journal.systemInstanceId,
      resumeJournal: journal,
    });
  }

  /**
   * Safely cleans up ONLY artifacts created in a specific interrupted RunJournal,
   * refusing to delete any component that has already been instantiated by the user on non-managed pages.
   */
  async cleanupInterruptedRun(runId: string): Promise<void> {
    const journal = getRunJournal(runId);
    if (!journal) {
      this.sendToUi({
        type: 'OPERATION_ERROR',
        code: 'JOURNAL_NOT_FOUND',
        message: `Run journal "${runId}" was not found.`,
        recoverable: false,
      });
      return;
    }

    const managedPageIdSet = new Set(journal.createdPageIds);
    const externallyUsedMainIds = await this.collectExternalUserInstanceRefs(managedPageIdSet);
    let removedCount = 0;

    for (const nodeId of [...journal.createdNodeIds].reverse()) {
      if (externallyUsedMainIds.has(nodeId)) continue;
      const node = await figma.getNodeByIdAsync(nodeId);
      if (node && 'remove' in node) {
        try {
          node.remove();
          removedCount += 1;
        } catch {
          // Node already removed with parent
        }
      }
    }

    // Ensure at least one page remains in the Figma document before removing created pages
    for (const pageId of journal.createdPageIds) {
      if (figma.root.children.length <= 1) break;
      const page = figma.root.children.find((p) => p.id === pageId);
      if (page) {
        await page.loadAsync();
        if (page.children.length === 0) {
          if (figma.currentPage.id === page.id) {
            const fallbackPage = figma.root.children.find((p) => p.id !== page.id);
            if (fallbackPage) {
              await figma.setCurrentPageAsync(fallbackPage);
            }
          }
          page.remove();
          removedCount += 1;
        }
      }
    }

    const localTextStyles = await figma.getLocalTextStylesAsync();
    const localEffectStyles = await figma.getLocalEffectStylesAsync();
    for (const sId of journal.createdStyleIds) {
      const ts = localTextStyles.find((s) => s.id === sId);
      if (ts) {
        ts.remove();
        removedCount += 1;
      }
      const es = localEffectStyles.find((s) => s.id === sId);
      if (es) {
        es.remove();
        removedCount += 1;
      }
    }

    const localVars = await figma.variables.getLocalVariablesAsync();
    for (const vId of journal.createdVariableIds) {
      const v = localVars.find((x) => x.id === vId);
      if (v) {
        v.remove();
        removedCount += 1;
      }
    }

    const localCols = await figma.variables.getLocalVariableCollectionsAsync();
    for (const cId of journal.createdCollectionIds) {
      const c = localCols.find((x) => x.id === cId);
      if (c && c.variableIds.length === 0) {
        c.remove();
        removedCount += 1;
      }
    }

    removeRunJournal(runId);
    this.sendToUi({
      type: 'JOB_FINISHED',
      runId,
      status: 'cancelled',
      message: `Cleaned up ${removedCount} artifact(s) from interrupted run.`,
      installedSystems: listInstalledSystems(),
      incompleteJournals: listIncompleteJournals(),
    });
  }

  private async collectExternalUserInstanceRefs(
    managedPageIds: ReadonlySet<string>,
  ): Promise<Set<string>> {
    const usedIds = new Set<string>();
    for (const page of figma.root.children) {
      if (managedPageIds.has(page.id)) continue;
      const meta = getNodeManagedMeta(page);
      if (meta) continue;
      await page.loadAsync();
      const scan = async (n: SceneNode) => {
        if (n.type === 'INSTANCE') {
          const main = await n.getMainComponentAsync();
          if (main) {
            let cursor: BaseNode | null = main;
            while (cursor && cursor.type !== 'DOCUMENT') {
              usedIds.add(cursor.id);
              cursor = cursor.parent;
            }
          }
        } else if ('children' in n) {
          for (const c of n.children) await scan(c);
        }
      };
      for (const child of page.children) {
        await scan(child);
      }
    }
    return usedIds;
  }

  async computeDiffPreview(
    systemInstanceId: string,
    overrideConfig?: GenerationConfig,
  ): Promise<ThreeWayDiffReport | null> {
    const record = getInstalledSystem(systemInstanceId);
    if (!record) {
      this.sendToUi({
        type: 'OPERATION_ERROR',
        code: 'SYSTEM_NOT_FOUND',
        message: 'Design System instance not found in registry.',
        recoverable: false,
      });
      return null;
    }
    const library = getLibraryById(overrideConfig?.libraryId ?? record.libraryId);
    if (!library) return null;

    const nextPlan = compileExecutionPlan(library, overrideConfig ?? record.config);
    const liveSnap = await captureLiveDocumentSnapshot(record);
    const diffReport = computeThreeWayDiff(record, liveSnap, nextPlan);
    this.sendToUi({
      type: 'DIFF_PREVIEW_RESULT',
      systemInstanceId,
      diffReport,
    });
    return diffReport;
  }

  async refreshDocumentationOnly(systemInstanceId: string): Promise<void> {
    const record = getInstalledSystem(systemInstanceId);
    if (!record) return;
    // Re-running generation with existing config & keep-local behavior refreshes managed docs & timestamps idempotently
    await this.executeGenerationOrUpdate({
      config: record.config,
      existingSystemInstanceId: systemInstanceId,
    });
  }

  async runLiveValidation(systemInstanceId: string): Promise<void> {
    const record = getInstalledSystem(systemInstanceId);
    if (!record) {
      this.sendToUi({
        type: 'OPERATION_ERROR',
        code: 'SYSTEM_NOT_FOUND',
        message: 'Design System instance not found.',
        recoverable: false,
      });
      return;
    }
    const report = await validateInstalledSystemLive(record);
    this.sendToUi({ type: 'VALIDATION_RESULT', report });
  }

  /**
   * Switches Light/Dark Variable Mode ONLY on managed root frames or user's current selection (Section 4.4 & 11).
   */
  async switchCanvasTheme(
    systemInstanceId: string,
    mode: 'light' | 'dark',
    scope: 'managed-roots' | 'selection',
  ): Promise<void> {
    const record = getInstalledSystem(systemInstanceId);
    if (!record) return;

    const collections = await figma.variables.getLocalVariableCollectionsAsync();
    const semRecord = record.objects['collection.semantic'];
    const semCollection = collections.find((c) => c.id === semRecord?.figmaId);
    if (!semCollection) {
      this.sendToUi({
        type: 'OPERATION_ERROR',
        code: 'SEMANTIC_COLLECTION_MISSING',
        message: 'Semantic Variable Collection not found for this system.',
        recoverable: true,
      });
      return;
    }

    const desiredModeName = mode === 'dark' ? 'Dark' : 'Light';
    const modeEntry = semCollection.modes.find((m) => m.name === desiredModeName);
    if (!modeEntry) return;

    let updatedFrameCount = 0;

    if (scope === 'selection') {
      for (const selected of figma.currentPage.selection) {
        if ('setExplicitVariableModeForCollection' in selected) {
          selected.setExplicitVariableModeForCollection(semCollection, modeEntry.modeId);
          updatedFrameCount += 1;
        }
      }
    } else {
      for (const obj of Object.values(record.objects)) {
        if (obj.objectKind === 'docs-section' || obj.objectKind === 'pattern-frame') {
          const node = await figma.getNodeByIdAsync(obj.figmaId);
          if (node && node.type === 'FRAME') {
            node.setExplicitVariableModeForCollection(semCollection, modeEntry.modeId);
            updatedFrameCount += 1;
          }
        }
      }
    }

    this.sendToUi({
      type: 'THEME_SWITCH_RESULT',
      updatedFrameCount,
      mode,
      scope,
      message:
        scope === 'selection' && updatedFrameCount === 0
          ? 'Select one or more Frames on the canvas first to switch selection mode.'
          : `Switched ${updatedFrameCount} ${scope === 'selection' ? 'selected frame(s)' : 'managed root frame(s)'} to ${desiredModeName} mode.`,
    });
  }

  async navigateToTarget(
    systemInstanceId: string,
    target: 'overview' | 'components' | 'quality-report' | 'playground',
  ): Promise<void> {
    const record = getInstalledSystem(systemInstanceId);
    if (!record) return;

    let pageLogicalId = 'page.start-here';
    if (target === 'quality-report') {
      pageLogicalId = 'page.quality-report';
    } else if (target === 'playground') {
      pageLogicalId = 'page.playground';
    } else if (target === 'components') {
      const firstCompPage = Object.keys(record.objects).find((k) =>
        k.startsWith('page.component.'),
      );
      if (firstCompPage) pageLogicalId = firstCompPage;
    }

    const trackedPage = record.objects[pageLogicalId];
    const page = figma.root.children.find((p) => p.id === trackedPage?.figmaId);
    if (page) {
      await page.loadAsync();
      await figma.setCurrentPageAsync(page);
      if (page.children.length > 0) {
        figma.viewport.scrollAndZoomIntoView([page.children[0]]);
      }
    }
  }

  exportTokens(systemInstanceId?: string, adHocConfig?: GenerationConfig): void {
    let config: GenerationConfig | undefined = adHocConfig;
    let libraryId = adHocConfig?.libraryId;

    if (systemInstanceId) {
      const record = getInstalledSystem(systemInstanceId);
      if (record) {
        config = record.config;
        libraryId = record.libraryId;
      }
    }

    const library = libraryId ? getLibraryById(libraryId) : undefined;
    if (!library || !config) {
      this.sendToUi({
        type: 'OPERATION_ERROR',
        code: 'EXPORT_TARGET_MISSING',
        message: 'Could not resolve library configuration for token export.',
        recoverable: true,
      });
      return;
    }

    const plan = compileExecutionPlan(library, config);
    const bundle = buildCanonicalTokenExport(plan);
    const verification = verifyExportedTokenBundle(bundle);
    const slug = config.namespace
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    this.sendToUi({
      type: 'EXPORT_TOKENS_RESULT',
      filename: `${slug || library.libraryId}-tokens-v${library.packageVersion}.json`,
      bundle,
      bundleJson: JSON.stringify(bundle, null, 2),
      verification,
    });
  }

  async deleteInstalledSystem(systemInstanceId: string): Promise<void> {
    const record = getInstalledSystem(systemInstanceId);
    if (!record) return;

    const managedPageIds = new Set(
      Object.values(record.objects)
        .filter((o) => o.objectKind === 'page')
        .map((o) => o.figmaId),
    );
    const externalRefs = await this.collectExternalUserInstanceRefs(managedPageIds);
    const skippedExternalRefs: string[] = [];
    let deletedCount = 0;

    // Delete managed components & frames not referenced outside managed pages
    for (const obj of Object.values(record.objects)) {
      if (
        obj.objectKind === 'component-set' ||
        obj.objectKind === 'component' ||
        obj.objectKind === 'docs-section' ||
        obj.objectKind === 'playground-frame' ||
        obj.objectKind === 'pattern-frame'
      ) {
        if (externalRefs.has(obj.figmaId)) {
          skippedExternalRefs.push(`${obj.displayName} (referenced on user page)`);
          continue;
        }
        const node = await figma.getNodeByIdAsync(obj.figmaId);
        if (node) {
          const meta = getNodeManagedMeta(node);
          if (meta?.systemInstanceId === systemInstanceId) {
            node.remove();
            deletedCount += 1;
          }
        }
      }
    }

    // Delete managed pages if no user content or preserved external components remain
    const containsAnyComponent = (n: BaseNode): boolean => {
      if (n.type === 'COMPONENT_SET' || n.type === 'COMPONENT') return true;
      if ('children' in n) {
        return n.children.some((c) => containsAnyComponent(c));
      }
      return false;
    };

    for (const obj of Object.values(record.objects)) {
      if (obj.objectKind === 'page') {
        if (externalRefs.has(obj.figmaId)) {
          continue;
        }
        if (figma.root.children.length <= 1) {
          skippedExternalRefs.push(`${obj.displayName} (last remaining page in file)`);
          continue;
        }
        const page = figma.root.children.find((p) => p.id === obj.figmaId);
        if (page) {
          const meta = getNodeManagedMeta(page);
          if (meta?.systemInstanceId === systemInstanceId) {
            await page.loadAsync();
            const hasRemainingComponents = containsAnyComponent(page);
            if (!hasRemainingComponents) {
              if (figma.currentPage.id === page.id) {
                const fallbackPage = figma.root.children.find((p) => p.id !== page.id);
                if (fallbackPage) {
                  await figma.setCurrentPageAsync(fallbackPage);
                }
              }
              page.remove();
              deletedCount += 1;
            }
          }
        }
      }
    }

    // Delete styles & variables if no components were preserved
    if (skippedExternalRefs.length === 0) {
      const textStyles = await figma.getLocalTextStylesAsync();
      const effectStyles = await figma.getLocalEffectStylesAsync();
      const vars = await figma.variables.getLocalVariablesAsync();
      const cols = await figma.variables.getLocalVariableCollectionsAsync();

      for (const obj of Object.values(record.objects)) {
        if (obj.objectKind === 'text-style') {
          const s = textStyles.find((x) => x.id === obj.figmaId);
          if (s && getNodeManagedMeta(s)?.systemInstanceId === systemInstanceId) {
            s.remove();
            deletedCount += 1;
          }
        } else if (obj.objectKind === 'effect-style') {
          const s = effectStyles.find((x) => x.id === obj.figmaId);
          if (s && getNodeManagedMeta(s)?.systemInstanceId === systemInstanceId) {
            s.remove();
            deletedCount += 1;
          }
        } else if (obj.objectKind === 'variable') {
          const v = vars.find((x) => x.id === obj.figmaId);
          if (v && getNodeManagedMeta(v)?.systemInstanceId === systemInstanceId) {
            v.remove();
            deletedCount += 1;
          }
        }
      }

      for (const obj of Object.values(record.objects)) {
        if (obj.objectKind === 'variable-collection') {
          const c = cols.find((x) => x.id === obj.figmaId);
          if (c && getNodeManagedMeta(c)?.systemInstanceId === systemInstanceId && c.variableIds.length === 0) {
            c.remove();
            deletedCount += 1;
          }
        }
      }
    }

    removeInstalledSystemRecord(systemInstanceId);
    this.sendToUi({
      type: 'DELETE_SYSTEM_RESULT',
      deletedCount,
      skippedExternalRefs,
      installedSystems: listInstalledSystems(),
      message:
        skippedExternalRefs.length > 0
          ? `Removed ${deletedCount} owned object(s); preserved ${skippedExternalRefs.length} item(s) still referenced by user designs.`
          : `Removed "${record.namespace}" (${deletedCount} managed objects).`,
    });
  }
}
