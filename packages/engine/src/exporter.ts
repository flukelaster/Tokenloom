import {
  formatTokenDescription,
  GENERATOR_VERSION,
  SCHEMA_VERSION,
  type LicenseProvenance,
  type TokenDefinition,
} from '@schema';
import { resolveTokenInMode } from './color';
import type { CompiledExecutionPlan } from './compiler';

export interface CanonicalExportedToken {
  logicalId: string;
  collection: TokenDefinition['collection'];
  name: string;
  sourceTokenName: string;
  normalizedRole: string;
  category: TokenDefinition['category'];
  $type: 'color' | 'number' | 'string' | 'boolean';
  $description: string;
  modes: Record<
    string,
    | { kind: 'value'; value: string | number | boolean; opacity?: number }
    | { kind: 'alias'; $ref: string }
  >;
  scopes: string[];
  codeSyntax?: Record<string, string>;
  deprecated?: TokenDefinition['deprecated'];
}

export interface CanonicalTokenExportBundle {
  $schema: 'https://tokenloom.dev/schemas/ds-forge-export-v1.json';
  schemaVersion: number;
  generatorVersion: string;
  exportedAt: string;
  manifest: {
    libraryId: string;
    libraryDisplayName: string;
    packageVersion: string;
    namespace: string;
    locale: 'en' | 'th';
    brandHex: string;
    radiusPreset: string;
    density: string;
    strictFidelity: boolean;
    collections: {
      primitives: { name: string; modes: ['Base'] };
      semantic: { name: string; modes: ['Light', 'Dark'] };
      component: { name: string; modes: ['Base'] };
    };
  };
  provenance: Omit<LicenseProvenance, 'licenseText'> & { licenseTextExcerpt: string };
  tokens: CanonicalExportedToken[];
  resolvedThemes: {
    Light: Record<string, string | number | boolean>;
    Dark: Record<string, string | number | boolean>;
  };
}

export function buildCanonicalTokenExport(
  plan: CompiledExecutionPlan,
  exportedAt = new Date().toISOString(),
): CanonicalTokenExportBundle {
  const tokenMap = new Map(plan.tokens.map((t) => [t.logicalId, t]));

  const dtcgTypeMap: Record<TokenDefinition['type'], CanonicalExportedToken['$type']> = {
    COLOR: 'color',
    FLOAT: 'number',
    STRING: 'string',
    BOOLEAN: 'boolean',
  };

  const tokens: CanonicalExportedToken[] = plan.tokens.map((tok) => {
    const modes: CanonicalExportedToken['modes'] = {};
    for (const [modeName, val] of Object.entries(tok.valuesByMode)) {
      if (!val) continue;
      if (val.kind === 'alias') {
        modes[modeName] = { kind: 'alias', $ref: `{${val.targetLogicalId}}` };
      } else if (val.kind === 'color') {
        modes[modeName] = {
          kind: 'value',
          value: val.hex,
          ...(val.opacity !== undefined && val.opacity < 1 ? { opacity: val.opacity } : {}),
        };
      } else {
        modes[modeName] = { kind: 'value', value: val.value };
      }
    }

    return {
      logicalId: tok.logicalId,
      collection: tok.collection,
      name: tok.name,
      sourceTokenName: tok.sourceTokenName,
      normalizedRole: tok.normalizedRole,
      category: tok.category,
      $type: dtcgTypeMap[tok.type],
      $description: formatTokenDescription(tok.description, plan.config.locale, tok.deprecated),
      modes,
      scopes: [...tok.scopes],
      codeSyntax: tok.codeSyntax ? { ...tok.codeSyntax } : undefined,
      deprecated: tok.deprecated,
    };
  });

  const resolvedLight: Record<string, string | number | boolean> = {};
  const resolvedDark: Record<string, string | number | boolean> = {};

  for (const tok of plan.tokens) {
    const light = resolveTokenInMode(tok.logicalId, 'Light', tokenMap);
    const dark = resolveTokenInMode(tok.logicalId, 'Dark', tokenMap);
    if (light) {
      resolvedLight[tok.logicalId] =
        light.hex ?? light.floatValue ?? light.stringValue ?? light.booleanValue ?? '';
    }
    if (dark) {
      resolvedDark[tok.logicalId] =
        dark.hex ?? dark.floatValue ?? dark.stringValue ?? dark.booleanValue ?? '';
    }
  }

  const { licenseText, ...restSource } = plan.library.source;

  return {
    $schema: 'https://tokenloom.dev/schemas/ds-forge-export-v1.json',
    schemaVersion: SCHEMA_VERSION,
    generatorVersion: GENERATOR_VERSION,
    exportedAt,
    manifest: {
      libraryId: plan.library.libraryId,
      libraryDisplayName: plan.library.displayName,
      packageVersion: plan.library.packageVersion,
      namespace: plan.config.namespace,
      locale: plan.config.locale,
      brandHex: plan.config.brandHex,
      radiusPreset: plan.config.radiusPreset,
      density: plan.config.density,
      strictFidelity: plan.config.strictFidelity,
      collections: {
        primitives: { name: plan.collections.primitivesName, modes: ['Base'] },
        semantic: { name: plan.collections.semanticName, modes: ['Light', 'Dark'] },
        component: { name: plan.collections.componentName, modes: ['Base'] },
      },
    },
    provenance: {
      ...restSource,
      licenseTextExcerpt: licenseText.slice(0, 240),
    },
    tokens,
    resolvedThemes: {
      Light: resolvedLight,
      Dark: resolvedDark,
    },
  };
}

export interface ExportVerificationResult {
  valid: boolean;
  errors: string[];
  resolvedCount: number;
}

/**
 * Re-verifies an exported JSON bundle independently by walking all `$ref` aliases
 * across Light and Dark modes and confirming resolved values match `resolvedThemes`.
 */
export function verifyExportedTokenBundle(
  bundle: CanonicalTokenExportBundle,
): ExportVerificationResult {
  const errors: string[] = [];
  const byId = new Map(bundle.tokens.map((t) => [t.logicalId, t]));

  const resolveFromBundle = (
    id: string,
    theme: 'Light' | 'Dark',
    visited = new Set<string>(),
  ): string | number | boolean | null => {
    if (visited.has(id)) {
      errors.push(`Cycle detected while resolving exported token "${id}" in ${theme}.`);
      return null;
    }
    visited.add(id);
    const tok = byId.get(id);
    if (!tok) {
      errors.push(`Missing exported token "${id}".`);
      return null;
    }
    const modeEntry = tok.collection === 'semantic' ? tok.modes[theme] : tok.modes.Base;
    if (!modeEntry) {
      errors.push(`Missing mode entry on exported token "${id}" for ${theme}.`);
      return null;
    }
    if (modeEntry.kind === 'alias') {
      const targetId = modeEntry.$ref.replace(/^\{|\}$/g, '');
      return resolveFromBundle(targetId, theme, visited);
    }
    return modeEntry.value;
  };

  let resolvedCount = 0;
  for (const tok of bundle.tokens) {
    if (!tok.$description || tok.$description.trim().length === 0) {
      errors.push(`Exported token "${tok.logicalId}" has an empty $description.`);
    }
    for (const theme of ['Light', 'Dark'] as const) {
      const resolved = resolveFromBundle(tok.logicalId, theme);
      if (resolved === null) continue;
      const recorded = bundle.resolvedThemes[theme][tok.logicalId];
      if (recorded !== resolved) {
        errors.push(
          `Theme resolution mismatch for "${tok.logicalId}" in ${theme}: expected ${String(resolved)}, found ${String(recorded)}.`,
        );
      } else {
        resolvedCount += 1;
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    resolvedCount,
  };
}
