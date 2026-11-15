import { z } from 'zod';
import {
  DENSITY_MODES,
  LIBRARY_READINESS,
  RADIUS_PRESETS,
  SUPPORTED_LOCALES,
  THEME_MODES,
} from './constants';
import {
  EffectStyleDefinitionSchema,
  HttpUrlSchema,
  LocalizedTextSchema,
  TextStyleDefinitionSchema,
  TokenDefinitionSchema,
} from './tokens';
import { ComponentRecipeSchema, PatternRecipeSchema } from './recipes';

export const LicenseProvenanceSchema = z.object({
  repository: HttpUrlSchema,
  pinnedRef: z.string().min(5),
  sourceVersion: z.string().min(1),
  spdxLicense: z.enum(['MIT', 'Apache-2.0']),
  copyrightNotice: z.string().min(5),
  licenseUrl: HttpUrlSchema,
  licenseText: z.string().min(40),
  noticeText: z.string().optional(),
  modifications: z
    .array(
      z.object({
        scope: z.string().min(1),
        summary: z.string().min(1),
        date: z.string().min(4),
      }),
    )
    .optional(),
  inspectedPaths: z.array(z.string().min(1)).min(1),
  excludedUpstreamAssets: z.array(z.string().min(1)),
  assetInventory: z
    .array(
      z.object({
        assetType: z.enum(['recipe', 'icon-geometry', 'font-reference', 'documentation', 'tokens']),
        name: z.string().min(1),
        spdxLicense: z.string().min(1),
        provenance: z.string().min(1),
      }),
    )
    .min(1),
});
export type LicenseProvenance = z.infer<typeof LicenseProvenanceSchema>;

export const BrandPresetSchema = z.object({
  id: z.string().min(1),
  label: LocalizedTextSchema,
  primaryHex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});
export type BrandPreset = z.infer<typeof BrandPresetSchema>;

export const FontPresetSchema = z.object({
  id: z.string().min(1),
  label: stringOrSimple(),
  sansFamily: z.string().min(1),
  monoFamily: z.string().min(1),
  thaiFallbackFamily: z.string().min(1),
});
function stringOrSimple() {
  return z.string().min(1);
}
export type FontPreset = z.infer<typeof FontPresetSchema>;

export const LibraryCapabilitiesSchema = z.object({
  themes: z.array(z.enum(THEME_MODES)).min(1),
  locales: z.array(z.enum(SUPPORTED_LOCALES)).min(1),
  brandColor: z.boolean(),
  fontCustomization: z.boolean(),
  radiusCustomization: z.boolean(),
  supportedRadiusPresets: z.array(z.enum(RADIUS_PRESETS)),
  density: z.boolean(),
  supportedDensities: z.array(z.enum(DENSITY_MODES)),
  tokenPrefixCustomization: z.boolean(),
});
export type LibraryCapabilities = z.infer<typeof LibraryCapabilitiesSchema>;

export const MigrationRuleSchema = z.object({
  fromPackageVersion: z.string().min(1),
  toPackageVersion: z.string().min(1),
  summary: LocalizedTextSchema,
  renamedLogicalIds: z.record(z.string()).optional(),
  deprecatedLogicalIds: z.array(z.string()).optional(),
  structuralBreakingComponentIds: z.array(z.string()).optional(),
});
export type MigrationRule = z.infer<typeof MigrationRuleSchema>;

export const CanonicalPreviewFixtureSchema = z.object({
  fixtureVersion: z.string().min(1),
  buttonLabel: LocalizedTextSchema,
  secondaryButtonLabel: LocalizedTextSchema,
  inputPlaceholder: LocalizedTextSchema,
  cardTitle: LocalizedTextSchema,
  cardBody: LocalizedTextSchema,
  navItems: z.array(LocalizedTextSchema).min(2),
  simulatedAttributes: z.array(z.string()),
  nonSimulatedLimitations: LocalizedTextSchema,
});
export type CanonicalPreviewFixture = z.infer<typeof CanonicalPreviewFixtureSchema>;

export const LibraryDefinitionSchema = z.object({
  schemaVersion: z.literal(1),
  libraryId: z.string().regex(/^[a-z0-9-]+$/),
  displayName: z.string().min(1),
  vendorOrOrigin: z.string().min(1),
  tagline: LocalizedTextSchema,
  coverageSummary: LocalizedTextSchema,
  packageVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  catalogOrder: z.number().int().min(1),
  readiness: z.enum(LIBRARY_READINESS),
  defaultNamespace: z.string().min(1),
  source: LicenseProvenanceSchema,
  capabilities: LibraryCapabilitiesSchema,
  brandPresets: z.array(BrandPresetSchema),
  defaultBrandHex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  fontPresets: z.array(FontPresetSchema).min(1),
  defaultFontPresetId: z.string().min(1),
  defaultRadiusPreset: z.enum(RADIUS_PRESETS),
  previewFixture: CanonicalPreviewFixtureSchema,
  tokens: z.array(TokenDefinitionSchema),
  textStyles: z.array(TextStyleDefinitionSchema),
  effectStyles: z.array(EffectStyleDefinitionSchema),
  components: z.array(ComponentRecipeSchema),
  patterns: z.array(PatternRecipeSchema),
  changelog: z.array(
    z.object({
      version: z.string().min(1),
      date: z.string().min(4),
      notes: LocalizedTextSchema,
    }),
  ),
  migrations: z.array(MigrationRuleSchema),
});
export type LibraryDefinition = z.infer<typeof LibraryDefinitionSchema>;
