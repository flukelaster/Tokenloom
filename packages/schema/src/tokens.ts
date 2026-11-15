import { z } from 'zod';

/**
 * QuickJS-safe HTTP(S) URL validator.
 * Figma's QuickJS main plugin sandbox does not provide global `URL`, so `z.string().url()`
 * would throw `ReferenceError: URL is not defined` inside `new URL(...)`.
 */
export const HttpUrlSchema = z
  .string()
  .trim()
  .regex(/^https?:\/\/[^\s/$.?#].[^\s]*$/i, 'Invalid HTTP(S) URL');

export const LocalizedTextSchema = z.object({
  en: z.string().min(1, 'English text is required'),
  th: z.string().min(1, 'Thai text is required'),
});
export type LocalizedText = z.infer<typeof LocalizedTextSchema>;

export const TokenCollectionTierSchema = z.enum(['primitives', 'semantic', 'component']);
export type TokenCollectionTier = z.infer<typeof TokenCollectionTierSchema>;

export const TokenValueTypeSchema = z.enum(['COLOR', 'FLOAT', 'STRING', 'BOOLEAN']);

export const BrandPaletteShadeSchema = z.enum([
  '50',
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
  '950',
  'on-brand-light',
  'on-brand-dark',
]);
export type BrandPaletteShade = z.infer<typeof BrandPaletteShadeSchema>;

export const VariableScopeSchema = z.enum([
  'ALL_SCOPES',
  'TEXT_CONTENT',
  'CORNER_RADIUS',
  'WIDTH_HEIGHT',
  'GAP',
  'ALL_FILLS',
  'FRAME_FILL',
  'SHAPE_FILL',
  'TEXT_FILL',
  'STROKE_COLOR',
  'STROKE_FLOAT',
  'EFFECT_FLOAT',
  'EFFECT_COLOR',
  'OPACITY',
  'COLOR_OPACITY',
  'FONT_FAMILY',
  'FONT_STYLE',
  'FONT_WEIGHT',
  'FONT_SIZE',
  'LINE_HEIGHT',
  'LETTER_SPACING',
  'PARAGRAPH_SPACING',
  'PARAGRAPH_INDENT',
]);
export type FigmaVariableScope = z.infer<typeof VariableScopeSchema>;

export const TokenModeValueSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('color'),
    hex: z.string().regex(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, 'Expected #RRGGBB or #RRGGBBAA hex'),
    opacity: z.number().min(0).max(1).optional(),
    brandShade: BrandPaletteShadeSchema.optional(),
  }),
  z.object({
    kind: z.literal('float'),
    value: z.number().finite(),
    radiusScaleFactor: z.number().min(0).optional(),
    compactValue: z.number().finite().optional(),
  }),
  z.object({
    kind: z.literal('string'),
    value: z.string().min(1),
    fontRole: z.enum(['sans', 'mono']).optional(),
  }),
  z.object({
    kind: z.literal('boolean'),
    value: z.boolean(),
  }),
  z.object({
    kind: z.literal('alias'),
    targetLogicalId: z.string().min(1),
  }),
]);
export type TokenModeValue = z.infer<typeof TokenModeValueSchema>;

export const TokenUsageDescriptionSchema = z.object({
  whenToUse: LocalizedTextSchema,
  whenNotToUse: LocalizedTextSchema,
  example: LocalizedTextSchema,
  constraints: LocalizedTextSchema,
});
export type TokenUsageDescription = z.infer<typeof TokenUsageDescriptionSchema>;

export const TokenCategorySchema = z.enum([
  'color',
  'spacing',
  'radius',
  'typography',
  'size',
  'border',
  'opacity',
  'elevation',
]);
export type TokenCategory = z.infer<typeof TokenCategorySchema>;

export const TokenDeprecationSchema = z.object({
  isDeprecated: z.boolean(),
  replacementLogicalId: z.string().optional(),
  reason: LocalizedTextSchema.optional(),
});
export type TokenDeprecation = z.infer<typeof TokenDeprecationSchema>;

export const TokenDefinitionSchema = z.object({
  logicalId: z.string().min(1),
  collection: TokenCollectionTierSchema,
  name: z.string().min(1),
  sourceTokenName: z.string().min(1),
  normalizedRole: z.string().min(1),
  category: TokenCategorySchema,
  type: TokenValueTypeSchema,
  valuesByMode: z.object({
    Base: TokenModeValueSchema.optional(),
    Light: TokenModeValueSchema.optional(),
    Dark: TokenModeValueSchema.optional(),
  }),
  description: TokenUsageDescriptionSchema,
  scopes: z.array(VariableScopeSchema).min(1),
  codeSyntax: z
    .object({
      WEB: z.string().optional(),
      ANDROID: z.string().optional(),
      iOS: z.string().optional(),
    })
    .optional(),
  expectedBindingTargets: z.array(z.string()).min(1),
  sourceVersion: z.string().min(1),
  deprecated: TokenDeprecationSchema.optional(),
});
export type TokenDefinition = z.infer<typeof TokenDefinitionSchema>;

export const TextStyleDefinitionSchema = z.object({
  logicalId: z.string().min(1),
  name: z.string().min(1),
  description: LocalizedTextSchema,
  fontRole: z.enum(['sans', 'mono']),
  fontStyle: z.enum(['Regular', 'Medium', 'SemiBold', 'Bold']),
  fontSize: z.number().positive(),
  lineHeightPx: z.number().positive(),
  letterSpacingPx: z.number(),
  boundVariables: z
    .object({
      fontSize: z.string().optional(),
      lineHeight: z.string().optional(),
      letterSpacing: z.string().optional(),
      fontFamily: z.string().optional(),
    })
    .optional(),
});
export type TextStyleDefinition = z.infer<typeof TextStyleDefinitionSchema>;

export const ShadowLayerDefinitionSchema = z.object({
  offsetX: z.number(),
  offsetY: z.number(),
  radius: z.number().min(0),
  spread: z.number(),
  fallbackHex: z.string().regex(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/),
  fallbackOpacity: z.number().min(0).max(1),
  colorTokenLogicalId: z.string().optional(),
});
export type ShadowLayerDefinition = z.infer<typeof ShadowLayerDefinitionSchema>;

export const EffectStyleDefinitionSchema = z.object({
  logicalId: z.string().min(1),
  name: z.string().min(1),
  description: LocalizedTextSchema,
  shadows: z.array(ShadowLayerDefinitionSchema).min(1),
});
export type EffectStyleDefinition = z.infer<typeof EffectStyleDefinitionSchema>;

export function formatTokenDescription(
  desc: TokenUsageDescription,
  locale: 'en' | 'th',
  deprecated?: TokenDeprecation,
): string {
  const parts: string[] = [];
  if (deprecated?.isDeprecated) {
    const prefix =
      locale === 'th'
        ? `[เลิกใช้งานแล้ว${deprecated.replacementLogicalId ? ` → แทนที่ด้วย ${deprecated.replacementLogicalId}` : ''}]`
        : `[DEPRECATED${deprecated.replacementLogicalId ? ` → Replace with ${deprecated.replacementLogicalId}` : ''}]`;
    parts.push(prefix);
  }
  if (locale === 'th') {
    parts.push(`ใช้เมื่อไร: ${desc.whenToUse.th}`);
    parts.push(`ไม่ควรใช้เมื่อไร: ${desc.whenNotToUse.th}`);
    parts.push(`ตัวอย่าง: ${desc.example.th}`);
    parts.push(`ข้อจำกัด: ${desc.constraints.th}`);
  } else {
    parts.push(`When to use: ${desc.whenToUse.en}`);
    parts.push(`Do not use for: ${desc.whenNotToUse.en}`);
    parts.push(`Example: ${desc.example.en}`);
    parts.push(`Constraints: ${desc.constraints.en}`);
  }
  return parts.join(' | ');
}
