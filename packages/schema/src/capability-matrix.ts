export type TokenValueType = 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';

export type BindableRecipeField =
  | 'fill'
  | 'stroke'
  | 'textFill'
  | 'cornerRadius'
  | 'topLeftRadius'
  | 'topRightRadius'
  | 'bottomRightRadius'
  | 'bottomLeftRadius'
  | 'paddingTop'
  | 'paddingRight'
  | 'paddingBottom'
  | 'paddingLeft'
  | 'paddingX'
  | 'paddingY'
  | 'gap'
  | 'counterGap'
  | 'width'
  | 'height'
  | 'minWidth'
  | 'maxWidth'
  | 'minHeight'
  | 'maxHeight'
  | 'strokeWeight'
  | 'opacity'
  | 'fontSize'
  | 'lineHeight'
  | 'letterSpacing'
  | 'fontFamily';

export type NonBindableRecipeField =
  | 'svgVectorGeometry'
  | 'layoutMode'
  | 'strokeAlign'
  | 'strokeDashPattern'
  | 'textAlignHorizontal'
  | 'clipsContent';

export interface BindingCapabilityEntry {
  field: BindableRecipeField | NonBindableRecipeField;
  bindable: boolean;
  supportedTypes: TokenValueType[];
  figmaApiSurface: string;
  rationale: string;
}

/**
 * Capability matrix pinned against @figma/plugin-typings@1.142.0
 * Documents every bindable property and explicit rationale for non-bindable properties.
 */
export const FIGMA_CAPABILITY_MATRIX: Record<
  BindableRecipeField | NonBindableRecipeField,
  BindingCapabilityEntry
> = {
  fill: {
    field: 'fill',
    bindable: true,
    supportedTypes: ['COLOR'],
    figmaApiSurface: 'figma.variables.setBoundVariableForPaint(paint, "color", variable)',
    rationale: 'SolidPaint color supports direct Variable binding across Light/Dark modes.',
  },
  stroke: {
    field: 'stroke',
    bindable: true,
    supportedTypes: ['COLOR'],
    figmaApiSurface: 'figma.variables.setBoundVariableForPaint(strokePaint, "color", variable)',
    rationale: 'SolidPaint stroke color supports direct Variable binding.',
  },
  textFill: {
    field: 'textFill',
    bindable: true,
    supportedTypes: ['COLOR'],
    figmaApiSurface: 'figma.variables.setBoundVariableForPaint(textPaint, "color", variable)',
    rationale: 'TextNode fills array supports SolidPaint color Variable binding.',
  },
  cornerRadius: {
    field: 'cornerRadius',
    bindable: true,
    supportedTypes: ['FLOAT'],
    figmaApiSurface: 'node.setBoundVariable("topLeftRadius" | "topRightRadius" | "bottomRightRadius" | "bottomLeftRadius", variable)',
    rationale: 'Binds all 4 corners on Frame/Component/Rectangle nodes.',
  },
  topLeftRadius: {
    field: 'topLeftRadius',
    bindable: true,
    supportedTypes: ['FLOAT'],
    figmaApiSurface: 'node.setBoundVariable("topLeftRadius", variable)',
    rationale: 'Individual corner radius FLOAT binding.',
  },
  topRightRadius: {
    field: 'topRightRadius',
    bindable: true,
    supportedTypes: ['FLOAT'],
    figmaApiSurface: 'node.setBoundVariable("topRightRadius", variable)',
    rationale: 'Individual corner radius FLOAT binding.',
  },
  bottomRightRadius: {
    field: 'bottomRightRadius',
    bindable: true,
    supportedTypes: ['FLOAT'],
    figmaApiSurface: 'node.setBoundVariable("bottomRightRadius", variable)',
    rationale: 'Individual corner radius FLOAT binding.',
  },
  bottomLeftRadius: {
    field: 'bottomLeftRadius',
    bindable: true,
    supportedTypes: ['FLOAT'],
    figmaApiSurface: 'node.setBoundVariable("bottomLeftRadius", variable)',
    rationale: 'Individual corner radius FLOAT binding.',
  },
  paddingTop: {
    field: 'paddingTop',
    bindable: true,
    supportedTypes: ['FLOAT'],
    figmaApiSurface: 'node.setBoundVariable("paddingTop", variable)',
    rationale: 'Auto Layout paddingTop FLOAT binding.',
  },
  paddingRight: {
    field: 'paddingRight',
    bindable: true,
    supportedTypes: ['FLOAT'],
    figmaApiSurface: 'node.setBoundVariable("paddingRight", variable)',
    rationale: 'Auto Layout paddingRight FLOAT binding.',
  },
  paddingBottom: {
    field: 'paddingBottom',
    bindable: true,
    supportedTypes: ['FLOAT'],
    figmaApiSurface: 'node.setBoundVariable("paddingBottom", variable)',
    rationale: 'Auto Layout paddingBottom FLOAT binding.',
  },
  paddingLeft: {
    field: 'paddingLeft',
    bindable: true,
    supportedTypes: ['FLOAT'],
    figmaApiSurface: 'node.setBoundVariable("paddingLeft", variable)',
    rationale: 'Auto Layout paddingLeft FLOAT binding.',
  },
  paddingX: {
    field: 'paddingX',
    bindable: true,
    supportedTypes: ['FLOAT'],
    figmaApiSurface: 'node.setBoundVariable("paddingLeft" & "paddingRight", variable)',
    rationale: 'Shorthand binding horizontal Auto Layout padding.',
  },
  paddingY: {
    field: 'paddingY',
    bindable: true,
    supportedTypes: ['FLOAT'],
    figmaApiSurface: 'node.setBoundVariable("paddingTop" & "paddingBottom", variable)',
    rationale: 'Shorthand binding vertical Auto Layout padding.',
  },
  gap: {
    field: 'gap',
    bindable: true,
    supportedTypes: ['FLOAT'],
    figmaApiSurface: 'node.setBoundVariable("itemSpacing", variable)',
    rationale: 'Auto Layout itemSpacing FLOAT binding.',
  },
  counterGap: {
    field: 'counterGap',
    bindable: true,
    supportedTypes: ['FLOAT'],
    figmaApiSurface: 'node.setBoundVariable("counterAxisSpacing", variable)',
    rationale: 'Auto Layout wrap counterAxisSpacing FLOAT binding.',
  },
  width: {
    field: 'width',
    bindable: true,
    supportedTypes: ['FLOAT'],
    figmaApiSurface: 'node.setBoundVariable("width", variable)',
    rationale: 'Fixed dimension width FLOAT binding.',
  },
  height: {
    field: 'height',
    bindable: true,
    supportedTypes: ['FLOAT'],
    figmaApiSurface: 'node.setBoundVariable("height", variable)',
    rationale: 'Fixed dimension height FLOAT binding.',
  },
  minWidth: {
    field: 'minWidth',
    bindable: true,
    supportedTypes: ['FLOAT'],
    figmaApiSurface: 'node.setBoundVariable("minWidth", variable)',
    rationale: 'Auto Layout minWidth FLOAT binding.',
  },
  maxWidth: {
    field: 'maxWidth',
    bindable: true,
    supportedTypes: ['FLOAT'],
    figmaApiSurface: 'node.setBoundVariable("maxWidth", variable)',
    rationale: 'Auto Layout maxWidth FLOAT binding.',
  },
  minHeight: {
    field: 'minHeight',
    bindable: true,
    supportedTypes: ['FLOAT'],
    figmaApiSurface: 'node.setBoundVariable("minHeight", variable)',
    rationale: 'Auto Layout minHeight FLOAT binding.',
  },
  maxHeight: {
    field: 'maxHeight',
    bindable: true,
    supportedTypes: ['FLOAT'],
    figmaApiSurface: 'node.setBoundVariable("maxHeight", variable)',
    rationale: 'Auto Layout maxHeight FLOAT binding.',
  },
  strokeWeight: {
    field: 'strokeWeight',
    bindable: true,
    supportedTypes: ['FLOAT'],
    figmaApiSurface: 'node.setBoundVariable("strokeWeight", variable)',
    rationale: 'Border thickness FLOAT binding.',
  },
  opacity: {
    field: 'opacity',
    bindable: true,
    supportedTypes: ['FLOAT'],
    figmaApiSurface: 'node.setBoundVariable("opacity", variable)',
    rationale: 'Layer opacity FLOAT binding (0..1 or 0..100 normalized per Figma API).',
  },
  fontSize: {
    field: 'fontSize',
    bindable: true,
    supportedTypes: ['FLOAT'],
    figmaApiSurface: 'textNode.setBoundVariable("fontSize", variable)',
    rationale: 'TextNode and TextStyle fontSize FLOAT binding.',
  },
  lineHeight: {
    field: 'lineHeight',
    bindable: true,
    supportedTypes: ['FLOAT'],
    figmaApiSurface: 'textNode.setBoundVariable("lineHeight", variable)',
    rationale: 'TextNode and TextStyle pixel lineHeight FLOAT binding.',
  },
  letterSpacing: {
    field: 'letterSpacing',
    bindable: true,
    supportedTypes: ['FLOAT'],
    figmaApiSurface: 'textNode.setBoundVariable("letterSpacing", variable)',
    rationale: 'TextNode letterSpacing FLOAT binding.',
  },
  fontFamily: {
    field: 'fontFamily',
    bindable: true,
    supportedTypes: ['STRING'],
    figmaApiSurface: 'textNode.setBoundVariable("fontFamily", variable)',
    rationale: 'TextNode fontFamily STRING binding when target font family+style is loaded.',
  },
  svgVectorGeometry: {
    field: 'svgVectorGeometry',
    bindable: false,
    supportedTypes: [],
    figmaApiSurface: 'figma.createNodeFromSvg / VectorNode.vectorPaths',
    rationale: 'Figma Variables cannot parameterize Bezier vector path geometry; icon stroke/fill colors remain Variable-bound.',
  },
  layoutMode: {
    field: 'layoutMode',
    bindable: false,
    supportedTypes: [],
    figmaApiSurface: 'frame.layoutMode ("HORIZONTAL" | "VERTICAL" | "NONE")',
    rationale: 'Auto Layout direction enum cannot be bound to Figma Variables; handled via Component Variants when orientation changes.',
  },
  strokeAlign: {
    field: 'strokeAlign',
    bindable: false,
    supportedTypes: [],
    figmaApiSurface: 'node.strokeAlign ("INSIDE" | "OUTSIDE" | "CENTER")',
    rationale: 'Stroke alignment enum is structural and cannot be bound to Figma Variables.',
  },
  strokeDashPattern: {
    field: 'strokeDashPattern',
    bindable: false,
    supportedTypes: [],
    figmaApiSurface: 'node.dashPattern',
    rationale: 'Dash array tuple is not a VariableBindableNodeField in Figma Plugin API 1.142.0.',
  },
  textAlignHorizontal: {
    field: 'textAlignHorizontal',
    bindable: false,
    supportedTypes: [],
    figmaApiSurface: 'textNode.textAlignHorizontal',
    rationale: 'Text horizontal alignment enum is structural and not Variable-bindable.',
  },
  clipsContent: {
    field: 'clipsContent',
    bindable: false,
    supportedTypes: [],
    figmaApiSurface: 'frame.clipsContent',
    rationale: 'Overflow clipping boolean is structural and not Variable-bindable.',
  },
};
