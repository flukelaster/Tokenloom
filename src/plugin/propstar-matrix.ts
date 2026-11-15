import type { ComponentPropertySpec, VariantAxisSpec } from '@schema';
import type { CompiledComponentPlan } from '@engine';
import type { FontManager } from './fonts';

export interface PropstarAxisDescriptor {
  kind: 'boolean' | 'variant';
  key: string;
  name: string;
  values: string[];
  boolValues?: boolean[];
  figmaPropKey?: string;
}

export interface PropstarAxisPlan {
  xAxes: PropstarAxisDescriptor[];
  yAxes: PropstarAxisDescriptor[];
  xBoolAxes: PropstarAxisDescriptor[];
  yBoolAxes: PropstarAxisDescriptor[];
  xVarAxes: PropstarAxisDescriptor[];
  yVarAxes: PropstarAxisDescriptor[];
}

export interface PropstarMatrixParams {
  compPlan: CompiledComponentPlan;
  stage: FrameNode;
  ownerNode: ComponentSetNode | ComponentNode;
  variantsByKey: ReadonlyMap<string, ComponentNode>;
  propKeyMap: ReadonlyMap<string, string>;
  fontManager: FontManager;
  locale: 'en' | 'th';
  createdNodeIds: string[];
}

export interface PropstarMatrixMetrics {
  stageWidth: number;
  stageHeight: number;
  gridOriginX: number;
  gridOriginY: number;
  cellWidth: number;
  cellHeight: number;
  totalRows: number;
  totalCols: number;
  variantRows: number;
  variantCols: number;
  booleanInstanceCount: number;
}

interface AxisCoordinateTuple {
  labelsByLevel: string[];
  variantMap: Record<string, string>;
  boolOverrides: Record<string, boolean>;
  isAllDefaultBooleans: boolean;
}

interface HeaderSpanRun {
  level: number;
  label: string;
  startIndex: number;
  endIndex: number;
  spanCount: number;
}

const PROPSTAR_GRID_LAYER_NAME = '_Propstar Grid & Axis Labels';
const PROPSTAR_BOOL_LAYER_NAME = '_Boolean Permutations';

const MAX_BOOLEAN_MATRIX_PROPS = 2;
const STAGE_PAD_TOP = 40;
const STAGE_PAD_LEFT = 40;
const STAGE_PAD_RIGHT = 48;
const STAGE_PAD_BOTTOM = 48;

const CELL_PAD_X = 48;
const CELL_PAD_Y = 44;
const MIN_CELL_WIDTH = 136;
const MIN_CELL_HEIGHT = 80;

// Propstar signature purple palette (readable across both Light #FFFFFF and Dark #09090B surfaces)
const PURPLE_LABEL_RGB = { r: 0.482, g: 0.38, b: 1.0 }; // #7B61FF
const PURPLE_BRACKET_RGB = { r: 0.541, g: 0.22, b: 0.961 }; // #8A38F5
const PURPLE_GRID_RGB = { r: 0.592, g: 0.278, b: 1.0 }; // #9747FF

const AMBIGUOUS_VARIANT_VALUES = new Set([
  'true',
  'false',
  'yes',
  'no',
  'on',
  'off',
  '1',
  '2',
  '3',
  'first',
  'second',
  'third',
]);

const PREFIXED_AXIS_NAMES = new Set(['Padding', 'Tone', 'ActiveTab']);

export function formatVariantAxisValueLabel(axisName: string, value: string): string {
  if (PREFIXED_AXIS_NAMES.has(axisName) || AMBIGUOUS_VARIANT_VALUES.has(value.trim().toLowerCase())) {
    return `${axisName}: ${value}`;
  }
  return value;
}

/**
 * Partitions a component's Variant Axes and Boolean Component Properties into
 * Propstar's signature 2D hierarchical matrix:
 * - Quadrant (0, 0) ALWAYS corresponds to all-default Boolean values so the native
 *   `ComponentSetNode` / `ComponentNode` occupies the top-left quadrant seamlessly.
 * - Outer axes represent Boolean permutations (`Prop: False` / `Prop: True`), while
 *   inner axes represent Variant axes (`Variant > State` on Y, `Size` on X).
 */
export function planPropstarAxes(
  variantAxes: ReadonlyArray<VariantAxisSpec>,
  properties: ReadonlyArray<ComponentPropertySpec>,
  propKeyMap: ReadonlyMap<string, string>,
  estimatedBaseWidth = 120,
): PropstarAxisPlan {
  // 1. Partition Variant Axes into Y (rows) and X (columns)
  let xVarRaw: VariantAxisSpec[] = [];
  let yVarRaw: VariantAxisSpec[] = [];

  if (variantAxes.length === 1) {
    yVarRaw = [variantAxes[0]];
    xVarRaw = [];
  } else if (variantAxes.length >= 2) {
    const sizeAxis = variantAxes.find((a) => a.name.toLowerCase() === 'size');
    let chosenX: VariantAxisSpec;
    if (sizeAxis) {
      chosenX = sizeAxis;
    } else if (variantAxes[variantAxes.length - 1].name.toLowerCase() === 'state') {
      chosenX = variantAxes[0];
    } else {
      chosenX = variantAxes[variantAxes.length - 1];
    }
    xVarRaw = [chosenX];
    const remaining = variantAxes.filter((a) => a !== chosenX);
    // Keep 'State' as the innermost Y axis (adjacent to grid cells, matching Propstar)
    const nonState = remaining.filter((a) => a.name.toLowerCase() !== 'state');
    const stateOnly = remaining.filter((a) => a.name.toLowerCase() === 'state');
    yVarRaw = [...nonState, ...stateOnly];
  }

  const toVarDescriptor = (ax: VariantAxisSpec): PropstarAxisDescriptor => ({
    kind: 'variant',
    key: ax.name,
    name: ax.name,
    values: [...ax.values],
  });

  const xVarAxes = xVarRaw.map(toVarDescriptor);
  const yVarAxes = yVarRaw.map(toVarDescriptor);

  // 2. Collect active Boolean Component Properties (up to 2 -> at most 2x2 = 4 quadrants)
  const boolSpecs = properties
    .filter((p) => p.type === 'BOOLEAN' && propKeyMap.has(p.logicalKey))
    .slice(0, MAX_BOOLEAN_MATRIX_PROPS);

  const boolDescriptors: PropstarAxisDescriptor[] = boolSpecs.map((spec) => {
    const defVal = Boolean(spec.defaultValue);
    const orderedBools = [defVal, !defVal];
    return {
      kind: 'boolean',
      key: spec.logicalKey,
      name: spec.name,
      boolValues: orderedBools,
      values: orderedBools.map((b) => `${spec.name}: ${b ? 'True' : 'False'}`),
      figmaPropKey: propKeyMap.get(spec.logicalKey)!,
    };
  });

  let yBoolAxes: PropstarAxisDescriptor[] = [];
  let xBoolAxes: PropstarAxisDescriptor[] = [];

  if (boolDescriptors.length === 1) {
    // Keep wide surface dialogs (>= 340px) compact horizontally when they already have an X variant axis
    if (estimatedBaseWidth >= 340 && xVarAxes.length > 0) {
      yBoolAxes = [boolDescriptors[0]];
    } else {
      xBoolAxes = [boolDescriptors[0]];
    }
  } else if (boolDescriptors.length >= 2) {
    // Matches Propstar's 2-boolean split: first boolean on Outer Y, second boolean on Outer X
    yBoolAxes = [boolDescriptors[0]];
    xBoolAxes = [boolDescriptors[1]];
  }

  return {
    xAxes: [...xBoolAxes, ...xVarAxes],
    yAxes: [...yBoolAxes, ...yVarAxes],
    xBoolAxes,
    yBoolAxes,
    xVarAxes,
    yVarAxes,
  };
}

function expandAxisTuples(axes: ReadonlyArray<PropstarAxisDescriptor>): AxisCoordinateTuple[] {
  if (axes.length === 0) {
    return [
      {
        labelsByLevel: [],
        variantMap: {},
        boolOverrides: {},
        isAllDefaultBooleans: true,
      },
    ];
  }

  let acc: AxisCoordinateTuple[] = [
    {
      labelsByLevel: [],
      variantMap: {},
      boolOverrides: {},
      isAllDefaultBooleans: true,
    },
  ];

  for (const axis of axes) {
    const next: AxisCoordinateTuple[] = [];
    for (const prefix of acc) {
      for (let i = 0; i < axis.values.length; i++) {
        const rawVal = axis.values[i];
        if (axis.kind === 'boolean') {
          const boolVal = axis.boolValues![i];
          const nextBoolOverrides = { ...prefix.boolOverrides };
          if (axis.figmaPropKey) {
            nextBoolOverrides[axis.figmaPropKey] = boolVal;
          }
          next.push({
            labelsByLevel: [...prefix.labelsByLevel, rawVal],
            variantMap: { ...prefix.variantMap },
            boolOverrides: nextBoolOverrides,
            // Index 0 of every boolean axis is always its defaultValue!
            isAllDefaultBooleans: prefix.isAllDefaultBooleans && i === 0,
          });
        } else {
          next.push({
            labelsByLevel: [
              ...prefix.labelsByLevel,
              formatVariantAxisValueLabel(axis.name, rawVal),
            ],
            variantMap: { ...prefix.variantMap, [axis.name]: rawVal },
            boolOverrides: { ...prefix.boolOverrides },
            isAllDefaultBooleans: prefix.isAllDefaultBooleans,
          });
        }
      }
    }
    acc = next;
  }

  return acc;
}

function computeContiguousRuns(
  tuples: ReadonlyArray<AxisCoordinateTuple>,
  levelCount: number,
): HeaderSpanRun[][] {
  const runsByLevel: HeaderSpanRun[][] = [];

  for (let level = 0; level < levelCount; level++) {
    const levelRuns: HeaderSpanRun[] = [];
    let idx = 0;
    while (idx < tuples.length) {
      const currentLabel = tuples[idx].labelsByLevel[level];
      let endIdx = idx;
      while (endIdx + 1 < tuples.length) {
        // Two adjacent tuples belong to the same header group at `level` iff
        // they share identical labels at `0 .. level`!
        let samePrefix = true;
        for (let k = 0; k <= level; k++) {
          if (tuples[endIdx + 1].labelsByLevel[k] !== tuples[idx].labelsByLevel[k]) {
            samePrefix = false;
            break;
          }
        }
        if (!samePrefix) break;
        endIdx += 1;
      }
      levelRuns.push({
        level,
        label: currentLabel,
        startIndex: idx,
        endIndex: endIdx,
        spanCount: endIdx - idx + 1,
      });
      idx = endIdx + 1;
    }
    runsByLevel.push(levelRuns);
  }

  return runsByLevel;
}

function resizeExact(node: SceneNode, width: number, height: number): void {
  const safeW = Math.max(1, Math.round(width));
  const safeH = Math.max(1, Math.round(height));
  const candidate = node as SceneNode & {
    resizeWithoutConstraints?: (w: number, h: number) => void;
    resize?: (w: number, h: number) => void;
  };
  if (typeof candidate.resizeWithoutConstraints === 'function') {
    candidate.resizeWithoutConstraints(safeW, safeH);
  } else if (typeof candidate.resize === 'function') {
    candidate.resize(safeW, safeH);
  }
}

function setSideStrokes(
  rect: RectangleNode,
  weights: { top: number; right: number; bottom: number; left: number },
): void {
  rect.strokeAlign = 'INSIDE';
  rect.strokeWeight = 1;
  try {
    rect.strokeTopWeight = weights.top;
    rect.strokeRightWeight = weights.right;
    rect.strokeBottomWeight = weights.bottom;
    rect.strokeLeftWeight = weights.left;
  } catch {
    // Fallback if host mock omits individual side stroke weights
  }
}

function createHorizontalBracket(x: number, y: number, width: number, height = 8): RectangleNode {
  const rect = figma.createRectangle();
  rect.name = 'Axis Group Bracket (X)';
  rect.fills = [];
  rect.strokes = [{ type: 'SOLID', color: PURPLE_BRACKET_RGB, opacity: 0.85 }];
  setSideStrokes(rect, { top: 1, right: 1, bottom: 0, left: 1 });
  try {
    rect.topLeftRadius = 2;
    rect.topRightRadius = 2;
    rect.bottomLeftRadius = 0;
    rect.bottomRightRadius = 0;
  } catch {
    rect.cornerRadius = 2;
  }
  resizeExact(rect, Math.max(12, width), height);
  rect.x = Math.round(x);
  rect.y = Math.round(y);
  return rect;
}

function createVerticalBracket(x: number, y: number, height: number, width = 8): RectangleNode {
  const rect = figma.createRectangle();
  rect.name = 'Axis Group Bracket (Y)';
  rect.fills = [];
  rect.strokes = [{ type: 'SOLID', color: PURPLE_BRACKET_RGB, opacity: 0.85 }];
  setSideStrokes(rect, { top: 1, right: 0, bottom: 1, left: 1 });
  try {
    rect.topLeftRadius = 2;
    rect.bottomLeftRadius = 2;
    rect.topRightRadius = 0;
    rect.bottomRightRadius = 0;
  } catch {
    rect.cornerRadius = 2;
  }
  resizeExact(rect, width, Math.max(12, height));
  rect.x = Math.round(x);
  rect.y = Math.round(y);
  return rect;
}

async function createPropstarAxisLabel(
  textValue: string,
  fontName: FontName,
  align: 'CENTER' | 'RIGHT',
): Promise<TextNode> {
  const label = figma.createText();
  label.name = `Label · ${textValue}`;
  label.fontName = fontName;
  label.fontSize = 11;
  label.lineHeight = { unit: 'PIXELS', value: 16 };
  label.textAutoResize = 'WIDTH_AND_HEIGHT';
  label.textAlignHorizontal = align;
  label.fills = [{ type: 'SOLID', color: PURPLE_LABEL_RGB, opacity: 0.95 }];
  label.characters = textValue;
  return label;
}

/**
 * Arranges a Main Component or ComponentSet inside `stage` as a Propstar-style
 * Embedded 2D Property Matrix:
 * 1. Locked `_Propstar Grid & Axis Labels` backdrop with dashed purple cell lines,
 *    hierarchical purple group brackets, and X/Y property labels.
 * 2. `_Boolean Permutations` layer holding live linked `InstanceNode`s for non-default
 *    Boolean property combinations.
 * 3. Topmost native `ComponentSetNode` / `ComponentNode` (`layoutMode = 'NONE'`,
 *    `clipsContent = false`) with variants centered in their exact 2D grid cells.
 */
export async function arrangePropstarComponentMatrix(
  params: PropstarMatrixParams,
): Promise<PropstarMatrixMetrics> {
  const { compPlan, stage, ownerNode, variantsByKey, propKeyMap, fontManager } = params;

  // 1. Clean up any previous grid/header/boolean-instance layers inside `stage` while preserving `ownerNode`!
  for (const child of [...stage.children]) {
    if (child.id !== ownerNode.id) {
      child.remove();
    }
  }

  const labelFont = await fontManager.loadFontWithFallback('Inter', 'Medium', 'sans');

  const estimatedBaseWidth = compPlan.recipe.baseNode.width ?? 120;
  const axisPlan = planPropstarAxes(
    compPlan.recipe.variantAxes,
    compPlan.recipe.properties,
    propKeyMap,
    estimatedBaseWidth,
  );

  const rowTuples = expandAxisTuples(axisPlan.yAxes);
  const colTuples = expandAxisTuples(axisPlan.xAxes);
  const totalRows = rowTuples.length;
  const totalCols = colTuples.length;

  const variantRowTuples = expandAxisTuples(axisPlan.yVarAxes);
  const variantColTuples = expandAxisTuples(axisPlan.xVarAxes);
  const variantRows = variantRowTuples.length;
  const variantCols = variantColTuples.length;

  const xRunsByLevel = computeContiguousRuns(colTuples, axisPlan.xAxes.length);
  const yRunsByLevel = computeContiguousRuns(rowTuples, axisPlan.yAxes.length);

  // 2. Prepare decorative grid layer (bottom) & boolean permutations layer (middle)
  const gridLayer = figma.createFrame();
  gridLayer.name = PROPSTAR_GRID_LAYER_NAME;
  gridLayer.layoutMode = 'NONE';
  gridLayer.clipsContent = false;
  gridLayer.fills = [];
  gridLayer.strokes = [];

  const boolLayer = figma.createFrame();
  boolLayer.name = PROPSTAR_BOOL_LAYER_NAME;
  boolLayer.layoutMode = 'NONE';
  boolLayer.clipsContent = false;
  boolLayer.fills = [];
  boolLayer.strokes = [];

  // 3. Pre-create X and Y label TextNodes so we can measure exact text widths & heights
  const xLabelNodes: TextNode[][] = [];
  for (let level = 0; level < xRunsByLevel.length; level++) {
    const levelNodes: TextNode[] = [];
    for (const run of xRunsByLevel[level]) {
      const txt = await createPropstarAxisLabel(run.label, labelFont, 'CENTER');
      gridLayer.appendChild(txt);
      levelNodes.push(txt);
    }
    xLabelNodes.push(levelNodes);
  }

  const yLabelNodes: TextNode[][] = [];
  for (let level = 0; level < yRunsByLevel.length; level++) {
    const levelNodes: TextNode[] = [];
    for (const run of yRunsByLevel[level]) {
      const txt = await createPropstarAxisLabel(run.label, labelFont, 'RIGHT');
      gridLayer.appendChild(txt);
      levelNodes.push(txt);
    }
    yLabelNodes.push(levelNodes);
  }

  // 4. Resolve each (row, col) cell to either a native ComponentNode (top-left default quadrant)
  //    or a live linked InstanceNode (Boolean permutation quadrants), and measure true max cell bounds!
  const canonicalVariantKeyFor = (variantMap: Record<string, string>): string => {
    if (compPlan.recipe.variantAxes.length === 0) {
      return compPlan.recipe.name;
    }
    return compPlan.recipe.variantAxes
      .map((ax) => `${ax.name}=${variantMap[ax.name] ?? ax.defaultValue}`)
      .join(', ');
  };

  interface PlacedBooleanCell {
    row: number;
    col: number;
    instance: InstanceNode;
  }
  interface PlacedNativeVariantCell {
    row: number;
    col: number;
    comp: ComponentNode;
  }

  const placedNativeCells: PlacedNativeVariantCell[] = [];
  const placedNativeSet = new Set<string>();
  const placedBooleanCells: PlacedBooleanCell[] = [];

  let maxItemWidth = 48;
  let maxItemHeight = 28;

  for (let r = 0; r < totalRows; r++) {
    const rTuple = rowTuples[r];
    for (let c = 0; c < totalCols; c++) {
      const cTuple = colTuples[c];
      const mergedVariants: Record<string, string> = {
        ...rTuple.variantMap,
        ...cTuple.variantMap,
      };
      const vKey = canonicalVariantKeyFor(mergedVariants);
      const variantComp =
        compPlan.recipe.variantAxes.length === 0
          ? (ownerNode as ComponentNode)
          : variantsByKey.get(vKey);

      // Excluded combinations (e.g. Button Small+Pressed) remain clean empty cells in the grid!
      if (!variantComp) {
        continue;
      }

      const isNativeQuadrant = rTuple.isAllDefaultBooleans && cTuple.isAllDefaultBooleans;
      if (isNativeQuadrant) {
        if (ownerNode.type === 'COMPONENT_SET') {
          placedNativeCells.push({ row: r, col: c, comp: variantComp });
          placedNativeSet.add(variantComp.id);
        }
        maxItemWidth = Math.max(maxItemWidth, Math.ceil(variantComp.width));
        maxItemHeight = Math.max(maxItemHeight, Math.ceil(variantComp.height));
      } else {
        const inst = variantComp.createInstance();
        const combinedBoolOverrides: Record<string, boolean> = {
          ...rTuple.boolOverrides,
          ...cTuple.boolOverrides,
        };
        inst.name = `${variantComp.name} · ${Object.entries(combinedBoolOverrides)
          .map(([k, v]) => `${k.split('#')[0]}=${v ? 'True' : 'False'}`)
          .join(', ')}`;
        if (Object.keys(combinedBoolOverrides).length > 0) {
          try {
            inst.setProperties(combinedBoolOverrides);
          } catch {
            // Safe fallback if host restricts property override
          }
        }
        boolLayer.appendChild(inst);
        placedBooleanCells.push({ row: r, col: c, instance: inst });
        maxItemWidth = Math.max(maxItemWidth, Math.ceil(inst.width));
        maxItemHeight = Math.max(maxItemHeight, Math.ceil(inst.height));
      }
    }
  }

  // Compute uniform cellWidth & cellHeight that fit the largest item AND all X/Y header spans without clipping or overlap
  let cellWidth = Math.max(MIN_CELL_WIDTH, maxItemWidth + CELL_PAD_X);
  let cellHeight = Math.max(MIN_CELL_HEIGHT, maxItemHeight + CELL_PAD_Y);

  for (let level = 0; level < xRunsByLevel.length; level++) {
    const runs = xRunsByLevel[level];
    const nodes = xLabelNodes[level];
    for (let i = 0; i < runs.length; i++) {
      const minSpanWidth = Math.ceil(nodes[i].width) + 28;
      const minColWidth = Math.ceil(minSpanWidth / runs[i].spanCount);
      cellWidth = Math.max(cellWidth, minColWidth);
    }
  }

  for (let level = 0; level < yRunsByLevel.length; level++) {
    const runs = yRunsByLevel[level];
    const nodes = yLabelNodes[level];
    for (let i = 0; i < runs.length; i++) {
      const minSpanHeight = Math.ceil(nodes[i].height) + 18;
      const minRowHeight = Math.ceil(minSpanHeight / runs[i].spanCount);
      cellHeight = Math.max(cellHeight, minRowHeight);
    }
  }

  // 5. Compute Y-axis header column positions -> determines `gridOriginX`
  let cursorX = STAGE_PAD_LEFT;
  const yLevelRightEdges: number[] = [];
  const yLevelBracketX: Array<number | null> = [];

  for (let level = 0; level < yRunsByLevel.length; level++) {
    const nodes = yLabelNodes[level];
    let maxLabelWidth = 36;
    for (const n of nodes) {
      maxLabelWidth = Math.max(maxLabelWidth, Math.ceil(n.width));
    }
    const labelRightEdge = cursorX + maxLabelWidth;
    yLevelRightEdges.push(labelRightEdge);

    const hasBracket = level < yRunsByLevel.length - 1;
    if (hasBracket) {
      const bracketX = labelRightEdge + 10;
      yLevelBracketX.push(bracketX);
      cursorX = bracketX + 8 + 16;
    } else {
      yLevelBracketX.push(null);
      cursorX = labelRightEdge + 14;
    }
  }
  const gridOriginX = yRunsByLevel.length > 0 ? cursorX : STAGE_PAD_LEFT;

  // 6. Compute X-axis header row positions -> determines `gridOriginY`
  let cursorY = STAGE_PAD_TOP;
  const xLevelLabelY: number[] = [];
  const xLevelBracketY: Array<number | null> = [];

  for (let level = 0; level < xRunsByLevel.length; level++) {
    const nodes = xLabelNodes[level];
    let maxLabelHeight = 16;
    for (const n of nodes) {
      maxLabelHeight = Math.max(maxLabelHeight, Math.ceil(n.height));
    }
    xLevelLabelY.push(cursorY);

    const hasBracket = level < xRunsByLevel.length - 1;
    if (hasBracket) {
      const bracketY = cursorY + maxLabelHeight + 5;
      xLevelBracketY.push(bracketY);
      cursorY = bracketY + 8 + 8;
    } else {
      xLevelBracketY.push(null);
      cursorY = cursorY + maxLabelHeight + 10;
    }
  }
  const gridOriginY = xRunsByLevel.length > 0 ? cursorY : STAGE_PAD_TOP;

  // Check if any preserved [DEPRECATED] variants exist inside `ownerNode` so we reserve space cleanly
  const deprecatedVariants: ComponentNode[] = [];
  if (ownerNode.type === 'COMPONENT_SET') {
    for (const child of ownerNode.children) {
      if (child.type === 'COMPONENT' && !placedNativeSet.has(child.id)) {
        deprecatedVariants.push(child);
      }
    }
  }
  const extraDeprecatedRows =
    deprecatedVariants.length > 0 ? Math.ceil(deprecatedVariants.length / Math.max(1, variantCols)) : 0;

  const gridWidth = totalCols * cellWidth;
  const gridHeight = totalRows * cellHeight;
  const nativeBoxWidth = variantCols * cellWidth;
  const nativeBoxHeight = (variantRows + extraDeprecatedRows) * cellHeight;

  const stageWidth = gridOriginX + gridWidth + STAGE_PAD_RIGHT;
  const stageHeight =
    gridOriginY + Math.max(gridHeight, nativeBoxHeight) + STAGE_PAD_BOTTOM;

  // 7. Position X-axis labels & horizontal group brackets inside `gridLayer`
  for (let level = 0; level < xRunsByLevel.length; level++) {
    const runs = xRunsByLevel[level];
    const nodes = xLabelNodes[level];
    const labelY = xLevelLabelY[level];
    const bracketY = xLevelBracketY[level];

    for (let i = 0; i < runs.length; i++) {
      const run = runs[i];
      const txt = nodes[i];
      const spanX = gridOriginX + run.startIndex * cellWidth;
      const spanW = run.spanCount * cellWidth;
      txt.x = Math.round(spanX + (spanW - txt.width) / 2);
      txt.y = Math.round(labelY);

      if (bracketY !== null) {
        const inset = 6;
        const bracket = createHorizontalBracket(
          spanX + inset,
          bracketY,
          spanW - inset * 2,
          8,
        );
        gridLayer.appendChild(bracket);
      }
    }
  }

  // 8. Position Y-axis labels & vertical group brackets inside `gridLayer`
  for (let level = 0; level < yRunsByLevel.length; level++) {
    const runs = yRunsByLevel[level];
    const nodes = yLabelNodes[level];
    const rightEdge = yLevelRightEdges[level];
    const bracketX = yLevelBracketX[level];

    for (let i = 0; i < runs.length; i++) {
      const run = runs[i];
      const txt = nodes[i];
      const spanY = gridOriginY + run.startIndex * cellHeight;
      const spanH = run.spanCount * cellHeight;
      txt.x = Math.round(rightEdge - txt.width);
      txt.y = Math.round(spanY + (spanH - txt.height) / 2);

      if (bracketX !== null) {
        const inset = 8;
        const bracket = createVerticalBracket(
          bracketX,
          spanY + inset,
          spanH - inset * 2,
          8,
        );
        gridLayer.appendChild(bracket);
      }
    }
  }

  // 9. Draw unified Propstar outer dashed border + internal cell grid lines inside `gridLayer`
  const outerBorder = figma.createRectangle();
  outerBorder.name = 'Matrix Outer Border';
  outerBorder.fills = [];
  outerBorder.strokes = [{ type: 'SOLID', color: PURPLE_GRID_RGB, opacity: 0.65 }];
  outerBorder.strokeWeight = 1;
  outerBorder.strokeAlign = 'INSIDE';
  outerBorder.cornerRadius = 5;
  try {
    outerBorder.dashPattern = [8, 5];
  } catch {
    // Ignore if host omits dash pattern
  }
  resizeExact(outerBorder, gridWidth, gridHeight);
  outerBorder.x = gridOriginX;
  outerBorder.y = gridOriginY;
  gridLayer.appendChild(outerBorder);

  for (let c = 1; c < totalCols; c++) {
    const vLine = figma.createRectangle();
    vLine.name = `Col Divider ${c}`;
    vLine.fills = [];
    vLine.strokes = [{ type: 'SOLID', color: PURPLE_GRID_RGB, opacity: 0.42 }];
    setSideStrokes(vLine, { top: 0, right: 0, bottom: 0, left: 1 });
    try {
      vLine.dashPattern = [5, 5];
    } catch {
      // Ignore if host omits dash pattern
    }
    resizeExact(vLine, 1, gridHeight);
    vLine.x = gridOriginX + c * cellWidth;
    vLine.y = gridOriginY;
    gridLayer.appendChild(vLine);
  }

  for (let r = 1; r < totalRows; r++) {
    const hLine = figma.createRectangle();
    hLine.name = `Row Divider ${r}`;
    hLine.fills = [];
    hLine.strokes = [{ type: 'SOLID', color: PURPLE_GRID_RGB, opacity: 0.42 }];
    setSideStrokes(hLine, { top: 1, right: 0, bottom: 0, left: 0 });
    try {
      hLine.dashPattern = [5, 5];
    } catch {
      // Ignore if host omits dash pattern
    }
    resizeExact(hLine, gridWidth, 1);
    hLine.x = gridOriginX;
    hLine.y = gridOriginY + r * cellHeight;
    gridLayer.appendChild(hLine);
  }

  // 10. Assemble Z-order inside unclipped `stage`:
  //     Bottom: locked `_Propstar Grid & Axis Labels`
  //     Middle: `_Boolean Permutations` (if any boolean permutations exist)
  //     Top:    `ownerNode` (native `ComponentSetNode` or standalone `ComponentNode`)
  stage.layoutMode = 'NONE';
  stage.clipsContent = false;
  resizeExact(stage, stageWidth, stageHeight);

  resizeExact(gridLayer, stageWidth, stageHeight);
  gridLayer.x = 0;
  gridLayer.y = 0;
  try {
    gridLayer.locked = true;
  } catch {
    // Ignore if host mock omits locked property
  }
  stage.appendChild(gridLayer);
  params.createdNodeIds.push(gridLayer.id);

  if (placedBooleanCells.length > 0) {
    resizeExact(boolLayer, gridWidth, gridHeight);
    boolLayer.x = gridOriginX;
    boolLayer.y = gridOriginY;
    for (const item of placedBooleanCells) {
      item.instance.x =
        item.col * cellWidth + Math.round((cellWidth - item.instance.width) / 2);
      item.instance.y =
        item.row * cellHeight + Math.round((cellHeight - item.instance.height) / 2);
    }
    stage.appendChild(boolLayer);
    params.createdNodeIds.push(boolLayer.id);
  } else {
    boolLayer.remove();
  }

  // Configure and position `ownerNode` LAST so it sits on top in z-order and never clips!
  stage.appendChild(ownerNode);
  if (ownerNode.type === 'COMPONENT_SET') {
    ownerNode.layoutMode = 'NONE';
    ownerNode.clipsContent = false;
    ownerNode.fills = [];
    ownerNode.strokes = [];
    ownerNode.strokeWeight = 0;
    // Resize BEFORE positioning child variants so constraints never shift child coordinates!
    resizeExact(ownerNode, nativeBoxWidth, nativeBoxHeight);
    ownerNode.x = gridOriginX;
    ownerNode.y = gridOriginY;

    for (const cell of placedNativeCells) {
      cell.comp.x = cell.col * cellWidth + Math.round((cellWidth - cell.comp.width) / 2);
      cell.comp.y = cell.row * cellHeight + Math.round((cellHeight - cell.comp.height) / 2);
    }

    for (let i = 0; i < deprecatedVariants.length; i++) {
      const dep = deprecatedVariants[i];
      const depCol = i % Math.max(1, variantCols);
      const depRow = variantRows + Math.floor(i / Math.max(1, variantCols));
      dep.x = depCol * cellWidth + Math.round((cellWidth - dep.width) / 2);
      dep.y = depRow * cellHeight + Math.round((cellHeight - dep.height) / 2);
    }
  } else {
    // Standalone non-helper ComponentNode: center directly inside cell (0, 0)
    ownerNode.clipsContent = false;
    ownerNode.x = gridOriginX + Math.round((cellWidth - ownerNode.width) / 2);
    ownerNode.y = gridOriginY + Math.round((cellHeight - ownerNode.height) / 2);
  }

  return {
    stageWidth,
    stageHeight,
    gridOriginX,
    gridOriginY,
    cellWidth,
    cellHeight,
    totalRows,
    totalCols,
    variantRows,
    variantCols,
    booleanInstanceCount: placedBooleanCells.length,
  };
}
