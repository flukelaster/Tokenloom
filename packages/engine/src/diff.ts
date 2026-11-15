import type { InstalledSystemRecord, ManagedObjectRecord, MigrationRule } from '@schema';
import type { CompiledExecutionPlan } from './compiler';

export type DiffActionKind =
  | 'unchanged'
  | 'safe-update'
  | 'preserve-local'
  | 'conflict'
  | 'added'
  | 'deprecated'
  | 'recreate-missing';

export type ConflictResolutionChoice = 'replace' | 'keep' | 'skip';

export interface LiveObjectState {
  logicalId: string;
  figmaId: string;
  exists: boolean;
  currentDisplayName: string;
  currentHash: string;
  modifiedFields?: string[];
}

export interface LiveDocumentSnapshot {
  systemInstanceId: string;
  objectsByLogicalId: Record<string, LiveObjectState>;
}

export interface ThreeWayDiffEntry {
  logicalId: string;
  objectKind: ManagedObjectRecord['objectKind'];
  displayName: string;
  figmaId?: string;
  action: DiffActionKind;
  baselineHash?: string;
  currentHash?: string;
  nextHash?: string;
  summary: string;
  structuralBreaking?: boolean;
}

export interface ThreeWayDiffReport {
  systemInstanceId: string;
  fromPackageVersion: string;
  toPackageVersion: string;
  appliedMigrations: MigrationRule[];
  counts: Record<DiffActionKind, number>;
  hasConflicts: boolean;
  hasLocalChanges: boolean;
  entries: ThreeWayDiffEntry[];
}

export function computeThreeWayDiff(
  baseline: InstalledSystemRecord,
  live: LiveDocumentSnapshot,
  nextPlan: CompiledExecutionPlan,
): ThreeWayDiffReport {
  const entries: ThreeWayDiffEntry[] = [];

  const applicableMigrations = nextPlan.library.migrations.filter(
    (m) =>
      m.fromPackageVersion === baseline.packageVersion &&
      m.toPackageVersion === nextPlan.library.packageVersion,
  );

  const renamedMap = new Map<string, string>();
  const breakingComponentSet = new Set<string>();
  for (const mig of applicableMigrations) {
    for (const [oldId, newId] of Object.entries(mig.renamedLogicalIds ?? {})) {
      renamedMap.set(oldId, newId);
    }
    for (const compId of mig.structuralBreakingComponentIds ?? []) {
      breakingComponentSet.add(compId);
    }
  }

  // Build desired next object hashes
  const nextObjects = new Map<
    string,
    { kind: ManagedObjectRecord['objectKind']; displayName: string; hash: string }
  >();

  for (const page of nextPlan.pages) {
    nextObjects.set(page.logicalId, {
      kind: 'page',
      displayName: page.title,
      hash: `page:${page.pageKey}:${page.title}`,
    });
  }

  for (const tok of nextPlan.tokens) {
    nextObjects.set(tok.logicalId, {
      kind: 'variable',
      displayName: tok.name,
      hash: nextPlan.tokenHashes[tok.logicalId],
    });
  }

  for (const ts of nextPlan.textStyles) {
    nextObjects.set(ts.logicalId, {
      kind: 'text-style',
      displayName: ts.name,
      hash: nextPlan.textStyleHashes[ts.logicalId],
    });
  }

  for (const es of nextPlan.effectStyles) {
    nextObjects.set(es.logicalId, {
      kind: 'effect-style',
      displayName: es.name,
      hash: nextPlan.effectStyleHashes[es.logicalId],
    });
  }

  for (const comp of nextPlan.orderedComponents) {
    const isSet = comp.recipe.variantAxes.length > 0;
    nextObjects.set(comp.logicalId, {
      kind: isSet ? 'component-set' : 'component',
      displayName: comp.recipe.name,
      hash: comp.hash,
    });
  }

  const visitedNextIds = new Set<string>();

  for (const [oldLogicalId, baseObj] of Object.entries(baseline.objects)) {
    if (
      baseObj.objectKind === 'variable-collection' ||
      baseObj.objectKind === 'docs-section' ||
      baseObj.objectKind === 'playground-frame' ||
      baseObj.objectKind === 'pattern-frame'
    ) {
      continue;
    }

    const effectiveLogicalId = renamedMap.get(oldLogicalId) ?? oldLogicalId;
    const nextObj = nextObjects.get(effectiveLogicalId);
    const liveObj = live.objectsByLogicalId[oldLogicalId] ?? live.objectsByLogicalId[effectiveLogicalId];

    if (!nextObj) {
      // Removed from new target -> Deprecate instead of deleting! (Section 12)
      entries.push({
        logicalId: oldLogicalId,
        objectKind: baseObj.objectKind,
        displayName: baseObj.displayName,
        figmaId: baseObj.figmaId,
        action: 'deprecated',
        baselineHash: baseObj.lastGeneratedHash,
        currentHash: liveObj?.currentHash,
        summary: 'Removed from target scope/version; will be marked [Deprecated] without deleting existing references.',
      });
      continue;
    }

    visitedNextIds.add(effectiveLogicalId);

    if (!liveObj || !liveObj.exists) {
      entries.push({
        logicalId: effectiveLogicalId,
        objectKind: nextObj.kind,
        displayName: nextObj.displayName,
        figmaId: baseObj.figmaId,
        action: 'recreate-missing',
        baselineHash: baseObj.lastGeneratedHash,
        nextHash: nextObj.hash,
        summary: 'Managed object was removed from the Figma file and can be recreated.',
      });
      continue;
    }

    const localEdited = liveObj.currentHash !== baseObj.lastGeneratedHash;
    const packageUpdated =
      nextObj.hash !== baseObj.lastGeneratedHash ||
      breakingComponentSet.has(effectiveLogicalId);

    if (!localEdited && !packageUpdated) {
      entries.push({
        logicalId: effectiveLogicalId,
        objectKind: nextObj.kind,
        displayName: liveObj.currentDisplayName || nextObj.displayName,
        figmaId: liveObj.figmaId,
        action: 'unchanged',
        baselineHash: baseObj.lastGeneratedHash,
        currentHash: liveObj.currentHash,
        nextHash: nextObj.hash,
        summary: 'Matches generated baseline and target specification.',
      });
    } else if (!localEdited && packageUpdated) {
      entries.push({
        logicalId: effectiveLogicalId,
        objectKind: nextObj.kind,
        displayName: liveObj.currentDisplayName || nextObj.displayName,
        figmaId: liveObj.figmaId,
        action: breakingComponentSet.has(effectiveLogicalId) ? 'conflict' : 'safe-update',
        baselineHash: baseObj.lastGeneratedHash,
        currentHash: liveObj.currentHash,
        nextHash: nextObj.hash,
        structuralBreaking: breakingComponentSet.has(effectiveLogicalId),
        summary: breakingComponentSet.has(effectiveLogicalId)
          ? 'Structural component migration affects instance overrides; choose Replace, Keep, or Skip.'
          : 'Unmodified locally; safe to update in-place while preserving Figma ID.',
      });
    } else if (localEdited && !packageUpdated) {
      entries.push({
        logicalId: effectiveLogicalId,
        objectKind: nextObj.kind,
        displayName: liveObj.currentDisplayName || nextObj.displayName,
        figmaId: liveObj.figmaId,
        action: 'preserve-local',
        baselineHash: baseObj.lastGeneratedHash,
        currentHash: liveObj.currentHash,
        nextHash: nextObj.hash,
        summary: 'Local modifications detected in Figma; local edits will be preserved.',
      });
    } else if (liveObj.currentHash === nextObj.hash && !breakingComponentSet.has(effectiveLogicalId)) {
      entries.push({
        logicalId: effectiveLogicalId,
        objectKind: nextObj.kind,
        displayName: liveObj.currentDisplayName || nextObj.displayName,
        figmaId: liveObj.figmaId,
        action: 'unchanged',
        baselineHash: baseObj.lastGeneratedHash,
        currentHash: liveObj.currentHash,
        nextHash: nextObj.hash,
        summary: 'Current Figma state already matches new target specification.',
      });
    } else {
      entries.push({
        logicalId: effectiveLogicalId,
        objectKind: nextObj.kind,
        displayName: liveObj.currentDisplayName || nextObj.displayName,
        figmaId: liveObj.figmaId,
        action: 'conflict',
        baselineHash: baseObj.lastGeneratedHash,
        currentHash: liveObj.currentHash,
        nextHash: nextObj.hash,
        structuralBreaking: breakingComponentSet.has(effectiveLogicalId),
        summary:
          'Modified both locally in Figma and in target package/config. Choose Replace, Keep local, or Skip.',
      });
    }
  }

  for (const [nextId, nextObj] of nextObjects.entries()) {
    if (!visitedNextIds.has(nextId)) {
      entries.push({
        logicalId: nextId,
        objectKind: nextObj.kind,
        displayName: nextObj.displayName,
        action: 'added',
        nextHash: nextObj.hash,
        summary: 'New managed object in target scope/version.',
      });
    }
  }

  const counts: Record<DiffActionKind, number> = {
    unchanged: 0,
    'safe-update': 0,
    'preserve-local': 0,
    conflict: 0,
    added: 0,
    deprecated: 0,
    'recreate-missing': 0,
  };
  for (const entry of entries) {
    counts[entry.action] += 1;
  }

  return {
    systemInstanceId: baseline.systemInstanceId,
    fromPackageVersion: baseline.packageVersion,
    toPackageVersion: nextPlan.library.packageVersion,
    appliedMigrations: applicableMigrations,
    counts,
    hasConflicts: counts.conflict > 0,
    hasLocalChanges: counts['preserve-local'] > 0 || counts.conflict > 0,
    entries,
  };
}
