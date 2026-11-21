import {
  formatTokenDescription,
  GENERATOR_VERSION,
  SCHEMA_VERSION,
  type InstalledSystemRecord,
  type ManagedObjectRecord,
  type RunJournal,
  type TokenDefinition,
  type TokenModeValue,
} from '@schema';
import {
  hexToRgba,
  sanitizeFigmaVariableName,
  type CompiledExecutionPlan,
} from '@engine';
import type { FontManager } from './fonts';
import { getNodeManagedMeta, setNodeManagedMeta } from './storage';

export interface MaterializedTokensContext {
  collections: {
    primitives: VariableCollection;
    semantic: VariableCollection;
    component: VariableCollection;
  };
  modeIds: {
    primitivesBase: string;
    semanticLight: string;
    semanticDark: string;
    componentBase: string;
  };
  variablesByLogicalId: Map<string, Variable>;
  textStylesByLogicalId: Map<string, TextStyle>;
  effectStylesByLogicalId: Map<string, EffectStyle>;
}

export interface VariableSyncOptions {
  systemInstanceId: string;
  plan: CompiledExecutionPlan;
  existingRecord?: InstalledSystemRecord;
  skipLogicalIds?: ReadonlySet<string>;
  journal: RunJournal;
  fontManager: FontManager;
  onProgress: (completed: number, total: number, label: string) => Promise<void>;
  recordObject: (obj: ManagedObjectRecord) => void;
}

function toFigmaColorValue(hex: string, opacity?: number): RGB | RGBA {
  const rgba = hexToRgba(hex, opacity);
  if (rgba.a < 0.999) {
    return { r: rgba.r, g: rgba.g, b: rgba.b, a: rgba.a };
  }
  return { r: rgba.r, g: rgba.g, b: rgba.b };
}

/**
 * Normalizes Figma VariableScope combinations so mutually-exclusive scopes
 * (e.g., 'ALL_FILLS' alongside 'FRAME_FILL' / 'SHAPE_FILL' / 'TEXT_FILL')
 * never throw in Figma Desktop's `variable.scopes` setter.
 */
export function normalizeFigmaVariableScopes(
  scopes: readonly VariableScope[],
): VariableScope[] {
  const unique = [...new Set(scopes)];
  if (unique.length === 0 || unique.includes('ALL_SCOPES')) {
    return ['ALL_SCOPES'];
  }
  if (unique.includes('ALL_FILLS')) {
    return unique.filter(
      (s) => s !== 'FRAME_FILL' && s !== 'SHAPE_FILL' && s !== 'TEXT_FILL',
    );
  }
  return unique;
}

async function ensureCollection(
  logicalId: string,
  desiredName: string,
  requiredModes: string[],
  existingRecord: InstalledSystemRecord | undefined,
  localCollections: VariableCollection[],
  systemInstanceId: string,
  libraryId: string,
  packageVersion: string,
  journal: RunJournal,
  recordObject: (obj: ManagedObjectRecord) => void,
): Promise<{ collection: VariableCollection; modeIdByName: Record<string, string> }> {
  const trackedId = existingRecord?.objects[logicalId]?.figmaId;
  let collection: VariableCollection | undefined;

  if (trackedId) {
    collection = localCollections.find((c) => c.id === trackedId);
  }
  if (!collection) {
    collection = localCollections.find((c) => {
      const meta = getNodeManagedMeta(c);
      return meta?.systemInstanceId === systemInstanceId && meta?.logicalId === logicalId;
    });
  }
  if (!collection) {
    collection = localCollections.find((c) => c.name === desiredName);
  }

  if (!collection) {
    collection = figma.variables.createVariableCollection(desiredName);
    journal.createdCollectionIds.push(collection.id);
  } else if (collection.name !== desiredName) {
    collection.name = desiredName;
  }

  const modeIdByName: Record<string, string> = {};
  // Rename first default mode if needed
  const firstDesired = requiredModes[0];
  const existingMatchFirst = collection.modes.find((m) => m.name === firstDesired);
  if (existingMatchFirst) {
    modeIdByName[firstDesired] = existingMatchFirst.modeId;
  } else if (collection.modes.length > 0) {
    const firstMode = collection.modes[0];
    collection.renameMode(firstMode.modeId, firstDesired);
    modeIdByName[firstDesired] = firstMode.modeId;
  }

  for (let i = 1; i < requiredModes.length; i++) {
    const modeName = requiredModes[i];
    const found = collection.modes.find((m) => m.name === modeName);
    if (found) {
      modeIdByName[modeName] = found.modeId;
    } else {
      const createdModeId = collection.addMode(modeName);
      modeIdByName[modeName] = createdModeId;
    }
  }

  const hash = `collection:${desiredName}:${requiredModes.join(',')}`;
  setNodeManagedMeta(collection, {
    systemInstanceId,
    libraryId,
    logicalId,
    objectKind: 'variable-collection',
    schemaVersion: SCHEMA_VERSION,
    packageVersion,
    generatorVersion: GENERATOR_VERSION,
    lastGeneratedHash: hash,
  });

  recordObject({
    logicalId,
    figmaId: collection.id,
    objectKind: 'variable-collection',
    displayName: collection.name,
    lastGeneratedHash: hash,
    managedFields: { name: collection.name },
  });

  return { collection, modeIdByName };
}

export async function materializeVariablesAndStyles(
  opts: VariableSyncOptions,
): Promise<MaterializedTokensContext> {
  const {
    systemInstanceId,
    plan,
    existingRecord,
    skipLogicalIds = new Set<string>(),
    journal,
    fontManager,
    onProgress,
    recordObject,
  } = opts;

  const localCollections = await figma.variables.getLocalVariableCollectionsAsync();

  const primSetup = await ensureCollection(
    'collection.primitives',
    plan.collections.primitivesName,
    ['Base'],
    existingRecord,
    localCollections,
    systemInstanceId,
    plan.library.libraryId,
    plan.library.packageVersion,
    journal,
    recordObject,
  );

  const semSetup = await ensureCollection(
    'collection.semantic',
    plan.collections.semanticName,
    ['Light', 'Dark'],
    existingRecord,
    localCollections,
    systemInstanceId,
    plan.library.libraryId,
    plan.library.packageVersion,
    journal,
    recordObject,
  );

  const compSetup = await ensureCollection(
    'collection.component',
    plan.collections.componentName,
    ['Base'],
    existingRecord,
    localCollections,
    systemInstanceId,
    plan.library.libraryId,
    plan.library.packageVersion,
    journal,
    recordObject,
  );

  const localVariables = await figma.variables.getLocalVariablesAsync();
  const varByFigmaId = new Map(localVariables.map((v) => [v.id, v]));
  const variablesByLogicalId = new Map<string, Variable>();

  const collectionByTier: Record<TokenDefinition['collection'], VariableCollection> = {
    primitives: primSetup.collection,
    semantic: semSetup.collection,
    component: compSetup.collection,
  };

  // Order tokens strictly: primitives -> semantic -> component
  const tierOrder: Record<TokenDefinition['collection'], number> = {
    primitives: 0,
    semantic: 1,
    component: 2,
  };
  const sortedTokens = [...plan.tokens].sort(
    (a, b) => tierOrder[a.collection] - tierOrder[b.collection],
  );

  // Pass 1: Ensure all Variable objects exist and set metadata + non-alias direct values
  const pendingAliases: Array<{
    token: TokenDefinition;
    variable: Variable;
    modeId: string;
    targetLogicalId: string;
  }> = [];

  const totalTokens = sortedTokens.length;
  for (let i = 0; i < sortedTokens.length; i++) {
    const tok = sortedTokens[i];
    const safeVarName = sanitizeFigmaVariableName(tok.name);
    const targetCollection = collectionByTier[tok.collection];
    const trackedId = existingRecord?.objects[tok.logicalId]?.figmaId;

    let variable: Variable | undefined = trackedId ? varByFigmaId.get(trackedId) : undefined;
    if (!variable) {
      variable = localVariables.find((v) => {
        if (v.variableCollectionId !== targetCollection.id) return false;
        const meta = getNodeManagedMeta(v);
        return meta?.systemInstanceId === systemInstanceId && meta?.logicalId === tok.logicalId;
      });
    }
    if (!variable) {
      variable = localVariables.find(
        (v) =>
          v.variableCollectionId === targetCollection.id &&
          v.name === safeVarName &&
          v.resolvedType === tok.type,
      );
    }

    const shouldSkipMutation = skipLogicalIds.has(tok.logicalId) && Boolean(variable);

    if (!variable) {
      variable = figma.variables.createVariable(safeVarName, targetCollection, tok.type);
      journal.createdVariableIds.push(variable.id);
    }

    variablesByLogicalId.set(tok.logicalId, variable);

    if (!shouldSkipMutation) {
      if (variable.name !== safeVarName) {
        variable.name = safeVarName;
      }
      variable.description = formatTokenDescription(
        tok.description,
        plan.config.locale,
        tok.deprecated,
      );
      try {
        variable.scopes = normalizeFigmaVariableScopes(tok.scopes);
      } catch {
        try {
          variable.scopes = ['ALL_SCOPES'];
        } catch {
          // Ignore if host build restricts scopes assignment
        }
      }
      if (tok.codeSyntax?.WEB) {
        try {
          variable.setVariableCodeSyntax('WEB', tok.codeSyntax.WEB);
        } catch {
          // Ignore if host build restricts codeSyntax assignment
        }
      }

      const assignModeVal = (modeId: string, val: TokenModeValue | undefined) => {
        if (!val) return;
        if (val.kind === 'alias') {
          pendingAliases.push({
            token: tok,
            variable: variable!,
            modeId,
            targetLogicalId: val.targetLogicalId,
          });
        } else if (val.kind === 'color') {
          variable!.setValueForMode(modeId, toFigmaColorValue(val.hex, val.opacity));
        } else if (
          val.kind === 'float' &&
          (tok.category === 'opacity' || tok.scopes.includes('OPACITY'))
        ) {
          // Figma FLOAT variables scoped/bound to layer opacity use 0..100 percentage scale
          const figmaOpacityPercent =
            val.value <= 1 ? Math.round(val.value * 10000) / 100 : val.value;
          variable!.setValueForMode(modeId, figmaOpacityPercent);
        } else {
          variable!.setValueForMode(modeId, val.value);
        }
      };

      if (tok.collection === 'primitives') {
        assignModeVal(primSetup.modeIdByName.Base, tok.valuesByMode.Base);
      } else if (tok.collection === 'semantic') {
        assignModeVal(semSetup.modeIdByName.Light, tok.valuesByMode.Light);
        assignModeVal(semSetup.modeIdByName.Dark, tok.valuesByMode.Dark);
      } else {
        assignModeVal(compSetup.modeIdByName.Base, tok.valuesByMode.Base);
      }

      const hash = plan.tokenHashes[tok.logicalId];
      setNodeManagedMeta(variable, {
        systemInstanceId,
        libraryId: plan.library.libraryId,
        logicalId: tok.logicalId,
        objectKind: 'variable',
        schemaVersion: SCHEMA_VERSION,
        packageVersion: plan.library.packageVersion,
        generatorVersion: GENERATOR_VERSION,
        lastGeneratedHash: hash,
      });

      recordObject({
        logicalId: tok.logicalId,
        figmaId: variable.id,
        objectKind: 'variable',
        displayName: variable.name,
        lastGeneratedHash: hash,
        managedFields: {
          name: variable.name,
          description: variable.description,
          valuesJson: JSON.stringify(variable.valuesByMode),
        },
      });
    } else if (existingRecord?.objects[tok.logicalId]) {
      // Preserve existing baseline entry so local modifications remain tracked
      recordObject(existingRecord.objects[tok.logicalId]);
    }

    if (i % 16 === 0 || i === totalTokens - 1) {
      await onProgress(i + 1, totalTokens, `Variable: ${tok.name}`);
    }
  }

  // Pass 2: Wire all Variable Aliases now that every target Variable exists
  for (const item of pendingAliases) {
    const targetVar = variablesByLogicalId.get(item.targetLogicalId);
    if (!targetVar) {
      throw new Error(
        `Internal alias resolution error: "${item.token.logicalId}" references missing Variable "${item.targetLogicalId}".`,
      );
    }
    const alias = figma.variables.createVariableAlias(targetVar);
    item.variable.setValueForMode(item.modeId, alias);
  }

  // Refresh valuesJson after alias wiring so baseline captures exact VariableAlias IDs
  for (const tok of sortedTokens) {
    if (skipLogicalIds.has(tok.logicalId)) continue;
    const v = variablesByLogicalId.get(tok.logicalId);
    if (v) {
      recordObject({
        logicalId: tok.logicalId,
        figmaId: v.id,
        objectKind: 'variable',
        displayName: v.name,
        lastGeneratedHash: plan.tokenHashes[tok.logicalId],
        managedFields: {
          name: v.name,
          description: v.description,
          valuesJson: JSON.stringify(v.valuesByMode),
        },
      });
    }
  }

  // Deprecate any previously-managed variables removed in this version without deleting them (Section 12)
  if (existingRecord) {
    const plannedVarSet = new Set(plan.tokens.map((t) => t.logicalId));
    for (const [oldLogicalId, oldObj] of Object.entries(existingRecord.objects)) {
      if (oldObj.objectKind === 'variable' && !plannedVarSet.has(oldLogicalId)) {
        const existingVar = varByFigmaId.get(oldObj.figmaId);
        if (existingVar && !existingVar.description.startsWith('[DEPRECATED]')) {
          existingVar.description = `[DEPRECATED] ${existingVar.description}`;
        }
        recordObject({ ...oldObj, deprecated: true });
      }
    }
  }

  // Materialize Text Styles & Effect Styles
  const localTextStyles = await figma.getLocalTextStylesAsync();
  const localEffectStyles = await figma.getLocalEffectStylesAsync();
  const textStylesByLogicalId = new Map<string, TextStyle>();
  const effectStylesByLogicalId = new Map<string, EffectStyle>();

  for (const ts of plan.textStyles) {
    const desiredName = `${plan.config.namespace}/${ts.name}`;
    const trackedId = existingRecord?.objects[ts.logicalId]?.figmaId;
    let style = localTextStyles.find((s) => s.id === trackedId);
    if (!style) {
      style = localTextStyles.find((s) => {
        const meta = getNodeManagedMeta(s);
        return meta?.systemInstanceId === systemInstanceId && meta?.logicalId === ts.logicalId;
      });
    }
    if (!style) {
      style = localTextStyles.find((s) => s.name === desiredName);
    }
    const skipStyle = skipLogicalIds.has(ts.logicalId) && Boolean(style);

    if (!style) {
      style = figma.createTextStyle();
      journal.createdStyleIds.push(style.id);
    }

    if (!skipStyle) {
      const requestedFamily =
        ts.fontRole === 'mono'
          ? plan.activeFontPreset.monoFamily
          : plan.config.locale === 'th'
            ? plan.activeFontPreset.thaiFallbackFamily
            : plan.activeFontPreset.sansFamily;
      const fontRole =
        ts.fontRole === 'mono' ? 'mono' : plan.config.locale === 'th' ? 'thai' : 'sans';
      const loadedFont = await fontManager.loadFontWithFallback(
        requestedFamily,
        ts.fontStyle,
        fontRole,
      );

      style.name = desiredName;
      style.description = ts.description[plan.config.locale];
      style.fontName = loadedFont;
      style.fontSize = ts.fontSize;
      style.lineHeight = { unit: 'PIXELS', value: ts.lineHeightPx };
      style.letterSpacing = { unit: 'PIXELS', value: ts.letterSpacingPx };

      if (ts.boundVariables?.fontSize) {
        const v = variablesByLogicalId.get(ts.boundVariables.fontSize);
        if (v) {
          try {
            style.setBoundVariable('fontSize', v);
          } catch {
            // Keep pixel fallback if host build restricts TextStyle binding
          }
        }
      }
      if (ts.boundVariables?.lineHeight) {
        const v = variablesByLogicalId.get(ts.boundVariables.lineHeight);
        if (v) {
          try {
            style.setBoundVariable('lineHeight', v);
          } catch {
            // Keep pixel fallback
          }
        }
      }
      if (ts.boundVariables?.fontWeight) {
        const v = variablesByLogicalId.get(ts.boundVariables.fontWeight);
        if (v) {
          try {
            style.setBoundVariable('fontWeight', v);
          } catch {
            // Keep fontStyle fallback
          }
        }
      }

      const hash = plan.textStyleHashes[ts.logicalId];
      setNodeManagedMeta(style, {
        systemInstanceId,
        libraryId: plan.library.libraryId,
        logicalId: ts.logicalId,
        objectKind: 'text-style',
        schemaVersion: SCHEMA_VERSION,
        packageVersion: plan.library.packageVersion,
        generatorVersion: GENERATOR_VERSION,
        lastGeneratedHash: hash,
      });
      recordObject({
        logicalId: ts.logicalId,
        figmaId: style.id,
        objectKind: 'text-style',
        displayName: style.name,
        lastGeneratedHash: hash,
        managedFields: { name: style.name, fontSize: String(ts.fontSize) },
      });
    } else if (existingRecord?.objects[ts.logicalId]) {
      recordObject(existingRecord.objects[ts.logicalId]);
    }

    textStylesByLogicalId.set(ts.logicalId, style);
  }

  for (const es of plan.effectStyles) {
    const desiredName = `${plan.config.namespace}/${es.name}`;
    const trackedId = existingRecord?.objects[es.logicalId]?.figmaId;
    let style = localEffectStyles.find((s) => s.id === trackedId);
    if (!style) {
      style = localEffectStyles.find((s) => {
        const meta = getNodeManagedMeta(s);
        return meta?.systemInstanceId === systemInstanceId && meta?.logicalId === es.logicalId;
      });
    }
    if (!style) {
      style = localEffectStyles.find((s) => s.name === desiredName);
    }
    const skipStyle = skipLogicalIds.has(es.logicalId) && Boolean(style);

    if (!style) {
      style = figma.createEffectStyle();
      journal.createdStyleIds.push(style.id);
    }

    if (!skipStyle) {
      style.name = desiredName;
      style.description = es.description[plan.config.locale];

      const builtEffects: Effect[] = es.shadows.map((sh) => {
        const rgba = hexToRgba(sh.fallbackHex, sh.fallbackOpacity);
        let shadowEffect: Effect = {
          type: 'DROP_SHADOW',
          color: { r: rgba.r, g: rgba.g, b: rgba.b, a: rgba.a },
          offset: { x: sh.offsetX, y: sh.offsetY },
          radius: sh.radius,
          spread: sh.spread,
          visible: true,
          blendMode: 'NORMAL',
        };
        if (sh.colorTokenLogicalId) {
          const colorVar = variablesByLogicalId.get(sh.colorTokenLogicalId);
          if (colorVar) {
            try {
              shadowEffect = figma.variables.setBoundVariableForEffect(
                shadowEffect,
                'color',
                colorVar,
              );
            } catch {
              // Retain RGBA fallback
            }
          }
        }
        return shadowEffect;
      });

      style.effects = builtEffects;

      const hash = plan.effectStyleHashes[es.logicalId];
      setNodeManagedMeta(style, {
        systemInstanceId,
        libraryId: plan.library.libraryId,
        logicalId: es.logicalId,
        objectKind: 'effect-style',
        schemaVersion: SCHEMA_VERSION,
        packageVersion: plan.library.packageVersion,
        generatorVersion: GENERATOR_VERSION,
        lastGeneratedHash: hash,
      });
      recordObject({
        logicalId: es.logicalId,
        figmaId: style.id,
        objectKind: 'effect-style',
        displayName: style.name,
        lastGeneratedHash: hash,
        managedFields: { name: style.name },
      });
    } else if (existingRecord?.objects[es.logicalId]) {
      recordObject(existingRecord.objects[es.logicalId]);
    }

    effectStylesByLogicalId.set(es.logicalId, style);
  }

  return {
    collections: {
      primitives: primSetup.collection,
      semantic: semSetup.collection,
      component: compSetup.collection,
    },
    modeIds: {
      primitivesBase: primSetup.modeIdByName.Base,
      semanticLight: semSetup.modeIdByName.Light,
      semanticDark: semSetup.modeIdByName.Dark,
      componentBase: compSetup.modeIdByName.Base,
    },
    variablesByLogicalId,
    textStylesByLogicalId,
    effectStylesByLogicalId,
  };
}
