import {
  formatTokenDescription,
  type ComponentRecipe,
  type EffectStyleDefinition,
  type FontPreset,
  type GenerationConfig,
  type LibraryDefinition,
  type NodePatch,
  type PatternRecipe,
  type RadiusPreset,
  type RecipeNodeSpec,
  type TextStyleDefinition,
  type TokenDefinition,
  type TokenModeValue,
} from '@schema';
import { generateBrandPalette, resolveTokenInMode, wcagContrastRatio } from './color';

export function sanitizeFigmaVariableName(raw: string): string {
  const cleaned = raw
    .trim()
    .replace(/[\s.]+/g, '-')
    .replace(/[^a-zA-Z0-9_\-/]/g, '')
    .replace(/\/+/g, '/')
    .replace(/^-+|-+$/g, '')
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .map((seg) => seg.replace(/^-+|-+$/g, '').trim())
    .filter(Boolean)
    .join('/');
  return cleaned || 'token';
}

export interface CompiledVariantSpec {
  variantKey: string; // e.g. "Variant=Primary, Size=Medium, State=Default"
  axisValues: Record<string, string>;
  rootNode: RecipeNodeSpec;
  hash: string;
}

export interface CompiledComponentPlan {
  logicalId: string;
  recipe: ComponentRecipe;
  variants: CompiledVariantSpec[];
  formattedDescription: string;
  hash: string;
}

export interface PlannedPage {
  logicalId: string;
  pageKey: string;
  title: string;
  kind:
    | 'start-here'
    | 'foundations'
    | 'component'
    | 'patterns'
    | 'playground'
    | 'quality-report'
    | 'changelog-license';
  order: number;
  componentLogicalId?: string;
}

export interface GenerationEstimates {
  pages: number;
  collections: number;
  variables: number;
  styles: number;
  userFacingComponents: number;
  helperComponents: number;
  totalVariants: number;
  patterns: number;
  estimatedNodes: number;
  exceedsRecommendedBudget: boolean;
  budgetWarnings: string[];
}

export interface ContrastAuditItem {
  componentLogicalId: string;
  pairId: string;
  label: string;
  lightRatio: number | null;
  darkRatio: number | null;
  minRatio: number;
  passed: boolean;
  note?: string;
}

export interface CompiledExecutionPlan {
  library: LibraryDefinition;
  config: GenerationConfig;
  activeFontPreset: FontPreset;
  collections: {
    primitivesName: string;
    semanticName: string;
    componentName: string;
  };
  tokens: TokenDefinition[];
  tokenHashes: Record<string, string>;
  textStyles: TextStyleDefinition[];
  textStyleHashes: Record<string, string>;
  effectStyles: EffectStyleDefinition[];
  effectStyleHashes: Record<string, string>;
  orderedComponents: CompiledComponentPlan[];
  selectedPatterns: PatternRecipe[];
  pages: PlannedPage[];
  estimates: GenerationEstimates;
  contrastAudit: ContrastAuditItem[];
  preflightWarnings: string[];
}

const RADIUS_MULTIPLIERS: Record<RadiusPreset, number> = {
  none: 0,
  sm: 0.5,
  md: 1,
  lg: 1.5,
  full: 999,
};

export function deterministicHash(input: unknown): string {
  const json = canonicalJson(input);
  let h1 = 0xdeadbeef ^ json.length;
  let h2 = 0x41c6ce57 ^ json.length;
  for (let i = 0; i < json.length; i++) {
    const ch = json.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
}

function canonicalJson(val: unknown): string {
  if (val === null || typeof val !== 'object') {
    return JSON.stringify(val);
  }
  if (Array.isArray(val)) {
    return `[${val.map(canonicalJson).join(',')}]`;
  }
  const entries = Object.entries(val as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
}

function cloneNode(node: RecipeNodeSpec): RecipeNodeSpec {
  return {
    ...node,
    bindings: node.bindings ? { ...node.bindings } : undefined,
    variantCriteria: node.variantCriteria ? { ...node.variantCriteria } : undefined,
    instancePropertyOverrides: node.instancePropertyOverrides
      ? { ...node.instancePropertyOverrides }
      : undefined,
    propertyRef: node.propertyRef ? { ...node.propertyRef } : undefined,
    children: node.children ? node.children.map(cloneNode) : undefined,
  };
}

function applyPatchToTree(node: RecipeNodeSpec, patches: Record<string, NodePatch>): RecipeNodeSpec {
  const cloned = cloneNode(node);
  const patch = patches[cloned.id];
  if (patch) {
    if (patch.visible !== undefined) cloned.visible = patch.visible;
    if (patch.width !== undefined) cloned.width = patch.width;
    if (patch.height !== undefined) cloned.height = patch.height;
    if (patch.minWidth !== undefined) cloned.minWidth = patch.minWidth;
    if (patch.minHeight !== undefined) cloned.minHeight = patch.minHeight;
    if (patch.paddingTop !== undefined) cloned.paddingTop = patch.paddingTop;
    if (patch.paddingRight !== undefined) cloned.paddingRight = patch.paddingRight;
    if (patch.paddingBottom !== undefined) cloned.paddingBottom = patch.paddingBottom;
    if (patch.paddingLeft !== undefined) cloned.paddingLeft = patch.paddingLeft;
    if (patch.itemSpacing !== undefined) cloned.itemSpacing = patch.itemSpacing;
    if (patch.cornerRadius !== undefined) cloned.cornerRadius = patch.cornerRadius;
    if (patch.strokeWeight !== undefined) cloned.strokeWeight = patch.strokeWeight;
    if (patch.opacity !== undefined) cloned.opacity = patch.opacity;
    if (patch.transparentFill !== undefined) cloned.transparentFill = patch.transparentFill;
    if (patch.primaryAxisAlignItems !== undefined) {
      cloned.primaryAxisAlignItems = patch.primaryAxisAlignItems;
    }
    if (patch.counterAxisAlignItems !== undefined) {
      cloned.counterAxisAlignItems = patch.counterAxisAlignItems;
    }
    if (patch.textStyleLogicalId !== undefined) {
      cloned.textStyleLogicalId = patch.textStyleLogicalId;
    }
    if (patch.effectStyleLogicalId !== undefined) {
      cloned.effectStyleLogicalId = patch.effectStyleLogicalId ?? undefined;
    }
    if (patch.characters !== undefined) cloned.characters = patch.characters;
    if (patch.fontWeight !== undefined) cloned.fontWeight = patch.fontWeight;
    if (patch.fontSize !== undefined) cloned.fontSize = patch.fontSize;
    if (patch.lineHeightPx !== undefined) cloned.lineHeightPx = patch.lineHeightPx;

    if (patch.clearBindings && cloned.bindings) {
      for (const field of patch.clearBindings) {
        delete (cloned.bindings as Record<string, unknown>)[field];
      }
    }
    if (patch.bindings) {
      cloned.bindings = { ...(cloned.bindings ?? {}), ...patch.bindings };
    }
  }
  if (cloned.children) {
    cloned.children = cloned.children.map((child) => applyPatchToTree(child, patches));
  }
  return cloned;
}

function countTreeNodes(node: RecipeNodeSpec): number {
  let count = 1;
  for (const child of node.children ?? []) {
    count += countTreeNodes(child);
  }
  return count;
}

export function expandComponentVariants(recipe: ComponentRecipe): CompiledVariantSpec[] {
  if (recipe.variantAxes.length === 0) {
    const rootNode = cloneNode(recipe.baseNode);
    return [
      {
        variantKey: recipe.name,
        axisValues: {},
        rootNode,
        hash: deterministicHash({ name: recipe.name, rootNode }),
      },
    ];
  }

  let combinations: Array<Record<string, string>> = [{}];
  for (const axis of recipe.variantAxes) {
    const next: Array<Record<string, string>> = [];
    for (const existing of combinations) {
      for (const value of axis.values) {
        next.push({ ...existing, [axis.name]: value });
      }
    }
    combinations = next;
  }

  if (recipe.excludeVariantMatches && recipe.excludeVariantMatches.length > 0) {
    combinations = combinations.filter((combo) => {
      return !recipe.excludeVariantMatches!.some((excl) =>
        Object.entries(excl).every(([k, v]) => combo[k] === v),
      );
    });
  }

  return combinations.map((axisValues) => {
    let rootNode = cloneNode(recipe.baseNode);
    for (const rule of recipe.variantOverrides) {
      const matches = Object.entries(rule.match).every(([axis, val]) => axisValues[axis] === val);
      if (matches) {
        rootNode = applyPatchToTree(rootNode, rule.nodePatches);
      }
    }
    const variantKey = recipe.variantAxes
      .map((axis) => `${axis.name}=${axisValues[axis.name]}`)
      .join(', ');
    return {
      variantKey,
      axisValues,
      rootNode,
      hash: deterministicHash({ variantKey, rootNode }),
    };
  });
}

export function formatComponentMetadataDescription(
  recipe: ComponentRecipe,
  library: LibraryDefinition,
  locale: 'en' | 'th',
): string {
  if (!recipe.documentation) {
    return `${library.displayName} helper component (${recipe.name}) — v${library.packageVersion}`;
  }
  const doc = recipe.documentation;
  const purpose = doc.purpose[locale];
  const scenarios = doc.usageScenarios.map((s) => `• ${s[locale]}`).join('\n');
  const avoid = doc.whenNotToUse.map((s) => `• ${s[locale]}`).join('\n');
  const a11y = `${doc.accessibility.labelGuidance[locale]} ${doc.accessibility.contrastNotes[locale]}`;
  if (locale === 'th') {
    return [
      `${recipe.displayName.th} (${library.displayName} v${library.packageVersion})`,
      purpose,
      `การใช้งานที่แนะนำ:\n${scenarios}`,
      `ไม่ควรใช้เมื่อ:\n${avoid}`,
      `การเข้าถึง (Accessibility): ${a11y}`,
      `ต้นฉบับ: ${library.source.repository} @ ${library.source.pinnedRef}`,
    ].join('\n\n');
  }
  return [
    `${recipe.displayName.en} (${library.displayName} v${library.packageVersion})`,
    purpose,
    `Recommended usage:\n${scenarios}`,
    `When not to use:\n${avoid}`,
    `Accessibility: ${a11y}`,
    `Source: ${library.source.repository} @ ${library.source.pinnedRef}`,
  ].join('\n\n');
}

function selectTargetComponentIds(
  library: LibraryDefinition,
  config: GenerationConfig,
): Set<string> {
  const chosen = new Set<string>();
  const nonHelpers = library.components.filter((c) => c.tier !== 'helper');

  if (config.scope === 'technical-slice') {
    for (const c of nonHelpers) {
      if (c.tier === 'technical-slice') chosen.add(c.logicalId);
    }
    if (chosen.size === 0) {
      for (const c of nonHelpers.slice(0, 3)) chosen.add(c.logicalId);
    }
  } else if (config.scope === 'core') {
    for (const c of nonHelpers) {
      if (c.tier === 'technical-slice' || c.tier === 'core') chosen.add(c.logicalId);
    }
  } else if (config.scope === 'full') {
    for (const c of nonHelpers) chosen.add(c.logicalId);
  } else {
    for (const id of config.selectedComponentIds) {
      if (library.components.some((c) => c.logicalId === id)) {
        chosen.add(id);
      }
    }
    if (chosen.size === 0 && nonHelpers.length > 0) {
      chosen.add(nonHelpers[0].logicalId);
    }
  }

  // Include transitive dependencies (including helper Icon components!)
  const byId = new Map(library.components.map((c) => [c.logicalId, c]));
  const queue = [...chosen];
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const comp = byId.get(currentId);
    if (!comp) continue;
    for (const depId of comp.dependencies) {
      if (!chosen.has(depId) && byId.has(depId)) {
        chosen.add(depId);
        queue.push(depId);
      }
    }
    for (const prop of comp.properties) {
      if (prop.type === 'INSTANCE_SWAP') {
        if (typeof prop.defaultValue === 'string' && !chosen.has(prop.defaultValue) && byId.has(prop.defaultValue)) {
          chosen.add(prop.defaultValue);
          queue.push(prop.defaultValue);
        }
        for (const pref of prop.preferredInstanceLogicalIds ?? []) {
          if (!chosen.has(pref) && byId.has(pref)) {
            chosen.add(pref);
            queue.push(pref);
          }
        }
      }
    }
  }

  return chosen;
}

function topologicalSortComponents(
  components: ComponentRecipe[],
  includedIds: ReadonlySet<string>,
): ComponentRecipe[] {
  const byId = new Map(
    components.filter((c) => includedIds.has(c.logicalId)).map((c) => [c.logicalId, c]),
  );
  const visited = new Set<string>();
  const ordered: ComponentRecipe[] = [];

  const sortedRoots = [...byId.values()].sort((a, b) => a.pageOrder - b.pageOrder);
  const visit = (comp: ComponentRecipe) => {
    if (visited.has(comp.logicalId)) return;
    visited.add(comp.logicalId);
    for (const depId of comp.dependencies) {
      const dep = byId.get(depId);
      if (dep) visit(dep);
    }
    ordered.push(comp);
  };

  for (const comp of sortedRoots) {
    visit(comp);
  }
  return ordered;
}

function transformModeValue(
  val: TokenModeValue | undefined,
  ctx: {
    strictFidelity: boolean;
    brandPalette: Record<string, string> | null;
    radiusPreset: RadiusPreset | null;
    compactDensity: boolean;
    fontPreset: FontPreset;
    locale: 'en' | 'th';
  },
): TokenModeValue | undefined {
  if (!val) return undefined;
  if (ctx.strictFidelity) return { ...val };

  if (val.kind === 'color' && val.brandShade && ctx.brandPalette) {
    return {
      ...val,
      hex: ctx.brandPalette[val.brandShade] ?? val.hex,
    };
  }

  if (val.kind === 'float') {
    let nextVal = val.value;
    if (ctx.compactDensity && val.compactValue !== undefined) {
      nextVal = val.compactValue;
    }
    if (ctx.radiusPreset && val.radiusScaleFactor !== undefined) {
      if (ctx.radiusPreset === 'none') {
        nextVal = 0;
      } else if (ctx.radiusPreset === 'full') {
        nextVal = val.value >= 12 ? 20 : 9999;
      } else {
        nextVal = Math.round(val.value * RADIUS_MULTIPLIERS[ctx.radiusPreset]);
      }
    }
    return {
      ...val,
      value: nextVal,
    };
  }

  if (val.kind === 'string' && val.fontRole) {
    const family =
      val.fontRole === 'mono'
        ? ctx.fontPreset.monoFamily
        : ctx.locale === 'th'
          ? ctx.fontPreset.thaiFallbackFamily
          : ctx.fontPreset.sansFamily;
    return {
      ...val,
      value: family,
    };
  }

  return { ...val };
}

export function compileExecutionPlan(
  library: LibraryDefinition,
  rawConfig?: Partial<GenerationConfig>,
): CompiledExecutionPlan {
  const config: GenerationConfig = {
    libraryId: library.libraryId,
    namespace: rawConfig?.namespace?.trim() || library.defaultNamespace,
    locale:
      rawConfig?.locale && library.capabilities.locales.includes(rawConfig.locale)
        ? rawConfig.locale
        : library.capabilities.locales[0],
    pageNaming: rawConfig?.pageNaming ?? 'numbered',
    scope: rawConfig?.scope ?? 'core',
    selectedComponentIds: rawConfig?.selectedComponentIds ?? [],
    brandHex: rawConfig?.brandHex ?? library.defaultBrandHex,
    fontPresetId: rawConfig?.fontPresetId ?? library.defaultFontPresetId,
    radiusPreset:
      rawConfig?.radiusPreset &&
      library.capabilities.supportedRadiusPresets.includes(rawConfig.radiusPreset)
        ? rawConfig.radiusPreset
        : library.defaultRadiusPreset,
    density:
      rawConfig?.density && library.capabilities.supportedDensities.includes(rawConfig.density)
        ? rawConfig.density
        : 'default',
    tokenPrefix:
      library.capabilities.tokenPrefixCustomization && rawConfig?.tokenPrefix
        ? rawConfig.tokenPrefix.trim()
        : '',
    strictFidelity: rawConfig?.strictFidelity ?? false,
  };

  const activeFontPreset =
    library.fontPresets.find((f) => f.id === config.fontPresetId) ?? library.fontPresets[0];

  const brandPalette =
    !config.strictFidelity && library.capabilities.brandColor
      ? generateBrandPalette(config.brandHex)
      : null;

  const radiusPreset =
    !config.strictFidelity && library.capabilities.radiusCustomization
      ? config.radiusPreset
      : null;

  const compactDensity =
    !config.strictFidelity && library.capabilities.density && config.density === 'compact';

  const cleanPrefix = config.tokenPrefix
    ? sanitizeFigmaVariableName(config.tokenPrefix)
    : '';

  const compiledTokens: TokenDefinition[] = library.tokens.map((tok) => {
    const prefixedName = sanitizeFigmaVariableName(
      cleanPrefix ? `${cleanPrefix}/${tok.name}` : tok.name,
    );
    const cssSlug = prefixedName.replace(/\//g, '-').toLowerCase();
    return {
      ...tok,
      name: prefixedName,
      codeSyntax: {
        ...tok.codeSyntax,
        WEB: cleanPrefix ? `var(--${cssSlug})` : tok.codeSyntax?.WEB ?? `var(--${cssSlug})`,
      },
      valuesByMode: {
        Base: transformModeValue(tok.valuesByMode.Base, {
          strictFidelity: config.strictFidelity,
          brandPalette,
          radiusPreset,
          compactDensity,
          fontPreset: activeFontPreset,
          locale: config.locale,
        }),
        Light: transformModeValue(tok.valuesByMode.Light, {
          strictFidelity: config.strictFidelity,
          brandPalette,
          radiusPreset,
          compactDensity,
          fontPreset: activeFontPreset,
          locale: config.locale,
        }),
        Dark: transformModeValue(tok.valuesByMode.Dark, {
          strictFidelity: config.strictFidelity,
          brandPalette,
          radiusPreset,
          compactDensity,
          fontPreset: activeFontPreset,
          locale: config.locale,
        }),
      },
    };
  });

  const tokenHashes: Record<string, string> = {};
  for (const tok of compiledTokens) {
    tokenHashes[tok.logicalId] = deterministicHash({
      name: tok.name,
      type: tok.type,
      valuesByMode: tok.valuesByMode,
      description: formatTokenDescription(tok.description, config.locale, tok.deprecated),
      scopes: tok.scopes,
      codeSyntax: tok.codeSyntax,
    });
  }

  const textStyleHashes: Record<string, string> = {};
  for (const ts of library.textStyles) {
    textStyleHashes[ts.logicalId] = deterministicHash({
      ts,
      fontFamily:
        ts.fontRole === 'mono'
          ? activeFontPreset.monoFamily
          : config.locale === 'th'
            ? activeFontPreset.thaiFallbackFamily
            : activeFontPreset.sansFamily,
      locale: config.locale,
    });
  }

  const effectStyleHashes: Record<string, string> = {};
  for (const es of library.effectStyles) {
    effectStyleHashes[es.logicalId] = deterministicHash({ es, locale: config.locale });
  }

  const includedIds = selectTargetComponentIds(library, config);
  const sortedRecipes = topologicalSortComponents(library.components, includedIds);

  const orderedComponents: CompiledComponentPlan[] = sortedRecipes.map((recipe) => {
    const variants = expandComponentVariants(recipe);
    const formattedDescription = formatComponentMetadataDescription(recipe, library, config.locale);
    return {
      logicalId: recipe.logicalId,
      recipe,
      variants,
      formattedDescription,
      hash: deterministicHash({
        logicalId: recipe.logicalId,
        name: recipe.name,
        properties: recipe.properties,
        variants: variants.map((v) => v.hash),
        formattedDescription,
      }),
    };
  });

  const includedSet = new Set(orderedComponents.map((c) => c.logicalId));
  const selectedPatterns = library.patterns.filter((pat) =>
    pat.requiredComponents.every((req) => includedSet.has(req)),
  );

  // Build Manifest-Ordered Pages (Section 5)
  const formatPageTitle = (num: string, label: string) =>
    config.pageNaming === 'numbered'
      ? `${config.namespace} · ${num} ${label}`
      : `${config.namespace} · ${label}`;

  const pages: PlannedPage[] = [
    {
      logicalId: 'page.start-here',
      pageKey: '00-start-here',
      title: formatPageTitle('00', 'Start Here'),
      kind: 'start-here',
      order: 0,
    },
    {
      logicalId: 'page.foundations',
      pageKey: '01-foundations',
      title: formatPageTitle('01', 'Foundations'),
      kind: 'foundations',
      order: 1,
    },
  ];

  const userFacingOrdered = orderedComponents
    .filter((c) => c.recipe.tier !== 'helper')
    .sort((a, b) => a.recipe.pageOrder - b.recipe.pageOrder);

  userFacingOrdered.forEach((comp, idx) => {
    const pageNum = String(idx + 2).padStart(2, '0');
    pages.push({
      logicalId: `page.component.${comp.logicalId}`,
      pageKey: `${pageNum}-${comp.logicalId}`,
      title: formatPageTitle(pageNum, comp.recipe.name),
      kind: 'component',
      order: idx + 2,
      componentLogicalId: comp.logicalId,
    });
  });

  pages.push(
    {
      logicalId: 'page.patterns',
      pageKey: '90-patterns',
      title: formatPageTitle('90', 'Patterns'),
      kind: 'patterns',
      order: 90,
    },
    {
      logicalId: 'page.playground',
      pageKey: '91-theme-playground',
      title: formatPageTitle('91', 'Theme Playground'),
      kind: 'playground',
      order: 91,
    },
    {
      logicalId: 'page.quality-report',
      pageKey: '98-quality-report',
      title: formatPageTitle('98', 'Quality Report'),
      kind: 'quality-report',
      order: 98,
    },
    {
      logicalId: 'page.changelog-license',
      pageKey: '99-changelog-license',
      title: formatPageTitle('99', 'Changelog & License'),
      kind: 'changelog-license',
      order: 99,
    },
  );

  // Contrast checks across declared pairs in Light & Dark modes
  const tokenMap = new Map(compiledTokens.map((t) => [t.logicalId, t]));
  const contrastAudit: ContrastAuditItem[] = [];
  const preflightWarnings: string[] = [];

  for (const comp of userFacingOrdered) {
    for (const pair of comp.recipe.contrastPairs) {
      const fgLight = resolveTokenInMode(pair.foregroundTokenId, 'Light', tokenMap);
      const bgLight = resolveTokenInMode(pair.backgroundTokenId, 'Light', tokenMap);
      const fgDark = resolveTokenInMode(pair.foregroundTokenId, 'Dark', tokenMap);
      const bgDark = resolveTokenInMode(pair.backgroundTokenId, 'Dark', tokenMap);

      if (!fgLight?.hex || !bgLight?.hex || !fgDark?.hex || !bgDark?.hex) {
        contrastAudit.push({
          componentLogicalId: comp.logicalId,
          pairId: pair.id,
          label: pair.label,
          lightRatio: null,
          darkRatio: null,
          minRatio: pair.minRatio,
          passed: false,
          note: 'Could not statically resolve foreground/background hex values.',
        });
        continue;
      }

      const lightRatio = wcagContrastRatio(
        fgLight.hex,
        bgLight.hex,
        fgLight.opacity ?? 1,
        bgLight.opacity ?? 1,
      );
      const darkRatio = wcagContrastRatio(
        fgDark.hex,
        bgDark.hex,
        fgDark.opacity ?? 1,
        bgDark.opacity ?? 1,
      );
      const passed = lightRatio >= pair.minRatio && darkRatio >= pair.minRatio;
      if (!passed) {
        preflightWarnings.push(
          `Contrast warning on ${comp.recipe.name} (${pair.label}): Light ${lightRatio}:1, Dark ${darkRatio}:1 (target ≥ ${pair.minRatio}:1).`,
        );
      }
      contrastAudit.push({
        componentLogicalId: comp.logicalId,
        pairId: pair.id,
        label: pair.label,
        lightRatio,
        darkRatio,
        minRatio: pair.minRatio,
        passed,
      });
    }
  }

  if (config.locale === 'th') {
    preflightWarnings.push(
      `Thai documentation selected: DS Forge will verify "${activeFontPreset.thaiFallbackFamily}" availability and log any fallback in the Quality Report.`,
    );
  }

  // Node & Variant Budget estimation (Section 14)
  const totalVariants = orderedComponents.reduce((acc, c) => acc + c.variants.length, 0);
  const componentNodes = orderedComponents.reduce(
    (acc, c) =>
      acc + c.variants.reduce((vAcc, v) => vAcc + countTreeNodes(v.rootNode), 0),
    0,
  );
  const docsNodesEstimate = userFacingOrdered.length * 42 + 120;
  const estimatedNodes = componentNodes + docsNodesEstimate;
  const budgetWarnings: string[] = [];
  const exceedsRecommendedBudget = totalVariants > 280 || estimatedNodes > 4500;
  if (exceedsRecommendedBudget) {
    budgetWarnings.push(
      `Estimated ${totalVariants} variants (~${estimatedNodes} nodes) exceeds the fast-generation budget. Consider choosing "Core" scope or fewer custom components.`,
    );
  }

  return {
    library,
    config,
    activeFontPreset,
    collections: {
      primitivesName: `${config.namespace}/Primitives`,
      semanticName: `${config.namespace}/Semantic`,
      componentName: `${config.namespace}/Component`,
    },
    tokens: compiledTokens,
    tokenHashes,
    textStyles: library.textStyles,
    textStyleHashes,
    effectStyles: library.effectStyles,
    effectStyleHashes,
    orderedComponents,
    selectedPatterns,
    pages,
    estimates: {
      pages: pages.length,
      collections: 3,
      variables: compiledTokens.length,
      styles: library.textStyles.length + library.effectStyles.length,
      userFacingComponents: userFacingOrdered.length,
      helperComponents: orderedComponents.length - userFacingOrdered.length,
      totalVariants,
      patterns: selectedPatterns.length,
      estimatedNodes,
      exceedsRecommendedBudget,
      budgetWarnings,
    },
    contrastAudit,
    preflightWarnings,
  };
}
