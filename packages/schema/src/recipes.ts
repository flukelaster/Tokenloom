import { z } from 'zod';
import { HttpUrlSchema, LocalizedTextSchema, type LocalizedText } from './tokens';

export const ComponentTierSchema = z.enum([
  'helper',
  'technical-slice',
  'core',
  'extended',
  'advanced',
]);
export type ComponentTier = z.infer<typeof ComponentTierSchema>;

export const ComponentPropertySpecSchema = z.object({
  logicalKey: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['TEXT', 'BOOLEAN', 'INSTANCE_SWAP']),
  defaultValue: z.union([z.string(), z.boolean()]),
  localizedDefaultText: LocalizedTextSchema.optional(),
  preferredInstanceLogicalIds: z.array(z.string()).optional(),
  description: LocalizedTextSchema,
});
export type ComponentPropertySpec = z.infer<typeof ComponentPropertySpecSchema>;

export const VariantAxisSpecSchema = z.object({
  name: z.string().min(1),
  values: z.array(z.string().min(1)).min(1),
  defaultValue: z.string().min(1),
  description: LocalizedTextSchema,
});
export type VariantAxisSpec = z.infer<typeof VariantAxisSpecSchema>;

export const NodeBindingsSchema = z.object({
  fill: z.string().optional(),
  stroke: z.string().optional(),
  textFill: z.string().optional(),
  cornerRadius: z.string().optional(),
  topLeftRadius: z.string().optional(),
  topRightRadius: z.string().optional(),
  bottomRightRadius: z.string().optional(),
  bottomLeftRadius: z.string().optional(),
  paddingTop: z.string().optional(),
  paddingRight: z.string().optional(),
  paddingBottom: z.string().optional(),
  paddingLeft: z.string().optional(),
  paddingX: z.string().optional(),
  paddingY: z.string().optional(),
  gap: z.string().optional(),
  counterGap: z.string().optional(),
  width: z.string().optional(),
  height: z.string().optional(),
  minWidth: z.string().optional(),
  maxWidth: z.string().optional(),
  minHeight: z.string().optional(),
  maxHeight: z.string().optional(),
  strokeWeight: z.string().optional(),
  opacity: z.string().optional(),
  fontSize: z.string().optional(),
  lineHeight: z.string().optional(),
  letterSpacing: z.string().optional(),
  fontFamily: z.string().optional(),
});
export type NodeBindings = z.infer<typeof NodeBindingsSchema>;

export const PropertyReferenceMapSchema = z.object({
  characters: z.string().optional(),
  visible: z.string().optional(),
  mainComponent: z.string().optional(),
});
export type PropertyReferenceMap = z.infer<typeof PropertyReferenceMapSchema>;

export const NonBindableExceptionSchema = z.object({
  nodeId: z.string().min(1),
  field: z.enum([
    'svgVectorGeometry',
    'layoutMode',
    'strokeAlign',
    'strokeDashPattern',
    'textAlignHorizontal',
    'clipsContent',
  ]),
  reason: LocalizedTextSchema,
});
export type NonBindableException = z.infer<typeof NonBindableExceptionSchema>;

export interface RecipeNodeSpec {
  id: string;
  name: string;
  kind: 'frame' | 'text' | 'rectangle' | 'ellipse' | 'icon-vector' | 'component-instance';
  visible?: boolean;
  layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
  primaryAxisSizingMode?: 'FIXED' | 'AUTO';
  counterAxisSizingMode?: 'FIXED' | 'AUTO';
  primaryAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
  counterAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'BASELINE';
  layoutAlign?: 'INHERIT' | 'STRETCH';
  layoutGrow?: number;
  clipsContent?: boolean;
  width?: number;
  height?: number;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  itemSpacing?: number;
  cornerRadius?: number;
  strokeWeight?: number;
  strokeAlign?: 'INSIDE' | 'OUTSIDE' | 'CENTER';
  opacity?: number;
  transparentFill?: boolean;
  bindings?: NodeBindings;
  textStyleLogicalId?: string;
  effectStyleLogicalId?: string;
  characters?: LocalizedText | string;
  fontWeight?: 'Regular' | 'Medium' | 'SemiBold' | 'Bold';
  fontSize?: number;
  lineHeightPx?: number;
  textAlignHorizontal?: 'LEFT' | 'CENTER' | 'RIGHT';
  svgContent?: string;
  componentLogicalId?: string;
  variantCriteria?: Record<string, string>;
  instancePropertyOverrides?: Record<string, string | boolean>;
  propertyRef?: PropertyReferenceMap;
  children?: RecipeNodeSpec[];
}

export const RecipeNodeSpecSchema: z.ZodType<RecipeNodeSpec> = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    kind: z.enum([
      'frame',
      'text',
      'rectangle',
      'ellipse',
      'icon-vector',
      'component-instance',
    ]),
    visible: z.boolean().optional(),
    layoutMode: z.enum(['NONE', 'HORIZONTAL', 'VERTICAL']).optional(),
    primaryAxisSizingMode: z.enum(['FIXED', 'AUTO']).optional(),
    counterAxisSizingMode: z.enum(['FIXED', 'AUTO']).optional(),
    primaryAxisAlignItems: z.enum(['MIN', 'CENTER', 'MAX', 'SPACE_BETWEEN']).optional(),
    counterAxisAlignItems: z.enum(['MIN', 'CENTER', 'MAX', 'BASELINE']).optional(),
    layoutAlign: z.enum(['INHERIT', 'STRETCH']).optional(),
    layoutGrow: z.number().min(0).optional(),
    clipsContent: z.boolean().optional(),
    width: z.number().positive().optional(),
    height: z.number().positive().optional(),
    minWidth: z.number().min(0).optional(),
    maxWidth: z.number().positive().optional(),
    minHeight: z.number().min(0).optional(),
    maxHeight: z.number().positive().optional(),
    paddingTop: z.number().min(0).optional(),
    paddingRight: z.number().min(0).optional(),
    paddingBottom: z.number().min(0).optional(),
    paddingLeft: z.number().min(0).optional(),
    itemSpacing: z.number().min(0).optional(),
    cornerRadius: z.number().min(0).optional(),
    strokeWeight: z.number().min(0).optional(),
    strokeAlign: z.enum(['INSIDE', 'OUTSIDE', 'CENTER']).optional(),
    opacity: z.number().min(0).max(1).optional(),
    transparentFill: z.boolean().optional(),
    bindings: NodeBindingsSchema.optional(),
    textStyleLogicalId: z.string().optional(),
    effectStyleLogicalId: z.string().optional(),
    characters: z.union([LocalizedTextSchema, z.string()]).optional(),
    fontWeight: z.enum(['Regular', 'Medium', 'SemiBold', 'Bold']).optional(),
    fontSize: z.number().positive().optional(),
    lineHeightPx: z.number().positive().optional(),
    textAlignHorizontal: z.enum(['LEFT', 'CENTER', 'RIGHT']).optional(),
    svgContent: z.string().optional(),
    componentLogicalId: z.string().optional(),
    variantCriteria: z.record(z.string()).optional(),
    instancePropertyOverrides: z.record(z.union([z.string(), z.boolean()])).optional(),
    propertyRef: PropertyReferenceMapSchema.optional(),
    children: z.array(RecipeNodeSpecSchema).optional(),
  }),
);

export const NodePatchSchema = z.object({
  visible: z.boolean().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  minWidth: z.number().min(0).optional(),
  minHeight: z.number().min(0).optional(),
  paddingTop: z.number().min(0).optional(),
  paddingRight: z.number().min(0).optional(),
  paddingBottom: z.number().min(0).optional(),
  paddingLeft: z.number().min(0).optional(),
  itemSpacing: z.number().min(0).optional(),
  cornerRadius: z.number().min(0).optional(),
  strokeWeight: z.number().min(0).optional(),
  opacity: z.number().min(0).max(1).optional(),
  transparentFill: z.boolean().optional(),
  primaryAxisAlignItems: z.enum(['MIN', 'CENTER', 'MAX', 'SPACE_BETWEEN']).optional(),
  counterAxisAlignItems: z.enum(['MIN', 'CENTER', 'MAX', 'BASELINE']).optional(),
  bindings: NodeBindingsSchema.optional(),
  clearBindings: z.array(z.string()).optional(),
  textStyleLogicalId: z.string().optional(),
  effectStyleLogicalId: z.string().nullable().optional(),
  characters: z.union([LocalizedTextSchema, z.string()]).optional(),
  fontWeight: z.enum(['Regular', 'Medium', 'SemiBold', 'Bold']).optional(),
  fontSize: z.number().positive().optional(),
  lineHeightPx: z.number().positive().optional(),
});
export type NodePatch = z.infer<typeof NodePatchSchema>;

export const VariantOverrideRuleSchema = z.object({
  match: z.record(z.string()),
  nodePatches: z.record(NodePatchSchema),
});
export type VariantOverrideRule = z.infer<typeof VariantOverrideRuleSchema>;

export const ContrastPairSpecSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  foregroundTokenId: z.string().min(1),
  backgroundTokenId: z.string().min(1),
  minRatio: z.number().positive(),
  isLargeTextOrUiControl: z.boolean().optional(),
});
export type ContrastPairSpec = z.infer<typeof ContrastPairSpecSchema>;

export const ComponentDocumentationSchema = z.object({
  purpose: LocalizedTextSchema,
  usageScenarios: z.array(LocalizedTextSchema).min(1),
  whenNotToUse: z.array(LocalizedTextSchema).min(1),
  anatomy: z
    .array(
      z.object({
        nodeId: z.string().min(1),
        partName: LocalizedTextSchema,
        roleDescription: LocalizedTextSchema,
        required: z.boolean(),
      }),
    )
    .min(1),
  stateMatrix: z
    .array(
      z.object({
        state: z.string().min(1),
        visualSummary: LocalizedTextSchema,
        runtimeNote: LocalizedTextSchema,
      }),
    )
    .min(1),
  examples: z
    .array(
      z.object({
        id: z.string().min(1),
        title: LocalizedTextSchema,
        description: LocalizedTextSchema,
        variantProps: z.record(z.string()),
        componentProps: z.record(z.union([z.string(), z.boolean()])).optional(),
      }),
    )
    .min(1),
  doAndDont: z
    .array(
      z.object({
        kind: z.enum(['do', 'dont']),
        title: LocalizedTextSchema,
        rationale: LocalizedTextSchema,
        exampleVariantProps: z.record(z.string()).optional(),
      }),
    )
    .min(2),
  accessibility: z.object({
    labelGuidance: LocalizedTextSchema,
    contrastNotes: LocalizedTextSchema,
    focusVisibility: LocalizedTextSchema,
    keyboardExpectations: LocalizedTextSchema,
  }),
  responsiveGuidance: LocalizedTextSchema,
  contentGuidelines: z.object({
    en: z.string().min(1),
    th: z.string().min(1),
  }),
  sourceLinks: z
    .array(
      z.object({
        label: z.string().min(1),
        url: HttpUrlSchema,
      }),
    )
    .min(1),
  differencesFromSource: z.array(LocalizedTextSchema).min(1),
});
export type ComponentDocumentation = z.infer<typeof ComponentDocumentationSchema>;

export const ComponentRecipeSchema = z.object({
  logicalId: z.string().min(1),
  name: z.string().min(1),
  displayName: LocalizedTextSchema,
  tier: ComponentTierSchema,
  pageOrder: z.number().int().min(0),
  dependencies: z.array(z.string()),
  properties: z.array(ComponentPropertySpecSchema),
  variantAxes: z.array(VariantAxisSpecSchema),
  excludeVariantMatches: z.array(z.record(z.string())).optional(),
  baseNode: RecipeNodeSpecSchema,
  variantOverrides: z.array(VariantOverrideRuleSchema),
  nonBindableExceptions: z.array(NonBindableExceptionSchema),
  contrastPairs: z.array(ContrastPairSpecSchema),
  documentation: ComponentDocumentationSchema.optional(),
});
export type ComponentRecipe = z.infer<typeof ComponentRecipeSchema>;

export const PatternRecipeSchema = z.object({
  logicalId: z.string().min(1),
  name: LocalizedTextSchema,
  description: LocalizedTextSchema,
  requiredComponents: z.array(z.string()).min(1),
  rootNode: RecipeNodeSpecSchema,
});
export type PatternRecipe = z.infer<typeof PatternRecipeSchema>;
