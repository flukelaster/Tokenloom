import {
  GENERATOR_VERSION,
  SCHEMA_VERSION,
  type ComponentPropertySpec,
  type InstalledSystemRecord,
  type ManagedObjectRecord,
  type NodeBindings,
  type RecipeNodeSpec,
  type RunJournal,
} from '@schema';
import { hexToRgba, type CompiledComponentPlan, type CompiledExecutionPlan } from '@engine';
import type { FontManager } from './fonts';
import { arrangePropstarComponentMatrix } from './propstar-matrix';
import { getNodeManagedMeta, setNodeManagedMeta } from './storage';
import type { MaterializedTokensContext } from './variables-engine';

export interface MaterializedComponentEntry {
  logicalId: string;
  node: ComponentSetNode | ComponentNode;
  defaultVariant: ComponentNode;
  variantsByKey: Map<string, ComponentNode>;
  propertyKeyByLogicalKey: Map<string, string>;
}

export interface ComponentRenderContext {
  systemInstanceId: string;
  plan: CompiledExecutionPlan;
  tokensCtx: MaterializedTokensContext;
  fontManager: FontManager;
  pagesByLogicalId: Map<string, PageNode>;
  componentsByLogicalId: Map<string, MaterializedComponentEntry>;
  existingRecord?: InstalledSystemRecord;
  skipLogicalIds?: ReadonlySet<string>;
  journal: RunJournal;
  recordObject: (obj: ManagedObjectRecord) => void;
}

export function createSolidBoundPaint(
  variable: Variable | undefined,
  fallbackHex = '#2563EB',
): SolidPaint {
  const rgba = hexToRgba(fallbackHex);
  const basePaint: SolidPaint = {
    type: 'SOLID',
    color: { r: rgba.r, g: rgba.g, b: rgba.b },
    opacity: rgba.a,
  };
  if (!variable) return basePaint;
  return figma.variables.setBoundVariableForPaint(basePaint, 'color', variable);
}

export function applyNodeVariableBindings(
  node: SceneNode,
  bindings: NodeBindings | undefined,
  tokensCtx: MaterializedTokensContext,
): void {
  if (!bindings) return;
  const getVar = (id?: string) => (id ? tokensCtx.variablesByLogicalId.get(id) : undefined);

  if (bindings.fill && 'fills' in node) {
    const v = getVar(bindings.fill);
    if (v) {
      node.fills = [createSolidBoundPaint(v, '#FFFFFF')];
    }
  }

  if (bindings.textFill && node.type === 'TEXT') {
    const v = getVar(bindings.textFill);
    if (v) {
      node.fills = [createSolidBoundPaint(v, '#09090B')];
    }
  }

  if (bindings.stroke && 'strokes' in node) {
    const v = getVar(bindings.stroke);
    if (v) {
      node.strokes = [createSolidBoundPaint(v, '#E4E4E7')];
    }
  }

  const bindScalar = (field: VariableBindableNodeField, tokenId?: string) => {
    const v = getVar(tokenId);
    if (!v) return;
    try {
      node.setBoundVariable(field, v);
    } catch {
      // Non-applicable node type ignores unsupported scalar field safely
    }
  };

  if (bindings.cornerRadius) {
    bindScalar('topLeftRadius', bindings.cornerRadius);
    bindScalar('topRightRadius', bindings.cornerRadius);
    bindScalar('bottomRightRadius', bindings.cornerRadius);
    bindScalar('bottomLeftRadius', bindings.cornerRadius);
  }
  bindScalar('topLeftRadius', bindings.topLeftRadius);
  bindScalar('topRightRadius', bindings.topRightRadius);
  bindScalar('bottomRightRadius', bindings.bottomRightRadius);
  bindScalar('bottomLeftRadius', bindings.bottomLeftRadius);

  if (bindings.paddingX) {
    bindScalar('paddingLeft', bindings.paddingX);
    bindScalar('paddingRight', bindings.paddingX);
  }
  if (bindings.paddingY) {
    bindScalar('paddingTop', bindings.paddingY);
    bindScalar('paddingBottom', bindings.paddingY);
  }
  bindScalar('paddingTop', bindings.paddingTop);
  bindScalar('paddingRight', bindings.paddingRight);
  bindScalar('paddingBottom', bindings.paddingBottom);
  bindScalar('paddingLeft', bindings.paddingLeft);

  bindScalar('itemSpacing', bindings.gap);
  bindScalar('counterAxisSpacing', bindings.counterGap);
  bindScalar('width', bindings.width);
  bindScalar('height', bindings.height);
  bindScalar('minWidth', bindings.minWidth);
  bindScalar('maxWidth', bindings.maxWidth);
  bindScalar('minHeight', bindings.minHeight);
  bindScalar('maxHeight', bindings.maxHeight);
  bindScalar('strokeWeight', bindings.strokeWeight);
  bindScalar('opacity', bindings.opacity);

  if (node.type === 'TEXT') {
    if (bindings.fontSize) {
      const v = getVar(bindings.fontSize);
      if (v) {
        try {
          node.setBoundVariable('fontSize', v);
        } catch {
          // Keep static fontSize fallback
        }
      }
    }
    if (bindings.lineHeight) {
      const v = getVar(bindings.lineHeight);
      if (v) {
        try {
          node.setBoundVariable('lineHeight', v);
        } catch {
          // Keep static lineHeight fallback
        }
      }
    }
  }
}

function applyFrameContainerLayout(
  frame: FrameNode | ComponentNode,
  spec: RecipeNodeSpec,
): void {
  if (spec.transparentFill) {
    frame.fills = [];
  }
  frame.clipsContent = spec.clipsContent ?? false;

  const width = spec.width ?? 100;
  const height = spec.height ?? 36;
  frame.resize(width, height);

  if (spec.layoutMode && spec.layoutMode !== 'NONE') {
    frame.layoutMode = spec.layoutMode;
    frame.primaryAxisSizingMode = spec.primaryAxisSizingMode ?? 'AUTO';
    frame.counterAxisSizingMode = spec.counterAxisSizingMode ?? 'AUTO';
    if (spec.primaryAxisAlignItems) {
      frame.primaryAxisAlignItems = spec.primaryAxisAlignItems;
    }
    if (spec.counterAxisAlignItems) {
      frame.counterAxisAlignItems = spec.counterAxisAlignItems;
    }
    frame.paddingTop = spec.paddingTop ?? 0;
    frame.paddingRight = spec.paddingRight ?? 0;
    frame.paddingBottom = spec.paddingBottom ?? 0;
    frame.paddingLeft = spec.paddingLeft ?? 0;
    frame.itemSpacing = spec.itemSpacing ?? 0;
    try {
      if (spec.minWidth !== undefined) frame.minWidth = spec.minWidth;
      if (spec.maxWidth !== undefined) frame.maxWidth = spec.maxWidth;
      if (spec.minHeight !== undefined) frame.minHeight = spec.minHeight;
      if (spec.maxHeight !== undefined) frame.maxHeight = spec.maxHeight;
    } catch {
      // Ignore min/max constraint if unsupported on non-auto-layout context
    }
  } else {
    frame.layoutMode = 'NONE';
  }

  if (spec.cornerRadius !== undefined) {
    frame.cornerRadius = spec.cornerRadius;
  }
  if (spec.strokeWeight !== undefined) {
    frame.strokeWeight = spec.strokeWeight;
    if (spec.strokeWeight === 0) {
      frame.strokes = [];
    }
  }
  if (spec.strokeAlign) {
    frame.strokeAlign = spec.strokeAlign;
  }
  if (spec.opacity !== undefined) {
    frame.opacity = spec.opacity;
  }
}

export function resolveVariantComponent(
  entry: MaterializedComponentEntry,
  criteria?: Record<string, string>,
): ComponentNode {
  if (!criteria || Object.keys(criteria).length === 0 || entry.node.type === 'COMPONENT') {
    return entry.defaultVariant;
  }
  for (const [key, compNode] of entry.variantsByKey.entries()) {
    const matchesAll = Object.entries(criteria).every(([axis, val]) =>
      key.split(',').some((part) => part.trim() === `${axis}=${val}`),
    );
    if (matchesAll) return compNode;
  }
  return entry.defaultVariant;
}

export async function renderRecipeChildNode(
  spec: RecipeNodeSpec,
  ctx: ComponentRenderContext,
  propKeyMap?: ReadonlyMap<string, string>,
): Promise<SceneNode> {
  const locale = ctx.plan.config.locale;
  let created: SceneNode;

  if (spec.kind === 'frame') {
    const frame = figma.createFrame();
    frame.name = spec.name;
    applyFrameContainerLayout(frame, spec);
    if (spec.effectStyleLogicalId) {
      const es = ctx.tokensCtx.effectStylesByLogicalId.get(spec.effectStyleLogicalId);
      if (es) await frame.setEffectStyleIdAsync(es.id);
    }
    applyNodeVariableBindings(frame, spec.bindings, ctx.tokensCtx);
    for (const childSpec of spec.children ?? []) {
      const childNode = await renderRecipeChildNode(childSpec, ctx, propKeyMap);
      frame.appendChild(childNode);
      applyChildAutoLayoutSizing(childNode, childSpec);
    }
    created = frame;
  } else if (spec.kind === 'rectangle') {
    const rect = figma.createRectangle();
    rect.name = spec.name;
    rect.resize(spec.width ?? 16, spec.height ?? 16);
    if (spec.cornerRadius !== undefined) rect.cornerRadius = spec.cornerRadius;
    applyNodeVariableBindings(rect, spec.bindings, ctx.tokensCtx);
    created = rect;
  } else if (spec.kind === 'ellipse') {
    const ellipse = figma.createEllipse();
    ellipse.name = spec.name;
    ellipse.resize(spec.width ?? 12, spec.height ?? 12);
    if (spec.effectStyleLogicalId) {
      const es = ctx.tokensCtx.effectStylesByLogicalId.get(spec.effectStyleLogicalId);
      if (es) await ellipse.setEffectStyleIdAsync(es.id);
    }
    applyNodeVariableBindings(ellipse, spec.bindings, ctx.tokensCtx);
    created = ellipse;
  } else if (spec.kind === 'icon-vector') {
    const svgFrame = figma.createNodeFromSvg(
      spec.svgContent ??
        '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="8" r="5" stroke="#18181B" stroke-width="1.5"/></svg>',
    );
    svgFrame.name = spec.name;
    svgFrame.resize(spec.width ?? 16, spec.height ?? 16);
    svgFrame.fills = [];
    if (spec.bindings?.stroke) {
      const strokeVar = ctx.tokensCtx.variablesByLogicalId.get(spec.bindings.stroke);
      if (strokeVar) {
        const boundStroke = createSolidBoundPaint(strokeVar, '#18181B');
        const applyStrokeRecursively = (n: SceneNode) => {
          if ('strokes' in n && Array.isArray(n.strokes) && n.strokes.length > 0) {
            n.strokes = [boundStroke];
          }
          if ('children' in n) {
            for (const c of n.children) applyStrokeRecursively(c);
          }
        };
        applyStrokeRecursively(svgFrame);
      }
    }
    created = svgFrame;
  } else if (spec.kind === 'component-instance') {
    const targetEntry = spec.componentLogicalId
      ? ctx.componentsByLogicalId.get(spec.componentLogicalId)
      : undefined;
    if (!targetEntry) {
      throw new Error(
        `Nested component "${spec.componentLogicalId ?? ''}" not yet materialized before "${spec.name}".`,
      );
    }
    const targetVariant = resolveVariantComponent(targetEntry, spec.variantCriteria);
    const instance = targetVariant.createInstance();
    instance.name = spec.name;
    if (spec.instancePropertyOverrides) {
      const rawProps: Record<string, string | boolean> = {};
      for (const [logicalPropKey, overrideVal] of Object.entries(spec.instancePropertyOverrides)) {
        const figmaPropKey = targetEntry.propertyKeyByLogicalKey.get(logicalPropKey);
        if (figmaPropKey) {
          rawProps[figmaPropKey] = overrideVal;
        }
      }
      if (Object.keys(rawProps).length > 0) {
        try {
          instance.setProperties(rawProps);
        } catch {
          // Ignore mismatched override safely
        }
      }
    }
    created = instance;
  } else {
    // TEXT node
    const textNode = figma.createText();
    textNode.name = spec.name;
    const requestedFamily =
      locale === 'th'
        ? ctx.plan.activeFontPreset.thaiFallbackFamily
        : ctx.plan.activeFontPreset.sansFamily;
    const fontRole = locale === 'th' ? 'thai' : 'sans';
    const fontName = await ctx.fontManager.loadFontWithFallback(
      requestedFamily,
      spec.fontWeight ?? 'Regular',
      fontRole,
    );
    textNode.fontName = fontName;

    if (spec.textStyleLogicalId) {
      const ts = ctx.tokensCtx.textStylesByLogicalId.get(spec.textStyleLogicalId);
      if (ts) {
        try {
          await figma.loadFontAsync(ts.fontName);
        } catch {
          // Font fallback already loaded
        }
        await textNode.setTextStyleIdAsync(ts.id);
      }
    } else {
      if (spec.fontSize) textNode.fontSize = spec.fontSize;
      if (spec.lineHeightPx) {
        textNode.lineHeight = { unit: 'PIXELS', value: spec.lineHeightPx };
      }
    }

    const resolvedChars =
      typeof spec.characters === 'string'
        ? spec.characters
        : spec.characters
          ? spec.characters[locale]
          : '';
    textNode.characters = resolvedChars;

    if (spec.textAlignHorizontal) {
      textNode.textAlignHorizontal = spec.textAlignHorizontal;
    }

    applyNodeVariableBindings(textNode, spec.bindings, ctx.tokensCtx);
    created = textNode;
  }

  if (spec.visible !== undefined) {
    created.visible = spec.visible;
  }

  created.setPluginData('ds_forge:role_id', spec.id);

  if (spec.propertyRef && propKeyMap) {
    const refs: { [k in 'visible' | 'characters' | 'mainComponent']?: string } = {};
    if (spec.propertyRef.visible) {
      const k = propKeyMap.get(spec.propertyRef.visible);
      if (k) refs.visible = k;
    }
    if (spec.propertyRef.characters && created.type === 'TEXT') {
      const k = propKeyMap.get(spec.propertyRef.characters);
      if (k) refs.characters = k;
    }
    if (spec.propertyRef.mainComponent && created.type === 'INSTANCE') {
      const k = propKeyMap.get(spec.propertyRef.mainComponent);
      if (k) refs.mainComponent = k;
    }
    if (Object.keys(refs).length > 0) {
      try {
        created.componentPropertyReferences = refs;
      } catch {
        // Re-bound after variant combination if host defers property reference wiring
      }
    }
  }

  return created;
}

function applyChildAutoLayoutSizing(node: SceneNode, spec: RecipeNodeSpec): void {
  try {
    if ('layoutAlign' in node && spec.layoutAlign) {
      node.layoutAlign = spec.layoutAlign;
      if (spec.layoutAlign === 'STRETCH') {
        node.setPluginData('ds_forge:stretch', '1');
        if (node.type === 'TEXT') {
          node.textAutoResize = 'HEIGHT';
        }
      }
    }
    if ('layoutGrow' in node && spec.layoutGrow !== undefined) {
      node.layoutGrow = spec.layoutGrow;
      if (spec.layoutGrow > 0) {
        node.setPluginData('ds_forge:grow', String(spec.layoutGrow));
        if (node.type === 'TEXT') {
          node.textAutoResize = 'HEIGHT';
        }
      }
    }
  } catch {
    // Ignore child sizing constraint if parent is not Auto Layout
  }
}

export function finalizeComponentAutoLayout(root: SceneNode): void {
  const walk = (node: SceneNode) => {
    try {
      const stretchFlag = node.getPluginData('ds_forge:stretch') === '1';
      const growVal = Number(node.getPluginData('ds_forge:grow') || '0');
      if (stretchFlag && 'layoutAlign' in node) {
        node.layoutAlign = 'STRETCH';
        if (node.type === 'TEXT') {
          node.textAutoResize = 'HEIGHT';
        }
      }
      if (growVal > 0 && 'layoutGrow' in node) {
        node.layoutGrow = growVal;
        if (node.type === 'TEXT') {
          node.textAutoResize = 'HEIGHT';
        }
      }
    } catch {
      // Safe fallback across Figma host versions
    }
    if ('children' in node && node.type !== 'INSTANCE') {
      for (const child of node.children) {
        walk(child);
      }
    }
  };
  if ('children' in root && root.type !== 'INSTANCE') {
    for (const child of root.children) {
      walk(child);
    }
  }
}

async function populateVariantComponentNode(
  compNode: ComponentNode,
  variantName: string,
  rootSpec: RecipeNodeSpec,
  ctx: ComponentRenderContext,
  propKeyMap?: ReadonlyMap<string, string>,
): Promise<void> {
  // Clear old internal children when updating in place while preserving ComponentNode itself!
  while (compNode.children.length > 0) {
    compNode.children[0].remove();
  }

  compNode.name = variantName;
  // Never lock Light/Dark mode on component roots (Section 11)
  try {
    compNode.clearExplicitVariableModeForCollection(ctx.tokensCtx.collections.semantic);
  } catch {
    // No explicit mode set
  }

  applyFrameContainerLayout(compNode, rootSpec);
  if (rootSpec.effectStyleLogicalId) {
    const es = ctx.tokensCtx.effectStylesByLogicalId.get(rootSpec.effectStyleLogicalId);
    if (es) {
      await compNode.setEffectStyleIdAsync(es.id);
    }
  } else {
    compNode.effects = [];
  }

  applyNodeVariableBindings(compNode, rootSpec.bindings, ctx.tokensCtx);

  for (const childSpec of rootSpec.children ?? []) {
    const child = await renderRecipeChildNode(childSpec, ctx, propKeyMap);
    compNode.appendChild(child);
    applyChildAutoLayoutSizing(child, childSpec);
  }
  finalizeComponentAutoLayout(compNode);
}

function syncComponentPropertyDefinitions(
  owner: ComponentSetNode | ComponentNode,
  specs: ComponentPropertySpec[],
  ctx: ComponentRenderContext,
): Map<string, string> {
  const keyMap = new Map<string, string>();
  const existingDefs = owner.componentPropertyDefinitions ?? {};

  for (const propSpec of specs) {
    const existingEntry = Object.entries(existingDefs).find(
      ([rawKey, def]) =>
        def.type === propSpec.type &&
        (rawKey === propSpec.name || rawKey.startsWith(`${propSpec.name}#`)),
    );

    let defaultVal: string | boolean = propSpec.defaultValue;
    if (propSpec.type === 'TEXT' && propSpec.localizedDefaultText) {
      defaultVal = propSpec.localizedDefaultText[ctx.plan.config.locale];
    } else if (propSpec.type === 'INSTANCE_SWAP' && typeof propSpec.defaultValue === 'string') {
      const targetComp = ctx.componentsByLogicalId.get(propSpec.defaultValue);
      if (!targetComp) {
        continue;
      }
      defaultVal = targetComp.defaultVariant.id;
    }

    if (existingEntry) {
      const [existingKey] = existingEntry;
      try {
        const updatedKey = owner.editComponentProperty(existingKey, {
          name: propSpec.name,
          defaultValue: defaultVal,
        });
        keyMap.set(propSpec.logicalKey, updatedKey);
      } catch {
        keyMap.set(propSpec.logicalKey, existingKey);
      }
    } else {
      try {
        const createdKey = owner.addComponentProperty(propSpec.name, propSpec.type, defaultVal);
        keyMap.set(propSpec.logicalKey, createdKey);
      } catch {
        // Skip unsupported property gracefully without aborting component materialization
      }
    }
  }

  return keyMap;
}

function bindPropertyReferencesAcrossTree(
  variantRoot: ComponentNode,
  rootSpec: RecipeNodeSpec,
  propKeyMap: ReadonlyMap<string, string>,
): void {
  if (propKeyMap.size === 0) return;

  const specByRole = new Map<string, RecipeNodeSpec>();
  const indexSpecs = (s: RecipeNodeSpec) => {
    specByRole.set(s.id, s);
    for (const c of s.children ?? []) indexSpecs(c);
  };
  indexSpecs(rootSpec);

  const walk = (node: SceneNode) => {
    const roleId = node.getPluginData('ds_forge:role_id');
    const spec = roleId ? specByRole.get(roleId) : undefined;
    if (spec?.propertyRef) {
      const refs: { [k in 'visible' | 'characters' | 'mainComponent']?: string } = {};
      if (spec.propertyRef.visible) {
        const k = propKeyMap.get(spec.propertyRef.visible);
        if (k) refs.visible = k;
      }
      if (spec.propertyRef.characters && node.type === 'TEXT') {
        const k = propKeyMap.get(spec.propertyRef.characters);
        if (k) refs.characters = k;
      }
      if (spec.propertyRef.mainComponent && node.type === 'INSTANCE') {
        const k = propKeyMap.get(spec.propertyRef.mainComponent);
        if (k) refs.mainComponent = k;
      }
      if (Object.keys(refs).length > 0) {
        try {
          node.componentPropertyReferences = refs;
        } catch {
          // Ignore mismatched property reference safely
        }
      }
    }
    if ('children' in node) {
      for (const child of node.children) {
        // Do not recurse inside nested component instances!
        if (node.type !== 'INSTANCE') {
          walk(child);
        }
      }
    }
  };

  for (const child of variantRoot.children) {
    walk(child);
  }
}

async function findExistingComponentOwner(
  compPlan: CompiledComponentPlan,
  targetPage: PageNode,
  ctx: ComponentRenderContext,
): Promise<ComponentSetNode | ComponentNode | null> {
  const trackedId = ctx.existingRecord?.objects[compPlan.logicalId]?.figmaId;
  if (trackedId) {
    const byId = await figma.getNodeByIdAsync(trackedId);
    if (byId && (byId.type === 'COMPONENT_SET' || byId.type === 'COMPONENT')) {
      return byId;
    }
  }

  // Fallback metadata discovery across targetPage even if renamed by user (Section 12)
  const searchChildren = (parent: BaseNode & ChildrenMixin): ComponentSetNode | ComponentNode | null => {
    for (const child of parent.children) {
      if (child.type === 'COMPONENT_SET' || child.type === 'COMPONENT') {
        const meta = getNodeManagedMeta(child);
        if (
          meta?.systemInstanceId === ctx.systemInstanceId &&
          meta?.logicalId === compPlan.logicalId
        ) {
          return child;
        }
      }
      if ('children' in child && child.type === 'FRAME') {
        const nested = searchChildren(child);
        if (nested) return nested;
      }
    }
    return null;
  };

  return searchChildren(targetPage);
}

function ensureHelperRackFrame(foundationsPage: PageNode, ctx: ComponentRenderContext): FrameNode {
  const logicalId = 'frame.foundations.helper-icons';
  let rack: FrameNode | undefined;
  for (const child of foundationsPage.children) {
    if (child.type === 'FRAME') {
      const meta = getNodeManagedMeta(child);
      if (meta?.systemInstanceId === ctx.systemInstanceId && meta?.logicalId === logicalId) {
        rack = child;
        break;
      }
    }
  }
  if (!rack) {
    rack = figma.createFrame();
    rack.x = 80;
    rack.y = 80;
    foundationsPage.appendChild(rack);
    ctx.journal.createdNodeIds.push(rack.id);
  }
  rack.name = '_Primitives · Helper Icons';
  rack.clipsContent = false;
  rack.layoutMode = 'HORIZONTAL';
  rack.layoutWrap = 'WRAP';
  rack.primaryAxisSizingMode = 'AUTO';
  rack.counterAxisSizingMode = 'AUTO';
  rack.itemSpacing = 16;
  rack.counterAxisSpacing = 16;
  rack.paddingLeft = 20;
  rack.paddingRight = 20;
  rack.paddingTop = 16;
  rack.paddingBottom = 16;
  rack.cornerRadius = 8;
  applyNodeVariableBindings(
    rack,
    { fill: 'semantic.surface.card', stroke: 'semantic.border.default' },
    ctx.tokensCtx,
  );
  rack.strokeWeight = 1;
  setNodeManagedMeta(rack, {
    systemInstanceId: ctx.systemInstanceId,
    libraryId: ctx.plan.library.libraryId,
    logicalId,
    objectKind: 'docs-section',
    schemaVersion: SCHEMA_VERSION,
    packageVersion: ctx.plan.library.packageVersion,
    generatorVersion: GENERATOR_VERSION,
    lastGeneratedHash: 'helper-rack',
  });
  ctx.recordObject({
    logicalId,
    figmaId: rack.id,
    objectKind: 'docs-section',
    displayName: rack.name,
    lastGeneratedHash: 'helper-rack',
    managedFields: { name: rack.name },
  });
  return rack;
}

function ensureComponentShowcaseContainer(
  page: PageNode,
  compPlan: CompiledComponentPlan,
  ctx: ComponentRenderContext,
): FrameNode {
  const logicalId = `frame.showcase.${compPlan.logicalId}`;
  let stage: FrameNode | undefined;
  for (const child of page.children) {
    if (child.type === 'FRAME') {
      const meta = getNodeManagedMeta(child);
      if (meta?.systemInstanceId === ctx.systemInstanceId && meta?.logicalId === logicalId) {
        stage = child;
        break;
      }
    }
  }
  if (!stage) {
    stage = figma.createFrame();
    stage.x = 80;
    stage.y = 80;
    page.appendChild(stage);
    ctx.journal.createdNodeIds.push(stage.id);
  }
  stage.name = `${compPlan.recipe.name} · Main Component`;
  stage.clipsContent = false;
  stage.cornerRadius = 12;
  stage.strokeWeight = 1;
  applyNodeVariableBindings(
    stage,
    { fill: 'semantic.surface.background', stroke: 'semantic.border.default' },
    ctx.tokensCtx,
  );
  const showcaseHash = `showcase:${compPlan.logicalId}`;
  setNodeManagedMeta(stage, {
    systemInstanceId: ctx.systemInstanceId,
    libraryId: ctx.plan.library.libraryId,
    logicalId,
    objectKind: 'docs-section',
    schemaVersion: SCHEMA_VERSION,
    packageVersion: ctx.plan.library.packageVersion,
    generatorVersion: GENERATOR_VERSION,
    lastGeneratedHash: showcaseHash,
  });
  ctx.recordObject({
    logicalId,
    figmaId: stage.id,
    objectKind: 'docs-section',
    displayName: stage.name,
    lastGeneratedHash: showcaseHash,
    managedFields: { name: stage.name },
  });
  return stage;
}

export async function materializeSingleComponentPlan(
  compPlan: CompiledComponentPlan,
  ctx: ComponentRenderContext,
): Promise<MaterializedComponentEntry> {
  const isHelper = compPlan.recipe.tier === 'helper';
  const targetPage = isHelper
    ? ctx.pagesByLogicalId.get('page.foundations')!
    : ctx.pagesByLogicalId.get(`page.component.${compPlan.logicalId}`)!;

  await targetPage.loadAsync();
  if (figma.currentPage.id !== targetPage.id) {
    await figma.setCurrentPageAsync(targetPage);
  }

  const parentContainer = isHelper
    ? ensureHelperRackFrame(targetPage, ctx)
    : ensureComponentShowcaseContainer(targetPage, compPlan, ctx);

  const existingOwner = await findExistingComponentOwner(compPlan, targetPage, ctx);
  const skipMutation =
    Boolean(existingOwner) && Boolean(ctx.skipLogicalIds?.has(compPlan.logicalId));

  // If user chose 'keep' or 'skip' on a locally-modified component, index its existing variants without overwriting!
  if (skipMutation && existingOwner) {
    const variantsByKey = new Map<string, ComponentNode>();
    let defaultVariant: ComponentNode;
    if (existingOwner.type === 'COMPONENT_SET') {
      const compChildren = existingOwner.children.filter(
        (c): c is ComponentNode => c.type === 'COMPONENT',
      );
      for (const c of compChildren) {
        variantsByKey.set(c.name, c);
      }
      defaultVariant = existingOwner.defaultVariant ?? compChildren[0];
    } else {
      defaultVariant = existingOwner;
      variantsByKey.set(existingOwner.name, existingOwner);
    }

    const propKeyMap = new Map<string, string>();
    const defs = existingOwner.componentPropertyDefinitions ?? {};
    for (const spec of compPlan.recipe.properties) {
      const found = Object.keys(defs).find(
        (k) => k === spec.name || k.startsWith(`${spec.name}#`),
      );
      if (found) propKeyMap.set(spec.logicalKey, found);
    }

    if (ctx.existingRecord?.objects[compPlan.logicalId]) {
      ctx.recordObject(ctx.existingRecord.objects[compPlan.logicalId]);
    }

    const entry: MaterializedComponentEntry = {
      logicalId: compPlan.logicalId,
      node: existingOwner,
      defaultVariant,
      variantsByKey,
      propertyKeyByLogicalKey: propKeyMap,
    };
    ctx.componentsByLogicalId.set(compPlan.logicalId, entry);
    return entry;
  }

  const isVariantSet = compPlan.recipe.variantAxes.length > 0;

  if (!isVariantSet) {
    // Standalone ComponentNode (e.g. Helper Icon)
    let compNode: ComponentNode;
    if (existingOwner && existingOwner.type === 'COMPONENT') {
      compNode = existingOwner;
    } else {
      compNode = figma.createComponent();
      parentContainer.appendChild(compNode);
      ctx.journal.createdNodeIds.push(compNode.id);
    }

    const singleVariant = compPlan.variants[0];
    await populateVariantComponentNode(compNode, compPlan.recipe.name, singleVariant.rootNode, ctx);
    const propKeyMap = syncComponentPropertyDefinitions(
      compNode,
      compPlan.recipe.properties,
      ctx,
    );
    bindPropertyReferencesAcrossTree(compNode, singleVariant.rootNode, propKeyMap);

    compNode.description = compPlan.formattedDescription;
    if (compPlan.recipe.documentation?.sourceLinks.length) {
      try {
        compNode.documentationLinks = compPlan.recipe.documentation.sourceLinks.map((l) => ({
          uri: l.url,
        }));
      } catch {
        // Ignore if host build restricts documentationLinks format
      }
    }

    setNodeManagedMeta(compNode, {
      systemInstanceId: ctx.systemInstanceId,
      libraryId: ctx.plan.library.libraryId,
      logicalId: compPlan.logicalId,
      objectKind: 'component',
      schemaVersion: SCHEMA_VERSION,
      packageVersion: ctx.plan.library.packageVersion,
      generatorVersion: GENERATOR_VERSION,
      lastGeneratedHash: compPlan.hash,
    });
    ctx.recordObject({
      logicalId: compPlan.logicalId,
      figmaId: compNode.id,
      objectKind: 'component',
      displayName: compNode.name,
      lastGeneratedHash: compPlan.hash,
      managedFields: { name: compNode.name, description: compNode.description },
    });

    const variantsByKey = new Map<string, ComponentNode>([[compNode.name, compNode]]);
    if (!isHelper) {
      await arrangePropstarComponentMatrix({
        compPlan,
        stage: parentContainer,
        ownerNode: compNode,
        variantsByKey,
        propKeyMap,
        fontManager: ctx.fontManager,
        locale: ctx.plan.config.locale,
        createdNodeIds: ctx.journal.createdNodeIds,
      });
    }

    const entry: MaterializedComponentEntry = {
      logicalId: compPlan.logicalId,
      node: compNode,
      defaultVariant: compNode,
      variantsByKey,
      propertyKeyByLogicalKey: propKeyMap,
    };
    ctx.componentsByLogicalId.set(compPlan.logicalId, entry);
    return entry;
  }

  // Multi-variant ComponentSetNode
  let componentSet: ComponentSetNode;
  const variantsByKey = new Map<string, ComponentNode>();

  if (existingOwner && existingOwner.type === 'COMPONENT_SET') {
    componentSet = existingOwner;
    const existingVariantsByName = new Map<string, ComponentNode>();
    for (const child of componentSet.children) {
      if (child.type === 'COMPONENT') {
        const vLogical = child.getPluginData('ds_forge:variant_key') || child.name;
        existingVariantsByName.set(vLogical, child);
      }
    }

    const activeKeys = new Set<string>();
    for (const vSpec of compPlan.variants) {
      activeKeys.add(vSpec.variantKey);
      let vNode = existingVariantsByName.get(vSpec.variantKey);
      if (!vNode) {
        vNode = figma.createComponent();
        componentSet.appendChild(vNode);
        ctx.journal.createdNodeIds.push(vNode.id);
      }
      vNode.setPluginData('ds_forge:variant_key', vSpec.variantKey);
      await populateVariantComponentNode(vNode, vSpec.variantKey, vSpec.rootNode, ctx);
      variantsByKey.set(vSpec.variantKey, vNode);
    }

    // Mark removed variants deprecated without deleting them (Section 12)
    for (const [oldKey, oldNode] of existingVariantsByName.entries()) {
      if (!activeKeys.has(oldKey) && !oldNode.description.startsWith('[DEPRECATED]')) {
        oldNode.description = `[DEPRECATED] ${oldNode.description}`;
      }
    }
  } else {
    const createdVariants: ComponentNode[] = [];
    for (const vSpec of compPlan.variants) {
      const vNode = figma.createComponent();
      vNode.setPluginData('ds_forge:variant_key', vSpec.variantKey);
      await populateVariantComponentNode(vNode, vSpec.variantKey, vSpec.rootNode, ctx);
      targetPage.appendChild(vNode);
      createdVariants.push(vNode);
      variantsByKey.set(vSpec.variantKey, vNode);
    }
    componentSet = figma.combineAsVariants(createdVariants, targetPage);
    parentContainer.appendChild(componentSet);
    ctx.journal.createdNodeIds.push(componentSet.id);
  }

  componentSet.name = compPlan.recipe.name;
  try {
    componentSet.clearExplicitVariableModeForCollection(ctx.tokensCtx.collections.semantic);
  } catch {
    // Ignore if none
  }

  const propKeyMap = syncComponentPropertyDefinitions(
    componentSet,
    compPlan.recipe.properties,
    ctx,
  );

  for (const vSpec of compPlan.variants) {
    const vNode = variantsByKey.get(vSpec.variantKey);
    if (vNode) {
      bindPropertyReferencesAcrossTree(vNode, vSpec.rootNode, propKeyMap);
    }
  }

  // Arrange ComponentSet + Boolean property permutations into a Propstar-style 2D Matrix Table!
  await arrangePropstarComponentMatrix({
    compPlan,
    stage: parentContainer,
    ownerNode: componentSet,
    variantsByKey,
    propKeyMap,
    fontManager: ctx.fontManager,
    locale: ctx.plan.config.locale,
    createdNodeIds: ctx.journal.createdNodeIds,
  });

  componentSet.description = compPlan.formattedDescription;
  if (compPlan.recipe.documentation?.sourceLinks.length) {
    try {
      componentSet.documentationLinks = compPlan.recipe.documentation.sourceLinks.map((l) => ({
        uri: l.url,
      }));
    } catch {
      // Ignore if host build restricts documentationLinks format
    }
  }

  setNodeManagedMeta(componentSet, {
    systemInstanceId: ctx.systemInstanceId,
    libraryId: ctx.plan.library.libraryId,
    logicalId: compPlan.logicalId,
    objectKind: 'component-set',
    schemaVersion: SCHEMA_VERSION,
    packageVersion: ctx.plan.library.packageVersion,
    generatorVersion: GENERATOR_VERSION,
    lastGeneratedHash: compPlan.hash,
  });

  ctx.recordObject({
    logicalId: compPlan.logicalId,
    figmaId: componentSet.id,
    objectKind: 'component-set',
    displayName: componentSet.name,
    lastGeneratedHash: compPlan.hash,
    managedFields: {
      name: componentSet.name,
      description: componentSet.description,
      variantCount: String(compPlan.variants.length),
    },
  });

  const defaultAxisKey = compPlan.recipe.variantAxes
    .map((a) => `${a.name}=${a.defaultValue}`)
    .join(', ');
  const defaultVariant =
    variantsByKey.get(defaultAxisKey) ??
    componentSet.defaultVariant ??
    [...variantsByKey.values()][0];

  const entry: MaterializedComponentEntry = {
    logicalId: compPlan.logicalId,
    node: componentSet,
    defaultVariant,
    variantsByKey,
    propertyKeyByLogicalKey: propKeyMap,
  };
  ctx.componentsByLogicalId.set(compPlan.logicalId, entry);
  return entry;
}
