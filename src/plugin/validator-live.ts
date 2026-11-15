import {
  validateLibraryDefinition,
  type InstalledSystemRecord,
  type ValidationCategory,
  type ValidationIssue,
  type ValidationReport,
  type ValidationSeverity,
} from '@schema';
import {
  compileExecutionPlan,
  deterministicHash,
  type LiveDocumentSnapshot,
  type LiveObjectState,
} from '@engine';
import { getLibraryById } from '@libraries';
import type { FontFallbackNote } from './fonts';
import { getNodeManagedMeta } from './storage';

/**
 * Reads live Figma state for every managed object in an InstalledSystemRecord so
 * Three-Way Diff accurately detects renames, variable edits, component edits, and deletions.
 */
export async function captureLiveDocumentSnapshot(
  record: InstalledSystemRecord,
): Promise<LiveDocumentSnapshot> {
  const localVariables = await figma.variables.getLocalVariablesAsync();
  const varById = new Map(localVariables.map((v) => [v.id, v]));

  const localTextStyles = await figma.getLocalTextStylesAsync();
  const textStyleById = new Map(localTextStyles.map((s) => [s.id, s]));

  const localEffectStyles = await figma.getLocalEffectStylesAsync();
  const effectStyleById = new Map(localEffectStyles.map((s) => [s.id, s]));

  const pageById = new Map(figma.root.children.map((p) => [p.id, p]));

  const objectsByLogicalId: Record<string, LiveObjectState> = {};

  for (const [logicalId, baseObj] of Object.entries(record.objects)) {
    if (baseObj.objectKind === 'page') {
      let page = pageById.get(baseObj.figmaId);
      if (!page) {
        page = figma.root.children.find((p) => {
          const meta = getNodeManagedMeta(p);
          return meta?.systemInstanceId === record.systemInstanceId && meta?.logicalId === logicalId;
        });
      }
      if (!page) {
        objectsByLogicalId[logicalId] = {
          logicalId,
          figmaId: baseObj.figmaId,
          exists: false,
          currentDisplayName: baseObj.displayName,
          currentHash: 'missing',
        };
        continue;
      }
      const modified = page.name !== baseObj.managedFields.name;
      objectsByLogicalId[logicalId] = {
        logicalId,
        figmaId: page.id,
        exists: true,
        currentDisplayName: page.name,
        currentHash: modified
          ? `local-edit:${deterministicHash({ name: page.name })}`
          : baseObj.lastGeneratedHash,
        modifiedFields: modified ? ['name'] : [],
      };
      continue;
    }

    if (baseObj.objectKind === 'variable') {
      let v = varById.get(baseObj.figmaId);
      if (!v) {
        v = localVariables.find((cand) => {
          const meta = getNodeManagedMeta(cand);
          return meta?.systemInstanceId === record.systemInstanceId && meta?.logicalId === logicalId;
        });
      }
      if (!v) {
        objectsByLogicalId[logicalId] = {
          logicalId,
          figmaId: baseObj.figmaId,
          exists: false,
          currentDisplayName: baseObj.displayName,
          currentHash: 'missing',
        };
        continue;
      }

      const modifiedFields: string[] = [];
      if (v.name !== baseObj.managedFields.name) modifiedFields.push('name');
      if (v.description !== baseObj.managedFields.description) modifiedFields.push('description');
      const currentValuesJson = JSON.stringify(v.valuesByMode);
      if (baseObj.managedFields.valuesJson && currentValuesJson !== baseObj.managedFields.valuesJson) {
        modifiedFields.push('valuesByMode');
      }

      objectsByLogicalId[logicalId] = {
        logicalId,
        figmaId: v.id,
        exists: true,
        currentDisplayName: v.name,
        currentHash:
          modifiedFields.length > 0
            ? `local-edit:${deterministicHash({ name: v.name, desc: v.description, vals: v.valuesByMode })}`
            : baseObj.lastGeneratedHash,
        modifiedFields,
      };
      continue;
    }

    if (baseObj.objectKind === 'text-style') {
      const style = textStyleById.get(baseObj.figmaId);
      if (!style) {
        objectsByLogicalId[logicalId] = {
          logicalId,
          figmaId: baseObj.figmaId,
          exists: false,
          currentDisplayName: baseObj.displayName,
          currentHash: 'missing',
        };
        continue;
      }
      const modified =
        style.name !== baseObj.managedFields.name ||
        String(style.fontSize) !== baseObj.managedFields.fontSize;
      objectsByLogicalId[logicalId] = {
        logicalId,
        figmaId: style.id,
        exists: true,
        currentDisplayName: style.name,
        currentHash: modified
          ? `local-edit:${deterministicHash({ name: style.name, fontSize: style.fontSize })}`
          : baseObj.lastGeneratedHash,
        modifiedFields: modified ? ['style'] : [],
      };
      continue;
    }

    if (baseObj.objectKind === 'effect-style') {
      const style = effectStyleById.get(baseObj.figmaId);
      if (!style) {
        objectsByLogicalId[logicalId] = {
          logicalId,
          figmaId: baseObj.figmaId,
          exists: false,
          currentDisplayName: baseObj.displayName,
          currentHash: 'missing',
        };
        continue;
      }
      const modified = style.name !== baseObj.managedFields.name;
      objectsByLogicalId[logicalId] = {
        logicalId,
        figmaId: style.id,
        exists: true,
        currentDisplayName: style.name,
        currentHash: modified
          ? `local-edit:${deterministicHash({ name: style.name })}`
          : baseObj.lastGeneratedHash,
        modifiedFields: modified ? ['name'] : [],
      };
      continue;
    }

    if (baseObj.objectKind === 'component-set' || baseObj.objectKind === 'component') {
      const node = await figma.getNodeByIdAsync(baseObj.figmaId);
      if (!node || (node.type !== 'COMPONENT_SET' && node.type !== 'COMPONENT')) {
        objectsByLogicalId[logicalId] = {
          logicalId,
          figmaId: baseObj.figmaId,
          exists: false,
          currentDisplayName: baseObj.displayName,
          currentHash: 'missing',
        };
        continue;
      }
      const modifiedFields: string[] = [];
      if (node.name !== baseObj.managedFields.name) modifiedFields.push('name');
      if (node.description !== baseObj.managedFields.description) modifiedFields.push('description');
      if (
        node.type === 'COMPONENT_SET' &&
        baseObj.managedFields.variantCount &&
        String(node.children.length) !== baseObj.managedFields.variantCount
      ) {
        modifiedFields.push('variants');
      }

      objectsByLogicalId[logicalId] = {
        logicalId,
        figmaId: node.id,
        exists: true,
        currentDisplayName: node.name,
        currentHash:
          modifiedFields.length > 0
            ? `local-edit:${deterministicHash({ name: node.name, desc: node.description, len: 'children' in node ? node.children.length : 0 })}`
            : baseObj.lastGeneratedHash,
        modifiedFields,
      };
    }
  }

  return {
    systemInstanceId: record.systemInstanceId,
    objectsByLogicalId,
  };
}

/**
 * Validates the live Figma output of an installed Design System against all Section 13 Acceptance Criteria.
 */
export async function validateInstalledSystemLive(
  record: InstalledSystemRecord,
  fontNotes: FontFallbackNote[] = [],
): Promise<ValidationReport> {
  const library = getLibraryById(record.libraryId);
  const issues: ValidationIssue[] = [];
  let issueSeq = 1;
  const pushIssue = (
    category: ValidationCategory,
    severity: ValidationSeverity,
    title: string,
    detail: string,
    logicalId?: string,
    figmaId?: string,
  ) => {
    issues.push({
      id: `VAL-${String(issueSeq++).padStart(3, '0')}`,
      category,
      severity,
      title,
      detail,
      logicalId,
      figmaId,
    });
  };

  if (!library) {
    pushIssue(
      'license',
      'error',
      'Unknown Library Definition',
      `Library "${record.libraryId}" is not available in the bundled catalog.`,
    );
    return finalizeValidationReport(record, issues, [], []);
  }

  const plan = compileExecutionPlan(library, record.config);
  const pkgAudit = validateLibraryDefinition(library);

  // 1. License & Provenance checks
  if (!pkgAudit.validForCatalog) {
    for (const iss of pkgAudit.issues) {
      pushIssue('license', 'error', iss.code, iss.message);
    }
  }

  // 2. Live Variable, Description & Alias Integrity
  const localCollections = await figma.variables.getLocalVariableCollectionsAsync();
  const localVariables = await figma.variables.getLocalVariablesAsync();
  const varById = new Map(localVariables.map((v) => [v.id, v]));

  const semRecord = record.objects['collection.semantic'];
  const semCollection = localCollections.find((c) => c.id === semRecord?.figmaId);
  if (!semCollection) {
    pushIssue(
      'themes',
      'error',
      'Missing Semantic Collection',
      `Semantic collection "${plan.collections.semanticName}" not found in Figma file.`,
    );
  } else {
    const modeNames = semCollection.modes.map((m) => m.name);
    if (!modeNames.includes('Light') || !modeNames.includes('Dark')) {
      pushIssue(
        'themes',
        'error',
        'Incomplete Theme Modes',
        `Semantic collection has modes [${modeNames.join(', ')}]; expected both Light and Dark.`,
      );
    }
  }

  for (const tok of plan.tokens) {
    const tracked = record.objects[tok.logicalId];
    const liveVar = tracked ? varById.get(tracked.figmaId) : undefined;
    if (!liveVar) {
      pushIssue(
        'tokens',
        'error',
        'Missing Token Variable',
        `Expected Variable "${tok.name}" (${tok.logicalId}) is missing.`,
        tok.logicalId,
      );
      continue;
    }
    if (!liveVar.description || liveVar.description.trim().length < 10) {
      pushIssue(
        'tokens',
        'error',
        'Missing Variable Description',
        `Variable "${liveVar.name}" has an empty or incomplete usage description.`,
        tok.logicalId,
        liveVar.id,
      );
    }
    for (const [, modeVal] of Object.entries(liveVar.valuesByMode)) {
      if (
        typeof modeVal === 'object' &&
        modeVal !== null &&
        'type' in modeVal &&
        modeVal.type === 'VARIABLE_ALIAS'
      ) {
        if (!varById.has(modeVal.id)) {
          pushIssue(
            'tokens',
            'error',
            'Dangling Variable Alias',
            `Variable "${liveVar.name}" aliases deleted Variable ID "${modeVal.id}".`,
            tok.logicalId,
            liveVar.id,
          );
        }
      }
    }
  }

  // 3. Duplicate Managed Objects / Idempotency check
  const seenManagedKeys = new Set<string>();
  for (const v of localVariables) {
    const meta = getNodeManagedMeta(v);
    if (meta?.systemInstanceId === record.systemInstanceId) {
      const k = `var:${meta.logicalId}`;
      if (seenManagedKeys.has(k)) {
        pushIssue(
          'idempotency',
          'error',
          'Duplicate Managed Variable',
          `Found duplicate variable with logicalId "${meta.logicalId}".`,
          meta.logicalId,
          v.id,
        );
      }
      seenManagedKeys.add(k);
    }
  }

  // 4. Pages check
  const pageTitleSet = new Set<string>();
  for (const plannedPage of plan.pages) {
    const tracked = record.objects[plannedPage.logicalId];
    const page = figma.root.children.find((p) => p.id === tracked?.figmaId);
    if (!page) {
      pushIssue(
        'pages',
        'error',
        'Missing Managed Page',
        `Page "${plannedPage.title}" (${plannedPage.logicalId}) was not found.`,
        plannedPage.logicalId,
      );
      continue;
    }
    if (pageTitleSet.has(page.name)) {
      pushIssue(
        'pages',
        'warning',
        'Duplicate Page Name',
        `Page name "${page.name}" collides with another managed page.`,
        plannedPage.logicalId,
        page.id,
      );
    }
    pageTitleSet.add(page.name);
  }

  // 5. Components, Auto Layout, Variable Bindings, and Documentation Instances check
  for (const compPlan of plan.orderedComponents) {
    const tracked = record.objects[compPlan.logicalId];
    const compNode = tracked ? await figma.getNodeByIdAsync(tracked.figmaId) : null;
    if (!compNode || (compNode.type !== 'COMPONENT_SET' && compNode.type !== 'COMPONENT')) {
      pushIssue(
        'components',
        'error',
        'Missing Main Component',
        `Component "${compPlan.recipe.name}" (${compPlan.logicalId}) is missing from the document.`,
        compPlan.logicalId,
      );
      continue;
    }

    // Ensure component root does NOT hard-lock Light/Dark mode (Section 11)
    if (semCollection && compNode.explicitVariableModes?.[semCollection.id]) {
      pushIssue(
        'themes',
        'error',
        'Component Root Locks Theme Mode',
        `Component "${compNode.name}" sets an explicit Semantic mode on its root, preventing parent frame theme inheritance.`,
        compPlan.logicalId,
        compNode.id,
      );
    }

    const sampleVariant: ComponentNode | undefined =
      compNode.type === 'COMPONENT_SET'
        ? (compNode.defaultVariant ??
          compNode.children.find((c): c is ComponentNode => c.type === 'COMPONENT'))
        : compNode;

    if (sampleVariant) {
      if (
        compPlan.recipe.baseNode.layoutMode &&
        compPlan.recipe.baseNode.layoutMode !== 'NONE' &&
        sampleVariant.layoutMode === 'NONE'
      ) {
        pushIssue(
          'components',
          'error',
          'Missing Auto Layout on Component',
          `Component "${compPlan.recipe.name}" variant "${sampleVariant.name}" does not have Auto Layout enabled.`,
          compPlan.logicalId,
          sampleVariant.id,
        );
      }

      // Check expected root bindings
      const expectedRootBindings = compPlan.recipe.baseNode.bindings ?? {};
      const boundVars = sampleVariant.boundVariables ?? {};
      if (expectedRootBindings.fill && (!boundVars.fills || boundVars.fills.length === 0)) {
        pushIssue(
          'bindings',
          'error',
          'Missing Root Fill Variable Binding',
          `Component "${compPlan.recipe.name}" expected fill bound to "${expectedRootBindings.fill}".`,
          compPlan.logicalId,
          sampleVariant.id,
        );
      }
    }

    if (compPlan.recipe.tier !== 'helper') {
      if (!compNode.description || compNode.description.trim().length < 15) {
        pushIssue(
          'docs',
          'error',
          'Missing Main Component Description',
          `Component "${compPlan.recipe.name}" lacks metadata description.`,
          compPlan.logicalId,
          compNode.id,
        );
      }

      // Verify Component Docs frame exists and uses real linked InstanceNodes
      const docTracked = record.objects[`docs.component.${compPlan.logicalId}`];
      const docNode = docTracked ? await figma.getNodeByIdAsync(docTracked.figmaId) : null;
      if (!docNode || docNode.type !== 'FRAME') {
        pushIssue(
          'docs',
          'error',
          'Missing Component Documentation Frame',
          `Documentation frame for "${compPlan.recipe.name}" is missing.`,
          compPlan.logicalId,
        );
      } else {
        let instanceCount = 0;
        const countInstances = async (n: SceneNode) => {
          if (n.type === 'INSTANCE') {
            const main = await n.getMainComponentAsync();
            if (main) instanceCount += 1;
          } else if ('children' in n) {
            for (const c of n.children) await countInstances(c);
          }
        };
        await countInstances(docNode);
        if (instanceCount === 0) {
          pushIssue(
            'docs',
            'error',
            'Documentation Missing Live Instances',
            `Documentation for "${compPlan.recipe.name}" contains 0 linked Component Instances.`,
            compPlan.logicalId,
            docNode.id,
          );
        }
      }
    }
  }

  // 6. Playground Light/Dark mode frame check
  if (semCollection) {
    for (const theme of ['light', 'dark'] as const) {
      const pgTracked = record.objects[`playground.column.${theme}`];
      const pgNode = pgTracked ? await figma.getNodeByIdAsync(pgTracked.figmaId) : null;
      if (!pgNode || pgNode.type !== 'FRAME') {
        pushIssue(
          'themes',
          'warning',
          `Missing ${theme} Playground Frame`,
          `Theme Playground column "${theme}" could not be found.`,
        );
      } else if (!pgNode.explicitVariableModes?.[semCollection.id]) {
        pushIssue(
          'themes',
          'error',
          `Unbound ${theme} Playground Mode`,
          `Theme Playground column "${theme}" does not set explicit Semantic Variable Mode.`,
          `playground.column.${theme}`,
          pgNode.id,
        );
      }
    }
  }

  // 7. Contrast audit warnings
  for (const c of plan.contrastAudit) {
    if (!c.passed) {
      pushIssue(
        'contrast',
        'warning',
        `Contrast Below ${c.minRatio}:1 (${c.componentLogicalId})`,
        `${c.label}: Light ${c.lightRatio ?? 'N/A'}:1, Dark ${c.darkRatio ?? 'N/A'}:1.`,
        c.componentLogicalId,
      );
    }
  }

  // 8. Font fallback warnings
  for (const fn of fontNotes) {
    pushIssue(
      'fonts',
      'warning',
      `Font Fallback Applied (${fn.requestedFamily})`,
      `${fn.requestedFamily} ${fn.requestedStyle} → ${fn.resolvedFamily} ${fn.resolvedStyle}. ${fn.reason}`,
    );
  }

  const nonBindableExceptions = plan.orderedComponents.flatMap((c) =>
    c.recipe.nonBindableExceptions.map((ex) => ({
      componentLogicalId: c.logicalId,
      nodeId: ex.nodeId,
      field: ex.field,
      reason: ex.reason[plan.config.locale],
    })),
  );

  return finalizeValidationReport(
    record,
    issues,
    nonBindableExceptions,
    plan.contrastAudit,
  );
}

function finalizeValidationReport(
  record: InstalledSystemRecord,
  issues: ValidationIssue[],
  nonBindableExceptions: ValidationReport['nonBindableExceptions'],
  contrastChecks: ValidationReport['contrastChecks'],
): ValidationReport {
  const categories: ValidationCategory[] = [
    'tokens',
    'bindings',
    'themes',
    'components',
    'docs',
    'pages',
    'idempotency',
    'contrast',
    'fonts',
    'license',
  ];

  const categoryStatus = {} as Record<ValidationCategory, ValidationSeverity>;
  for (const cat of categories) {
    const catIssues = issues.filter((i) => i.category === cat);
    if (catIssues.some((i) => i.severity === 'error')) {
      categoryStatus[cat] = 'error';
    } else if (catIssues.some((i) => i.severity === 'warning')) {
      categoryStatus[cat] = 'warning';
    } else {
      categoryStatus[cat] = 'pass';
    }
  }

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const passCount = categories.filter((c) => categoryStatus[c] === 'pass').length;

  return {
    systemInstanceId: record.systemInstanceId,
    libraryId: record.libraryId,
    namespace: record.namespace,
    timestamp: new Date().toISOString(),
    passed: errorCount === 0,
    summaryCounts: {
      pass: passCount,
      warning: warningCount,
      error: errorCount,
    },
    categoryStatus,
    issues,
    nonBindableExceptions,
    contrastChecks,
  };
}
