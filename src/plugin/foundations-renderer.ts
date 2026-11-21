import {
  GENERATOR_VERSION,
  SCHEMA_VERSION,
  type ManagedObjectRecord,
  type TextStyleDefinition,
  type TokenDefinition,
} from '@schema';
import { resolveTokenInMode, sanitizeFigmaVariableName } from '@engine';
import {
  applyNodeVariableBindings,
  createSolidBoundPaint,
  type ComponentRenderContext,
} from './components-engine';
import { getNodeManagedMeta, setNodeManagedMeta } from './storage';

export const FOUNDATIONS_SHEET_WIDTH = 1160;
const SHEET_PADDING_X = 48;
const SHEET_PADDING_Y = 44;
const SHEET_CONTENT_WIDTH = FOUNDATIONS_SHEET_WIDTH - SHEET_PADDING_X * 2; // 1064
const SIDEBAR_WIDTH = 235;
const DIVIDER_THICKNESS = 1;
const TABLE_MAIN_WIDTH = SHEET_CONTENT_WIDTH - SIDEBAR_WIDTH - DIVIDER_THICKNESS; // 828
const TABLE_ROW_PAD_X = 20;

// Three-column layout inside 828px right table (788px inner width = 316 + 16 + 200 + 16 + 240)
const COL3_GAP = 16;
const COL3_NAME_W = 316;
const COL3_VALUE_W = 200;
const COL3_CODE_W = 240;

// Four-column layout for Semantic Light/Dark table (788px inner width = 246 + 14 + 165 + 14 + 165 + 14 + 170)
const COL4_GAP = 14;
const COL4_NAME_W = 246;
const COL4_LIGHT_W = 165;
const COL4_DARK_W = 165;
const COL4_CODE_W = 170;

// Full-width Text Styles table inside 1064px card (24px side padding -> 1016px inner = 216 + 24 + 492 + 24 + 260)
const SPECIMEN_PAD_X = 24;
const SPECIMEN_GAP = 24;
const SPECIMEN_STYLE_W = 216;
const SPECIMEN_SAMPLE_W = 492;
const SPECIMEN_SPEC_W = 260;

const SVG_LAYERS =
  '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 2L14 5.25L8 8.5L2 5.25L8 2Z" stroke="#18181B" stroke-width="1.35" stroke-linejoin="round"/><path d="M2 8.75L8 12L14 8.75" stroke="#18181B" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 12L8 15.25L14 12" stroke="#18181B" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const SVG_FOLDER =
  '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 4.5C2 3.94772 2.44772 3.5 3 3.5H6.17157C6.43679 3.5 6.69114 3.60536 6.87868 3.79289L7.70711 4.62132C7.89464 4.80886 8.149 4.91421 8.41421 4.91421H13C13.5523 4.91421 14 5.36193 14 5.91421V11.5C14 12.0523 13.5523 12.5 13 12.5H3C2.44772 12.5 2 12.0523 2 11.5V4.5Z" stroke="#71717A" stroke-width="1.3" stroke-linejoin="round"/></svg>';

const SVG_COLOR_VAR =
  '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="8" r="5.75" stroke="#71717A" stroke-width="1.3"/><path d="M8 2.25C4.82436 2.25 2.25 4.82436 2.25 8C2.25 11.1756 4.82436 13.75 8 13.75V2.25Z" fill="#71717A"/></svg>';

const SVG_STRING_VAR =
  '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3.5 3.5H12.5M8 3.5V12.5M6 12.5H10" stroke="#71717A" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const SVG_FLOAT_VAR =
  '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 6H13M3 10H13M6.5 2.75L5.25 13.25M10.75 2.75L9.5 13.25" stroke="#71717A" stroke-width="1.35" stroke-linecap="round"/></svg>';

interface TokenFolderGroup {
  folderName: string;
  tokens: TokenDefinition[];
}

function markStretch(node: SceneNode): void {
  if ('layoutAlign' in node) {
    node.layoutAlign = 'STRETCH';
  }
  try {
    node.setPluginData('ds_forge:stretch', '1');
  } catch {
    // Ignore if pluginData restricted
  }
}

function markGrow(node: SceneNode, grow = 1): void {
  if ('layoutGrow' in node) {
    node.layoutGrow = grow;
  }
  try {
    node.setPluginData('ds_forge:grow', String(grow));
  } catch {
    // Ignore if pluginData restricted
  }
}

/**
 * Re-applies stretch & grow rules top-down after all children are attached into their
 * parent Auto Layout hierarchy, respecting whether parent & child share layout axis.
 */
export function finalizeFoundationsAutoLayout(container: FrameNode): void {
  const walk = (node: SceneNode, parentLayoutMode: FrameNode['layoutMode']) => {
    let shouldStretch = 'layoutAlign' in node && node.layoutAlign === 'STRETCH';
    let growVal = 'layoutGrow' in node && typeof node.layoutGrow === 'number' ? node.layoutGrow : 0;

    try {
      if (!shouldStretch) {
        shouldStretch = node.getPluginData('ds_forge:stretch') === '1';
      }
      const storedGrow = Number(node.getPluginData('ds_forge:grow') || '0');
      if (storedGrow > 0) growVal = storedGrow;
    } catch {
      // Safe fallback
    }

    if (shouldStretch && 'layoutAlign' in node) {
      try {
        node.layoutAlign = 'STRETCH';
        if (node.type === 'FRAME' && node.layoutMode !== 'NONE') {
          if (parentLayoutMode === 'VERTICAL' && node.layoutMode === 'VERTICAL') {
            node.primaryAxisSizingMode = 'AUTO';
          } else if (parentLayoutMode === 'VERTICAL' && node.layoutMode === 'HORIZONTAL') {
            node.counterAxisSizingMode = 'AUTO';
          } else if (parentLayoutMode === 'HORIZONTAL' && node.layoutMode === 'HORIZONTAL') {
            node.primaryAxisSizingMode = 'AUTO';
          }
        }
        if (node.type === 'TEXT') {
          node.textAutoResize = 'HEIGHT';
        }
      } catch {
        // Safe fallback
      }
    }

    if (growVal > 0 && 'layoutGrow' in node) {
      try {
        node.layoutGrow = growVal;
        if (node.type === 'TEXT') {
          node.textAutoResize = 'HEIGHT';
        }
      } catch {
        // Safe fallback
      }
    }

    if ('children' in node && node.type !== 'INSTANCE') {
      const nextMode = node.type === 'FRAME' ? node.layoutMode : 'NONE';
      for (const child of node.children) {
        walk(child, nextMode);
      }
    }
  };

  for (const child of container.children) {
    walk(child, container.layoutMode);
  }
}

function createAutoContainer(
  name: string,
  direction: 'VERTICAL' | 'HORIZONTAL',
  spacing: number,
  padY = 0,
  padX = 0,
): FrameNode {
  const frame = figma.createFrame();
  frame.name = name;
  frame.clipsContent = false;
  frame.layoutMode = direction;
  frame.primaryAxisSizingMode = 'AUTO';
  frame.counterAxisSizingMode = 'AUTO';
  frame.itemSpacing = spacing;
  frame.paddingTop = padY;
  frame.paddingBottom = padY;
  frame.paddingLeft = padX;
  frame.paddingRight = padX;
  frame.fills = [];
  return frame;
}

function createFixedColumn(
  name: string,
  width: number,
  direction: 'VERTICAL' | 'HORIZONTAL',
  spacing = 8,
): FrameNode {
  const col = figma.createFrame();
  col.name = name;
  col.clipsContent = false;
  col.resize(width, 20);
  col.layoutMode = direction;
  if (direction === 'HORIZONTAL') {
    col.primaryAxisSizingMode = 'FIXED';
    col.counterAxisSizingMode = 'AUTO';
    col.counterAxisAlignItems = 'CENTER';
  } else {
    col.primaryAxisSizingMode = 'AUTO';
    col.counterAxisSizingMode = 'FIXED';
  }
  col.itemSpacing = spacing;
  col.fills = [];
  return col;
}

function createDocSvgIcon(
  name: string,
  svg: string,
  size: number,
  colorTokenId: string,
  ctx: ComponentRenderContext,
): FrameNode {
  const svgFrame = figma.createNodeFromSvg(svg);
  svgFrame.name = name;
  svgFrame.clipsContent = false;
  svgFrame.resize(size, size);
  svgFrame.fills = [];

  const colorVar = ctx.tokensCtx.variablesByLogicalId.get(colorTokenId);
  if (colorVar) {
    const boundPaint = createSolidBoundPaint(colorVar, '#71717A');
    const applyPaint = (n: SceneNode) => {
      if (n !== svgFrame) {
        const hasStrokes = 'strokes' in n && Array.isArray(n.strokes) && n.strokes.length > 0;
        if (hasStrokes) {
          n.strokes = [boundPaint];
        } else if ('fills' in n && Array.isArray(n.fills) && n.fills.length > 0) {
          n.fills = [boundPaint];
        }
      }
      if ('children' in n) {
        for (const c of n.children) applyPaint(c);
      }
    };
    applyPaint(svgFrame);
  }
  return svgFrame;
}

async function createSpecText(
  ctx: ComponentRenderContext,
  content: string,
  opts?: {
    weight?: 'Regular' | 'Medium' | 'SemiBold' | 'Bold';
    size?: number;
    lineHeight?: number;
    letterSpacingPx?: number;
    colorTokenId?: string;
    mono?: boolean;
    stretch?: boolean;
    grow?: boolean;
  },
): Promise<TextNode> {
  const text = figma.createText();
  const locale = ctx.plan.config.locale;
  const role = opts?.mono ? 'mono' : locale === 'th' ? 'thai' : 'sans';
  const family = opts?.mono
    ? ctx.plan.activeFontPreset.monoFamily
    : locale === 'th'
      ? ctx.plan.activeFontPreset.thaiFallbackFamily
      : ctx.plan.activeFontPreset.sansFamily;

  const fontName = await ctx.fontManager.loadFontWithFallback(
    family,
    opts?.weight ?? 'Regular',
    role,
  );
  text.fontName = fontName;
  const fontSize = opts?.size ?? 12;
  text.fontSize = fontSize;
  text.lineHeight = {
    unit: 'PIXELS',
    value: opts?.lineHeight ?? Math.round(fontSize * 1.45),
  };
  if (opts?.letterSpacingPx !== undefined) {
    text.letterSpacing = { unit: 'PIXELS', value: opts.letterSpacingPx };
  }
  text.characters = content;
  applyNodeVariableBindings(
    text,
    { textFill: opts?.colorTokenId ?? 'semantic.text.primary' },
    ctx.tokensCtx,
  );
  if (opts?.stretch) {
    text.textAutoResize = 'HEIGHT';
    markStretch(text);
  }
  if (opts?.grow) {
    text.textAutoResize = 'HEIGHT';
    markGrow(text, 1);
  }
  return text;
}

function createHorizontalDivider(width: number, ctx: ComponentRenderContext): FrameNode {
  const div = figma.createFrame();
  div.name = 'Divider';
  div.clipsContent = false;
  div.resize(width, DIVIDER_THICKNESS);
  markStretch(div);
  applyNodeVariableBindings(div, { fill: 'semantic.border.default' }, ctx.tokensCtx);
  return div;
}

function createVerticalDivider(ctx: ComponentRenderContext): FrameNode {
  const div = figma.createFrame();
  div.name = 'Sidebar Divider';
  div.clipsContent = false;
  div.resize(DIVIDER_THICKNESS, 80);
  markStretch(div);
  applyNodeVariableBindings(div, { fill: 'semantic.border.default' }, ctx.tokensCtx);
  return div;
}

async function createHeaderModePill(
  ctx: ComponentRenderContext,
  label: string,
  variant: 'accent' | 'neutral',
): Promise<FrameNode> {
  const pill = createAutoContainer(`Badge · ${label}`, 'HORIZONTAL', 4, 3, 10);
  pill.cornerRadius = 999;
  applyNodeVariableBindings(
    pill,
    { fill: variant === 'accent' ? 'semantic.feedback.info.subtle' : 'semantic.surface.muted' },
    ctx.tokensCtx,
  );
  pill.appendChild(
    await createSpecText(ctx, label, {
      weight: 'Bold',
      size: 10,
      lineHeight: 14,
      letterSpacingPx: 0.5,
      colorTokenId: variant === 'accent' ? 'semantic.action.primary.bg' : 'semantic.text.primary',
    }),
  );
  return pill;
}

async function createSpecChip(
  ctx: ComponentRenderContext,
  label: string,
  muted = false,
): Promise<FrameNode> {
  const chip = createAutoContainer(`Spec · ${label}`, 'HORIZONTAL', 4, 2, 7);
  chip.cornerRadius = 4;
  applyNodeVariableBindings(chip, { fill: 'semantic.surface.muted' }, ctx.tokensCtx);
  chip.appendChild(
    await createSpecText(ctx, label, {
      weight: 'Regular',
      size: 11,
      lineHeight: 16,
      mono: true,
      colorTokenId: muted ? 'semantic.text.muted' : 'semantic.text.primary',
    }),
  );
  return chip;
}

function getOrResetSheetRootFrame(
  page: PageNode,
  logicalId: string,
  name: string,
  y: number,
  ctx: ComponentRenderContext,
  objectKind: ManagedObjectRecord['objectKind'] = 'docs-section',
): FrameNode {
  let frame: FrameNode | undefined;
  for (const child of page.children) {
    if (child.type === 'FRAME') {
      const meta = getNodeManagedMeta(child);
      if (meta?.systemInstanceId === ctx.systemInstanceId && meta?.logicalId === logicalId) {
        frame = child;
        break;
      }
    }
  }

  if (!frame) {
    frame = figma.createFrame();
    page.appendChild(frame);
    ctx.journal.createdNodeIds.push(frame.id);
  } else {
    while (frame.children.length > 0) {
      frame.children[0].remove();
    }
  }

  frame.x = 80;
  frame.y = y;
  frame.name = name;
  frame.clipsContent = false;
  frame.resize(FOUNDATIONS_SHEET_WIDTH, 200);
  frame.layoutMode = 'VERTICAL';
  frame.primaryAxisSizingMode = 'AUTO';
  frame.counterAxisSizingMode = 'FIXED';
  frame.paddingTop = SHEET_PADDING_Y;
  frame.paddingBottom = SHEET_PADDING_Y + 4;
  frame.paddingLeft = SHEET_PADDING_X;
  frame.paddingRight = SHEET_PADDING_X;
  frame.itemSpacing = 28;
  frame.cornerRadius = 16;
  frame.strokeWeight = 1;
  applyNodeVariableBindings(
    frame,
    { fill: 'semantic.surface.background', stroke: 'semantic.border.default' },
    ctx.tokensCtx,
  );

  const hash = `${logicalId}:${ctx.plan.library.packageVersion}:${ctx.plan.config.locale}`;
  setNodeManagedMeta(frame, {
    systemInstanceId: ctx.systemInstanceId,
    libraryId: ctx.plan.library.libraryId,
    logicalId,
    objectKind,
    schemaVersion: SCHEMA_VERSION,
    packageVersion: ctx.plan.library.packageVersion,
    generatorVersion: GENERATOR_VERSION,
    lastGeneratedHash: hash,
  });

  ctx.recordObject({
    logicalId,
    figmaId: frame.id,
    objectKind,
    displayName: frame.name,
    lastGeneratedHash: hash,
    managedFields: { name: frame.name },
  });

  return frame;
}

async function createSheetHeader(
  ctx: ComponentRenderContext,
  eyebrow: string,
  title: string,
  subtitle: string,
): Promise<FrameNode> {
  const header = createAutoContainer('Sheet Header', 'VERTICAL', 8, 0, 0);
  header.resize(SHEET_CONTENT_WIDTH, 60);
  header.layoutMode = 'VERTICAL';
  header.primaryAxisSizingMode = 'AUTO';
  header.counterAxisSizingMode = 'FIXED';
  markStretch(header);

  header.appendChild(
    await createSpecText(ctx, eyebrow.toUpperCase(), {
      weight: 'Bold',
      size: 11,
      lineHeight: 16,
      letterSpacingPx: 0.6,
      colorTokenId: 'semantic.action.primary.bg',
      stretch: true,
    }),
  );
  header.appendChild(
    await createSpecText(ctx, title, {
      weight: 'Bold',
      size: 28,
      lineHeight: 36,
      letterSpacingPx: -0.4,
      colorTokenId: 'semantic.text.primary',
      stretch: true,
    }),
  );
  header.appendChild(
    await createSpecText(ctx, subtitle, {
      weight: 'Regular',
      size: 13,
      lineHeight: 20,
      colorTokenId: 'semantic.text.muted',
      stretch: true,
    }),
  );

  return header;
}

async function createVariablesSplitTableCard(
  ctx: ComponentRenderContext,
  sidebarTitle: string,
  groups: TokenFolderGroup[],
  sidebarFootnote: string,
  populateMainTable: (tableFrame: FrameNode) => Promise<void>,
): Promise<FrameNode> {
  const card = figma.createFrame();
  card.name = `Variables Table · ${sidebarTitle}`;
  card.clipsContent = false;
  card.resize(SHEET_CONTENT_WIDTH, 160);
  card.layoutMode = 'HORIZONTAL';
  card.primaryAxisSizingMode = 'FIXED';
  card.counterAxisSizingMode = 'AUTO';
  card.itemSpacing = 0;
  card.cornerRadius = 12;
  card.strokeWeight = 1;
  markStretch(card);
  applyNodeVariableBindings(
    card,
    { fill: 'semantic.surface.card', stroke: 'semantic.border.default' },
    ctx.tokensCtx,
  );

  // 1. Left Sidebar (235px fixed width, stretched height)
  const sidebar = figma.createFrame();
  sidebar.name = 'Collection Sidebar';
  sidebar.clipsContent = false;
  sidebar.resize(SIDEBAR_WIDTH, 120);
  sidebar.layoutMode = 'VERTICAL';
  sidebar.primaryAxisSizingMode = 'AUTO';
  sidebar.counterAxisSizingMode = 'FIXED';
  sidebar.paddingTop = 18;
  sidebar.paddingBottom = 20;
  sidebar.paddingLeft = 16;
  sidebar.paddingRight = 16;
  sidebar.itemSpacing = 12;
  sidebar.topLeftRadius = 12;
  sidebar.bottomLeftRadius = 12;
  markStretch(sidebar);
  applyNodeVariableBindings(sidebar, { fill: 'semantic.surface.card' }, ctx.tokensCtx);

  const colHeaderRow = createAutoContainer('Collection Title', 'HORIZONTAL', 8, 2, 4);
  colHeaderRow.counterAxisAlignItems = 'CENTER';
  colHeaderRow.appendChild(
    createDocSvgIcon('Layers Icon', SVG_LAYERS, 14, 'semantic.text.primary', ctx),
  );
  colHeaderRow.appendChild(
    await createSpecText(ctx, sidebarTitle, {
      weight: 'SemiBold',
      size: 13,
      lineHeight: 18,
      colorTokenId: 'semantic.text.primary',
    }),
  );
  sidebar.appendChild(colHeaderRow);

  const folderList = createAutoContainer('Folder Groups', 'VERTICAL', 2, 0, 0);
  folderList.resize(SIDEBAR_WIDTH - 32, 40);
  folderList.layoutMode = 'VERTICAL';
  folderList.primaryAxisSizingMode = 'AUTO';
  folderList.counterAxisSizingMode = 'FIXED';
  markStretch(folderList);

  for (const grp of groups) {
    const itemRow = figma.createFrame();
    itemRow.name = `Folder · ${grp.folderName}`;
    itemRow.clipsContent = false;
    itemRow.resize(SIDEBAR_WIDTH - 32, 28);
    itemRow.layoutMode = 'HORIZONTAL';
    itemRow.primaryAxisSizingMode = 'FIXED';
    itemRow.counterAxisSizingMode = 'AUTO';
    itemRow.primaryAxisAlignItems = 'SPACE_BETWEEN';
    itemRow.counterAxisAlignItems = 'CENTER';
    itemRow.paddingTop = 5;
    itemRow.paddingBottom = 5;
    itemRow.paddingLeft = 6;
    itemRow.paddingRight = 6;
    itemRow.cornerRadius = 6;
    itemRow.fills = [];
    markStretch(itemRow);

    const leftCluster = createAutoContainer('Label', 'HORIZONTAL', 8, 0, 0);
    leftCluster.counterAxisAlignItems = 'CENTER';
    leftCluster.appendChild(
      createDocSvgIcon('Folder Icon', SVG_FOLDER, 14, 'semantic.text.muted', ctx),
    );
    leftCluster.appendChild(
      await createSpecText(ctx, grp.folderName, {
        weight: 'Regular',
        size: 12,
        lineHeight: 17,
        mono: true,
        colorTokenId: 'semantic.text.primary',
      }),
    );

    const countText = await createSpecText(ctx, String(grp.tokens.length), {
      weight: 'Regular',
      size: 11,
      lineHeight: 16,
      mono: true,
      colorTokenId: 'semantic.text.muted',
    });

    itemRow.appendChild(leftCluster);
    itemRow.appendChild(countText);
    folderList.appendChild(itemRow);
  }
  sidebar.appendChild(folderList);

  sidebar.appendChild(createHorizontalDivider(SIDEBAR_WIDTH - 32, ctx));
  sidebar.appendChild(
    await createSpecText(ctx, sidebarFootnote, {
      weight: 'Regular',
      size: 11,
      lineHeight: 16,
      colorTokenId: 'semantic.text.muted',
      stretch: true,
    }),
  );

  // 2. Vertical 1px Divider
  const vDivider = createVerticalDivider(ctx);

  // 3. Right Main Table (828px fixed width)
  const mainTable = figma.createFrame();
  mainTable.name = 'Variables Rows';
  mainTable.clipsContent = false;
  mainTable.resize(TABLE_MAIN_WIDTH, 120);
  mainTable.layoutMode = 'VERTICAL';
  mainTable.primaryAxisSizingMode = 'AUTO';
  mainTable.counterAxisSizingMode = 'FIXED';
  mainTable.itemSpacing = 0;
  mainTable.fills = [];

  await populateMainTable(mainTable);

  card.appendChild(sidebar);
  card.appendChild(vDivider);
  card.appendChild(mainTable);
  return card;
}

async function createGroupHeaderRow(
  ctx: ComponentRenderContext,
  folderName: string,
): Promise<FrameNode> {
  const row = figma.createFrame();
  row.name = `Group · ${folderName}`;
  row.clipsContent = false;
  row.resize(TABLE_MAIN_WIDTH, 34);
  row.layoutMode = 'HORIZONTAL';
  row.primaryAxisSizingMode = 'FIXED';
  row.counterAxisSizingMode = 'AUTO';
  row.counterAxisAlignItems = 'CENTER';
  row.paddingTop = 8;
  row.paddingBottom = 8;
  row.paddingLeft = TABLE_ROW_PAD_X;
  row.paddingRight = TABLE_ROW_PAD_X;
  row.itemSpacing = 8;
  markStretch(row);
  applyNodeVariableBindings(row, { fill: 'semantic.surface.muted' }, ctx.tokensCtx);

  row.appendChild(
    createDocSvgIcon('Group Folder', SVG_FOLDER, 14, 'semantic.text.muted', ctx),
  );
  row.appendChild(
    await createSpecText(ctx, folderName, {
      weight: 'SemiBold',
      size: 12,
      lineHeight: 17,
      mono: true,
      colorTokenId: 'semantic.text.primary',
    }),
  );
  return row;
}

function stripCleanPrefix(rawName: string, cleanPrefix: string): string {
  if (cleanPrefix && rawName.startsWith(`${cleanPrefix}/`)) {
    return rawName.slice(cleanPrefix.length + 1);
  }
  return rawName;
}

function groupPrimitiveColorTokens(
  tokens: TokenDefinition[],
  cleanPrefix: string,
): TokenFolderGroup[] {
  const byFolder = new Map<string, TokenDefinition[]>();
  for (const tok of tokens) {
    let rel = stripCleanPrefix(tok.name, cleanPrefix);
    if (rel.startsWith('color/')) {
      rel = rel.slice('color/'.length);
    }
    const parts = rel.split('/');
    const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : 'palette';
    if (!byFolder.has(folder)) byFolder.set(folder, []);
    byFolder.get(folder)!.push(tok);
  }

  const preferredOrder = [
    'brand',
    'zinc',
    'neutral',
    'grey',
    'gray',
    'slate',
    'red',
    'green',
    'amber',
    'blue',
    'overlay',
  ];

  const orderedFolders = [...byFolder.keys()].sort((a, b) => {
    const idxA = preferredOrder.indexOf(a);
    const idxB = preferredOrder.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  // Sort numeric shades descending (950 -> 50) within each ramp, matching reference design systems
  return orderedFolders.map((folderName) => {
    const list = [...byFolder.get(folderName)!];
    list.sort((a, b) => {
      const leafA = a.name.split('/').pop() ?? '';
      const leafB = b.name.split('/').pop() ?? '';
      const numA = /^\d+$/.test(leafA) ? Number(leafA) : null;
      const numB = /^\d+$/.test(leafB) ? Number(leafB) : null;
      if (numA !== null && numB !== null) return numB - numA;
      if (numA !== null) return -1;
      if (numB !== null) return 1;
      return 0;
    });
    return { folderName, tokens: list };
  });
}

function groupSemanticColorTokens(
  tokens: TokenDefinition[],
  cleanPrefix: string,
): TokenFolderGroup[] {
  const byFolder = new Map<string, TokenDefinition[]>();
  for (const tok of tokens) {
    const rel = stripCleanPrefix(tok.name, cleanPrefix);
    const parts = rel.split('/');
    const folder = parts.length > 1 ? parts[0] : 'semantic';
    if (!byFolder.has(folder)) byFolder.set(folder, []);
    byFolder.get(folder)!.push(tok);
  }
  return [...byFolder.entries()].map(([folderName, list]) => ({
    folderName,
    tokens: list,
  }));
}

function groupTypographyTokens(
  tokens: TokenDefinition[],
  cleanPrefix: string,
): TokenFolderGroup[] {
  const normalizeFolder = (rawFolder: string): string => {
    if (rawFolder === 'font-family' || rawFolder === 'family') return 'font/family';
    if (rawFolder === 'font-weight' || rawFolder === 'weight') return 'font/weight';
    if (rawFolder === 'font-size' || rawFolder === 'size') return 'font/size';
    if (rawFolder === 'line-height' || rawFolder === 'leading') return 'font/line-height';
    return rawFolder;
  };

  const byFolder = new Map<string, TokenDefinition[]>();
  for (const tok of tokens) {
    let rel = stripCleanPrefix(tok.name, cleanPrefix);
    if (rel.startsWith('typography/')) {
      rel = rel.slice('typography/'.length);
    }
    const parts = rel.split('/');
    const rawFolder = parts.length > 1 ? parts.slice(0, -1).join('/') : 'font';
    const folder = normalizeFolder(rawFolder);
    if (!byFolder.has(folder)) byFolder.set(folder, []);
    byFolder.get(folder)!.push(tok);
  }

  const preferred = ['font/family', 'font/weight', 'font/size', 'font/line-height'];
  const orderedFolders = [...byFolder.keys()].sort((a, b) => {
    const idxA = preferred.indexOf(a);
    const idxB = preferred.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  return orderedFolders.map((folderName) => {
    const list = [...byFolder.get(folderName)!];
    list.sort((a, b) => {
      const valA = a.valuesByMode.Base;
      const valB = b.valuesByMode.Base;
      if (valA?.kind === 'float' && valB?.kind === 'float') {
        return valA.value - valB.value;
      }
      return 0;
    });
    return { folderName, tokens: list };
  });
}

function groupDimensionScaleTokens(
  tokens: TokenDefinition[],
  cleanPrefix: string,
): TokenFolderGroup[] {
  const byFolder = new Map<string, TokenDefinition[]>();
  for (const tok of tokens) {
    const rel = stripCleanPrefix(tok.name, cleanPrefix);
    const parts = rel.split('/');
    const folder = parts.length > 1 ? parts[0] : tok.category;
    if (!byFolder.has(folder)) byFolder.set(folder, []);
    byFolder.get(folder)!.push(tok);
  }
  return [...byFolder.entries()].map(([folderName, list]) => ({
    folderName,
    tokens: list,
  }));
}

function formatHexWithOptionalOpacity(hex: string, opacity?: number): string {
  const upper = hex.toUpperCase();
  if (opacity !== undefined && opacity < 0.999) {
    return `${upper} · ${Math.round(opacity * 100)}%`;
  }
  return upper;
}

function formatShortAliasTarget(
  targetLogicalId: string,
  tokenMap: ReadonlyMap<string, TokenDefinition>,
  cleanPrefix: string,
): string {
  const target = tokenMap.get(targetLogicalId);
  if (!target) return targetLogicalId;
  let rel = stripCleanPrefix(target.name, cleanPrefix);
  if (rel.startsWith('color/')) {
    rel = rel.slice('color/'.length);
  }
  return rel;
}

async function renderPrimitivesColorSheet(
  page: PageNode,
  startY: number,
  ctx: ComponentRenderContext,
  cleanPrefix: string,
): Promise<FrameNode> {
  const locale = ctx.plan.config.locale;
  const primColors = ctx.plan.tokens.filter(
    (t) => t.collection === 'primitives' && t.type === 'COLOR',
  );
  const groups = groupPrimitiveColorTokens(primColors, cleanPrefix);

  const sheet = getOrResetSheetRootFrame(
    page,
    'docs.foundations.colors.primitives',
    `${ctx.plan.config.namespace} · Colors — Primitives`,
    startY,
    ctx,
  );

  const groupSummary = groups.map((g) => g.folderName).join(', ');
  const activeHex = ctx.plan.config.strictFidelity
    ? ctx.plan.library.defaultBrandHex.toUpperCase()
    : ctx.plan.config.brandHex.toUpperCase();

  sheet.appendChild(
    await createSheetHeader(
      ctx,
      `VARIABLES · COLLECTION "${ctx.plan.collections.primitivesName}"`,
      'Primitives — Color Scales',
      locale === 'th'
        ? `สเกลสีพื้นฐาน (${groupSummary}) รวม ${primColors.length} ตัวแปร • Brand Primary ${activeHex} — แต่ละ token ผูกกับ Variable จริงและพร้อมให้ Semantic tokens อ้างอิง`
        : `Raw tonal color ramps (${groupSummary}) across ${primColors.length} variables • Brand Primary ${activeHex} — bound to live Figma Variables as the source of Semantic tokens.`,
    ),
  );

  const sidebarNote =
    locale === 'th'
      ? `ค่าสีดิบจาก ${ctx.plan.library.displayName} (Base mode) — ใช้เป็นต้นทางของ Semantic tokens`
      : `Raw palette values from ${ctx.plan.library.displayName} (Base mode) — referenced by Semantic tokens.`;

  const tableCard = await createVariablesSplitTableCard(
    ctx,
    'Primitives',
    groups,
    sidebarNote,
    async (mainTable) => {
      // Header Row: NAME | [VALUE] | CODE
      const hdr = figma.createFrame();
      hdr.name = 'Table Header';
      hdr.clipsContent = false;
      hdr.resize(TABLE_MAIN_WIDTH, 40);
      hdr.layoutMode = 'HORIZONTAL';
      hdr.primaryAxisSizingMode = 'FIXED';
      hdr.counterAxisSizingMode = 'AUTO';
      hdr.counterAxisAlignItems = 'CENTER';
      hdr.paddingTop = 10;
      hdr.paddingBottom = 10;
      hdr.paddingLeft = TABLE_ROW_PAD_X;
      hdr.paddingRight = TABLE_ROW_PAD_X;
      hdr.itemSpacing = COL3_GAP;
      hdr.fills = [];
      markStretch(hdr);

      const hColName = createFixedColumn('Header · NAME', COL3_NAME_W, 'HORIZONTAL');
      hColName.appendChild(
        await createSpecText(ctx, 'NAME', {
          weight: 'SemiBold',
          size: 10,
          lineHeight: 14,
          letterSpacingPx: 0.5,
          colorTokenId: 'semantic.text.muted',
        }),
      );

      const hColVal = createFixedColumn('Header · VALUE', COL3_VALUE_W, 'HORIZONTAL');
      hColVal.appendChild(await createHeaderModePill(ctx, 'VALUE', 'accent'));

      const hColCode = createFixedColumn('Header · CODE', COL3_CODE_W, 'HORIZONTAL');
      hColCode.appendChild(
        await createSpecText(ctx, 'CODE', {
          weight: 'SemiBold',
          size: 10,
          lineHeight: 14,
          letterSpacingPx: 0.5,
          colorTokenId: 'semantic.text.muted',
        }),
      );

      hdr.appendChild(hColName);
      hdr.appendChild(hColVal);
      hdr.appendChild(hColCode);
      mainTable.appendChild(hdr);
      mainTable.appendChild(createHorizontalDivider(TABLE_MAIN_WIDTH, ctx));

      for (let gIdx = 0; gIdx < groups.length; gIdx++) {
        const grp = groups[gIdx];
        mainTable.appendChild(await createGroupHeaderRow(ctx, grp.folderName));
        mainTable.appendChild(createHorizontalDivider(TABLE_MAIN_WIDTH, ctx));

        for (let tIdx = 0; tIdx < grp.tokens.length; tIdx++) {
          const tok = grp.tokens[tIdx];
          const baseVal = tok.valuesByMode.Base;
          const hexText =
            baseVal?.kind === 'color'
              ? formatHexWithOptionalOpacity(baseVal.hex, baseVal.opacity)
              : 'ALIAS';

          const row = figma.createFrame();
          row.name = `Row · ${tok.name}`;
          row.clipsContent = false;
          row.resize(TABLE_MAIN_WIDTH, 38);
          row.layoutMode = 'HORIZONTAL';
          row.primaryAxisSizingMode = 'FIXED';
          row.counterAxisSizingMode = 'AUTO';
          row.counterAxisAlignItems = 'CENTER';
          row.paddingTop = 9;
          row.paddingBottom = 9;
          row.paddingLeft = TABLE_ROW_PAD_X;
          row.paddingRight = TABLE_ROW_PAD_X;
          row.itemSpacing = COL3_GAP;
          row.fills = [];
          markStretch(row);

          const cName = createFixedColumn('Cell · Name', COL3_NAME_W, 'HORIZONTAL', 10);
          cName.appendChild(
            createDocSvgIcon('Color Var Icon', SVG_COLOR_VAR, 13, 'semantic.text.muted', ctx),
          );
          cName.appendChild(
            await createSpecText(ctx, tok.name, {
              weight: 'Regular',
              size: 12,
              lineHeight: 17,
              mono: true,
              colorTokenId: 'semantic.text.primary',
              grow: true,
            }),
          );

          const cVal = createFixedColumn('Cell · Value', COL3_VALUE_W, 'HORIZONTAL', 10);
          const swatch = figma.createRectangle();
          swatch.name = `Swatch · ${tok.name}`;
          swatch.resize(18, 18);
          swatch.cornerRadius = 4;
          swatch.strokeWeight = 1;
          applyNodeVariableBindings(
            swatch,
            { fill: tok.logicalId, stroke: 'semantic.border.default' },
            ctx.tokensCtx,
          );
          cVal.appendChild(swatch);
          cVal.appendChild(
            await createSpecText(ctx, hexText, {
              weight: 'Regular',
              size: 12,
              lineHeight: 17,
              mono: true,
              colorTokenId: 'semantic.text.primary',
            }),
          );

          const cCode = createFixedColumn('Cell · Code', COL3_CODE_W, 'HORIZONTAL', 6);
          cCode.appendChild(
            await createSpecText(ctx, tok.codeSyntax?.WEB ?? tok.sourceTokenName, {
              weight: 'Regular',
              size: 12,
              lineHeight: 17,
              mono: true,
              colorTokenId: 'semantic.text.muted',
              grow: true,
            }),
          );

          row.appendChild(cName);
          row.appendChild(cVal);
          row.appendChild(cCode);
          mainTable.appendChild(row);

          const isVeryLast = gIdx === groups.length - 1 && tIdx === grp.tokens.length - 1;
          if (!isVeryLast) {
            mainTable.appendChild(createHorizontalDivider(TABLE_MAIN_WIDTH, ctx));
          }
        }
      }
    },
  );

  sheet.appendChild(tableCard);
  finalizeFoundationsAutoLayout(sheet);
  return sheet;
}

async function renderSemanticColorSheet(
  page: PageNode,
  startY: number,
  ctx: ComponentRenderContext,
  cleanPrefix: string,
  tokenMap: ReadonlyMap<string, TokenDefinition>,
): Promise<FrameNode> {
  const locale = ctx.plan.config.locale;
  const semColors = ctx.plan.tokens.filter(
    (t) => t.collection === 'semantic' && t.type === 'COLOR',
  );
  const groups = groupSemanticColorTokens(semColors, cleanPrefix);

  const sheet = getOrResetSheetRootFrame(
    page,
    'docs.foundations.colors.semantic',
    `${ctx.plan.config.namespace} · Colors — Semantic (Light & Dark)`,
    startY,
    ctx,
  );

  const roleSummary = groups.map((g) => g.folderName).join(', ');
  sheet.appendChild(
    await createSheetHeader(
      ctx,
      `VARIABLES · COLLECTION "${ctx.plan.collections.semanticName}"`,
      'Semantic — Light & Dark Color Roles',
      locale === 'th'
        ? `ตัวแปรสีตามบทบาทการใช้งาน (${roleSummary}) รวม ${semColors.length} ตัวแปร — แสดงคู่ค่า Light และ Dark จาก Variable Alias จริงของระบบ`
        : `Role-based semantic color tokens (${roleSummary}) across ${semColors.length} variables — displaying live Light and Dark mode Variable Alias resolutions side by side.`,
    ),
  );

  const sidebarNote =
    locale === 'th'
      ? 'ผูกกับ UI Components โดยตรง สลับค่า Light / Dark อัตโนมัติตามโหมดของ Frame แม่'
      : 'Bind directly to UI components; switches Light / Dark automatically via parent Frame mode.';

  const tableCard = await createVariablesSplitTableCard(
    ctx,
    'Semantic',
    groups,
    sidebarNote,
    async (mainTable) => {
      // Header Row: NAME | [LIGHT] | [DARK] | CODE
      const hdr = figma.createFrame();
      hdr.name = 'Table Header';
      hdr.clipsContent = false;
      hdr.resize(TABLE_MAIN_WIDTH, 40);
      hdr.layoutMode = 'HORIZONTAL';
      hdr.primaryAxisSizingMode = 'FIXED';
      hdr.counterAxisSizingMode = 'AUTO';
      hdr.counterAxisAlignItems = 'CENTER';
      hdr.paddingTop = 10;
      hdr.paddingBottom = 10;
      hdr.paddingLeft = TABLE_ROW_PAD_X;
      hdr.paddingRight = TABLE_ROW_PAD_X;
      hdr.itemSpacing = COL4_GAP;
      hdr.fills = [];
      markStretch(hdr);

      const hName = createFixedColumn('Header · NAME', COL4_NAME_W, 'HORIZONTAL');
      hName.appendChild(
        await createSpecText(ctx, 'NAME', {
          weight: 'SemiBold',
          size: 10,
          lineHeight: 14,
          letterSpacingPx: 0.5,
          colorTokenId: 'semantic.text.muted',
        }),
      );

      const hLight = createFixedColumn('Header · LIGHT', COL4_LIGHT_W, 'HORIZONTAL');
      hLight.appendChild(await createHeaderModePill(ctx, 'LIGHT', 'accent'));

      const hDark = createFixedColumn('Header · DARK', COL4_DARK_W, 'HORIZONTAL');
      hDark.appendChild(await createHeaderModePill(ctx, 'DARK', 'neutral'));

      const hCode = createFixedColumn('Header · CODE', COL4_CODE_W, 'HORIZONTAL');
      hCode.appendChild(
        await createSpecText(ctx, 'CODE', {
          weight: 'SemiBold',
          size: 10,
          lineHeight: 14,
          letterSpacingPx: 0.5,
          colorTokenId: 'semantic.text.muted',
        }),
      );

      hdr.appendChild(hName);
      hdr.appendChild(hLight);
      hdr.appendChild(hDark);
      hdr.appendChild(hCode);
      mainTable.appendChild(hdr);
      mainTable.appendChild(createHorizontalDivider(TABLE_MAIN_WIDTH, ctx));

      for (let gIdx = 0; gIdx < groups.length; gIdx++) {
        const grp = groups[gIdx];
        mainTable.appendChild(await createGroupHeaderRow(ctx, grp.folderName));
        mainTable.appendChild(createHorizontalDivider(TABLE_MAIN_WIDTH, ctx));

        for (let tIdx = 0; tIdx < grp.tokens.length; tIdx++) {
          const tok = grp.tokens[tIdx];

          const row = figma.createFrame();
          row.name = `Row · ${tok.name}`;
          row.clipsContent = false;
          row.resize(TABLE_MAIN_WIDTH, 44);
          row.layoutMode = 'HORIZONTAL';
          row.primaryAxisSizingMode = 'FIXED';
          row.counterAxisSizingMode = 'AUTO';
          row.counterAxisAlignItems = 'CENTER';
          row.paddingTop = 9;
          row.paddingBottom = 9;
          row.paddingLeft = TABLE_ROW_PAD_X;
          row.paddingRight = TABLE_ROW_PAD_X;
          row.itemSpacing = COL4_GAP;
          row.fills = [];
          markStretch(row);

          const cName = createFixedColumn('Cell · Name', COL4_NAME_W, 'HORIZONTAL', 10);
          cName.appendChild(
            createDocSvgIcon('Color Var Icon', SVG_COLOR_VAR, 13, 'semantic.text.muted', ctx),
          );
          cName.appendChild(
            await createSpecText(ctx, tok.name, {
              weight: 'Regular',
              size: 12,
              lineHeight: 17,
              mono: true,
              colorTokenId: 'semantic.text.primary',
              grow: true,
            }),
          );

          const buildModeValueCell = async (mode: 'Light' | 'Dark', colWidth: number) => {
            const cell = createFixedColumn(`Cell · ${mode}`, colWidth, 'HORIZONTAL', 9);
            const swatchWrap = createAutoContainer(`Swatch ${mode} Scope`, 'HORIZONTAL', 0, 0, 0);
            swatchWrap.setExplicitVariableModeForCollection(
              ctx.tokensCtx.collections.semantic,
              mode === 'Light'
                ? ctx.tokensCtx.modeIds.semanticLight
                : ctx.tokensCtx.modeIds.semanticDark,
            );
            const swatch = figma.createRectangle();
            swatch.name = `${mode} Swatch · ${tok.name}`;
            swatch.resize(18, 18);
            swatch.cornerRadius = 4;
            swatch.strokeWeight = 1;
            applyNodeVariableBindings(
              swatch,
              { fill: tok.logicalId, stroke: 'semantic.border.default' },
              ctx.tokensCtx,
            );
            swatchWrap.appendChild(swatch);

            const modeVal = tok.valuesByMode[mode];
            const resolved = resolveTokenInMode(tok.logicalId, mode, tokenMap);
            const primaryLabel =
              modeVal?.kind === 'alias'
                ? formatShortAliasTarget(modeVal.targetLogicalId, tokenMap, cleanPrefix)
                : resolved?.hex
                  ? formatHexWithOptionalOpacity(resolved.hex, resolved.opacity)
                  : '—';
            const secondaryHex = resolved?.hex
              ? formatHexWithOptionalOpacity(resolved.hex, resolved.opacity)
              : '';

            const labelStack = createAutoContainer('Alias & Hex', 'VERTICAL', 1, 0, 0);
            markGrow(labelStack, 1);
            labelStack.appendChild(
              await createSpecText(ctx, primaryLabel, {
                weight: 'Medium',
                size: 11,
                lineHeight: 15,
                mono: true,
                colorTokenId: 'semantic.text.primary',
                stretch: true,
              }),
            );
            if (secondaryHex && secondaryHex !== primaryLabel) {
              labelStack.appendChild(
                await createSpecText(ctx, secondaryHex, {
                  weight: 'Regular',
                  size: 10,
                  lineHeight: 14,
                  mono: true,
                  colorTokenId: 'semantic.text.muted',
                  stretch: true,
                }),
              );
            }

            cell.appendChild(swatchWrap);
            cell.appendChild(labelStack);
            return cell;
          };

          const cLight = await buildModeValueCell('Light', COL4_LIGHT_W);
          const cDark = await buildModeValueCell('Dark', COL4_DARK_W);

          const cCode = createFixedColumn('Cell · Code', COL4_CODE_W, 'HORIZONTAL', 6);
          cCode.appendChild(
            await createSpecText(ctx, tok.codeSyntax?.WEB ?? tok.sourceTokenName, {
              weight: 'Regular',
              size: 11,
              lineHeight: 16,
              mono: true,
              colorTokenId: 'semantic.text.muted',
              grow: true,
            }),
          );

          row.appendChild(cName);
          row.appendChild(cLight);
          row.appendChild(cDark);
          row.appendChild(cCode);
          mainTable.appendChild(row);

          const isVeryLast = gIdx === groups.length - 1 && tIdx === grp.tokens.length - 1;
          if (!isVeryLast) {
            mainTable.appendChild(createHorizontalDivider(TABLE_MAIN_WIDTH, ctx));
          }
        }
      }
    },
  );

  sheet.appendChild(tableCard);
  finalizeFoundationsAutoLayout(sheet);
  return sheet;
}

function getSpecimenSampleCopy(ts: TextStyleDefinition, locale: 'en' | 'th'): string {
  if (ts.fontRole === 'mono' || ts.logicalId.includes('code')) {
    return 'const primary = tokens.color.brand600; // 0123';
  }
  if (ts.logicalId.includes('heading')) {
    return locale === 'th'
      ? 'ระบบออกแบบมาตรฐาน Design System'
      : 'Design System Foundations';
  }
  if (ts.logicalId.includes('label')) {
    return locale === 'th'
      ? 'สร้างสรรค์ UI ทุกแพลตฟอร์ม Build anywhere 0123'
      : 'Build consistent interfaces anywhere 0123';
  }
  return locale === 'th'
    ? 'สร้างสรรค์ UI ทุกแพลตฟอร์ม Build anywhere 0123'
    : 'The quick brown fox jumps over the lazy dog 0123';
}

function fontStyleToNumericWeight(style: TextStyleDefinition['fontStyle']): number {
  switch (style) {
    case 'Regular':
      return 400;
    case 'Medium':
      return 500;
    case 'SemiBold':
      return 600;
    case 'Bold':
      return 700;
  }
}

async function renderTypographySheet(
  page: PageNode,
  startY: number,
  ctx: ComponentRenderContext,
  cleanPrefix: string,
  tokenMap: ReadonlyMap<string, TokenDefinition>,
): Promise<FrameNode> {
  const locale = ctx.plan.config.locale;
  const typoTokens = ctx.plan.tokens.filter((t) => t.category === 'typography');
  const groups = groupTypographyTokens(typoTokens, cleanPrefix);
  const textStyles = ctx.plan.textStyles;

  const activePrimaryFont =
    locale === 'th'
      ? ctx.plan.activeFontPreset.thaiFallbackFamily
      : ctx.plan.activeFontPreset.sansFamily;
  const activeMonoFont = ctx.plan.activeFontPreset.monoFamily;
  const distinctWeights = new Set(textStyles.map((s) => s.fontStyle)).size;

  const sheet = getOrResetSheetRootFrame(
    page,
    'docs.foundations.typography',
    `${ctx.plan.config.namespace} · Typography`,
    startY,
    ctx,
  );

  sheet.appendChild(
    await createSheetHeader(
      ctx,
      'VARIABLES · COLLECTION "TYPOGRAPHY"',
      'Typography',
      locale === 'th'
        ? `ฟอนต์ ${activePrimaryFont} (${distinctWeights} น้ำหนักหลัก · Mono: ${activeMonoFont}) และ ${textStyles.length} text styles — แสดงด้วยขนาดจริง (px = dp)`
        : `Font ${activePrimaryFont} (${distinctWeights} weights · Mono: ${activeMonoFont}) and ${textStyles.length} text styles — rendered at true 1:1 scale (px = dp).`,
    ),
  );

  const sidebarNote =
    locale === 'th'
      ? 'ผูกค่า Font Family, Weight, Size และ Line-Height เข้ากับ Figma Text Styles ของระบบ'
      : 'Typography variables bound directly to native Figma Text Styles across components.';

  // Part A: Typography Variables Split Table Card
  const varsCard = await createVariablesSplitTableCard(
    ctx,
    'Typography',
    groups,
    sidebarNote,
    async (mainTable) => {
      const hdr = figma.createFrame();
      hdr.name = 'Table Header';
      hdr.clipsContent = false;
      hdr.resize(TABLE_MAIN_WIDTH, 40);
      hdr.layoutMode = 'HORIZONTAL';
      hdr.primaryAxisSizingMode = 'FIXED';
      hdr.counterAxisSizingMode = 'AUTO';
      hdr.counterAxisAlignItems = 'CENTER';
      hdr.paddingTop = 10;
      hdr.paddingBottom = 10;
      hdr.paddingLeft = TABLE_ROW_PAD_X;
      hdr.paddingRight = TABLE_ROW_PAD_X;
      hdr.itemSpacing = COL3_GAP;
      hdr.fills = [];
      markStretch(hdr);

      const hColName = createFixedColumn('Header · NAME', COL3_NAME_W, 'HORIZONTAL');
      hColName.appendChild(
        await createSpecText(ctx, 'NAME', {
          weight: 'SemiBold',
          size: 10,
          lineHeight: 14,
          letterSpacingPx: 0.5,
          colorTokenId: 'semantic.text.muted',
        }),
      );

      const hColVal = createFixedColumn('Header · VALUE', COL3_VALUE_W, 'HORIZONTAL');
      hColVal.appendChild(await createHeaderModePill(ctx, 'VALUE', 'accent'));

      const hColCode = createFixedColumn('Header · CODE', COL3_CODE_W, 'HORIZONTAL');
      hColCode.appendChild(
        await createSpecText(ctx, 'CODE', {
          weight: 'SemiBold',
          size: 10,
          lineHeight: 14,
          letterSpacingPx: 0.5,
          colorTokenId: 'semantic.text.muted',
        }),
      );

      hdr.appendChild(hColName);
      hdr.appendChild(hColVal);
      hdr.appendChild(hColCode);
      mainTable.appendChild(hdr);
      mainTable.appendChild(createHorizontalDivider(TABLE_MAIN_WIDTH, ctx));

      for (let gIdx = 0; gIdx < groups.length; gIdx++) {
        const grp = groups[gIdx];
        mainTable.appendChild(await createGroupHeaderRow(ctx, grp.folderName));
        mainTable.appendChild(createHorizontalDivider(TABLE_MAIN_WIDTH, ctx));

        for (let tIdx = 0; tIdx < grp.tokens.length; tIdx++) {
          const tok = grp.tokens[tIdx];
          const baseVal = tok.valuesByMode.Base;
          const displayVal =
            baseVal?.kind === 'string'
              ? baseVal.value
              : baseVal?.kind === 'float'
                ? String(baseVal.value)
                : 'alias';

          const iconSvg = tok.type === 'STRING' ? SVG_STRING_VAR : SVG_FLOAT_VAR;

          const row = figma.createFrame();
          row.name = `Row · ${tok.name}`;
          row.clipsContent = false;
          row.resize(TABLE_MAIN_WIDTH, 38);
          row.layoutMode = 'HORIZONTAL';
          row.primaryAxisSizingMode = 'FIXED';
          row.counterAxisSizingMode = 'AUTO';
          row.counterAxisAlignItems = 'CENTER';
          row.paddingTop = 9;
          row.paddingBottom = 9;
          row.paddingLeft = TABLE_ROW_PAD_X;
          row.paddingRight = TABLE_ROW_PAD_X;
          row.itemSpacing = COL3_GAP;
          row.fills = [];
          markStretch(row);

          const cName = createFixedColumn('Cell · Name', COL3_NAME_W, 'HORIZONTAL', 10);
          cName.appendChild(
            createDocSvgIcon('Type Var Icon', iconSvg, 13, 'semantic.text.muted', ctx),
          );
          cName.appendChild(
            await createSpecText(ctx, tok.name, {
              weight: 'Regular',
              size: 12,
              lineHeight: 17,
              mono: true,
              colorTokenId: 'semantic.text.primary',
              grow: true,
            }),
          );

          const cVal = createFixedColumn('Cell · Value', COL3_VALUE_W, 'HORIZONTAL', 8);
          cVal.appendChild(
            await createSpecText(ctx, displayVal, {
              weight: 'Medium',
              size: 12,
              lineHeight: 17,
              mono: true,
              colorTokenId: 'semantic.text.primary',
            }),
          );

          const cCode = createFixedColumn('Cell · Code', COL3_CODE_W, 'HORIZONTAL', 6);
          cCode.appendChild(
            await createSpecText(ctx, tok.codeSyntax?.WEB ?? tok.sourceTokenName, {
              weight: 'Regular',
              size: 12,
              lineHeight: 17,
              mono: true,
              colorTokenId: 'semantic.text.muted',
              grow: true,
            }),
          );

          row.appendChild(cName);
          row.appendChild(cVal);
          row.appendChild(cCode);
          mainTable.appendChild(row);

          const isVeryLast = gIdx === groups.length - 1 && tIdx === grp.tokens.length - 1;
          if (!isVeryLast) {
            mainTable.appendChild(createHorizontalDivider(TABLE_MAIN_WIDTH, ctx));
          }
        }
      }
    },
  );
  sheet.appendChild(varsCard);

  // Part B: "Text styles" Specimen Table (TEXT STYLE | SAMPLE | SPEC)
  const textStylesSection = createAutoContainer('Text Styles Section', 'VERTICAL', 16, 0, 0);
  textStylesSection.resize(SHEET_CONTENT_WIDTH, 120);
  textStylesSection.layoutMode = 'VERTICAL';
  textStylesSection.primaryAxisSizingMode = 'AUTO';
  textStylesSection.counterAxisSizingMode = 'FIXED';
  markStretch(textStylesSection);

  textStylesSection.appendChild(
    await createSpecText(ctx, 'Text styles', {
      weight: 'Bold',
      size: 20,
      lineHeight: 28,
      letterSpacingPx: -0.2,
      colorTokenId: 'semantic.text.primary',
      stretch: true,
    }),
  );

  const specimenTable = figma.createFrame();
  specimenTable.name = 'Text Styles Specimen Table';
  specimenTable.clipsContent = false;
  specimenTable.resize(SHEET_CONTENT_WIDTH, 120);
  specimenTable.layoutMode = 'VERTICAL';
  specimenTable.primaryAxisSizingMode = 'AUTO';
  specimenTable.counterAxisSizingMode = 'FIXED';
  specimenTable.itemSpacing = 0;
  specimenTable.cornerRadius = 12;
  specimenTable.strokeWeight = 1;
  markStretch(specimenTable);
  applyNodeVariableBindings(
    specimenTable,
    { fill: 'semantic.surface.card', stroke: 'semantic.border.default' },
    ctx.tokensCtx,
  );

  // Specimen Header Row
  const specHdr = figma.createFrame();
  specHdr.name = 'Specimen Header';
  specHdr.clipsContent = false;
  specHdr.resize(SHEET_CONTENT_WIDTH, 40);
  specHdr.layoutMode = 'HORIZONTAL';
  specHdr.primaryAxisSizingMode = 'FIXED';
  specHdr.counterAxisSizingMode = 'AUTO';
  specHdr.counterAxisAlignItems = 'CENTER';
  specHdr.paddingTop = 12;
  specHdr.paddingBottom = 12;
  specHdr.paddingLeft = SPECIMEN_PAD_X;
  specHdr.paddingRight = SPECIMEN_PAD_X;
  specHdr.itemSpacing = SPECIMEN_GAP;
  specHdr.fills = [];
  markStretch(specHdr);

  const shStyle = createFixedColumn('Header · TEXT STYLE', SPECIMEN_STYLE_W, 'HORIZONTAL');
  shStyle.appendChild(
    await createSpecText(ctx, 'TEXT STYLE', {
      weight: 'SemiBold',
      size: 10,
      lineHeight: 14,
      letterSpacingPx: 0.5,
      colorTokenId: 'semantic.text.muted',
    }),
  );

  const shSample = createFixedColumn('Header · SAMPLE', SPECIMEN_SAMPLE_W, 'HORIZONTAL');
  shSample.appendChild(
    await createSpecText(ctx, 'SAMPLE', {
      weight: 'SemiBold',
      size: 10,
      lineHeight: 14,
      letterSpacingPx: 0.5,
      colorTokenId: 'semantic.text.muted',
    }),
  );

  const shSpec = createFixedColumn('Header · SPEC', SPECIMEN_SPEC_W, 'HORIZONTAL');
  shSpec.appendChild(
    await createSpecText(ctx, 'SPEC', {
      weight: 'SemiBold',
      size: 10,
      lineHeight: 14,
      letterSpacingPx: 0.5,
      colorTokenId: 'semantic.text.muted',
    }),
  );

  specHdr.appendChild(shStyle);
  specHdr.appendChild(shSample);
  specHdr.appendChild(shSpec);
  specimenTable.appendChild(specHdr);
  specimenTable.appendChild(createHorizontalDivider(SHEET_CONTENT_WIDTH, ctx));

  const primaryTextTokenName =
    tokenMap.get('semantic.text.primary')?.name ?? 'text/primary';

  for (let i = 0; i < textStyles.length; i++) {
    const ts = textStyles[i];
    const row = figma.createFrame();
    row.name = `Specimen · ${ts.name}`;
    row.clipsContent = false;
    row.resize(SHEET_CONTENT_WIDTH, 56);
    row.layoutMode = 'HORIZONTAL';
    row.primaryAxisSizingMode = 'FIXED';
    row.counterAxisSizingMode = 'AUTO';
    row.counterAxisAlignItems = 'CENTER';
    row.paddingTop = 16;
    row.paddingBottom = 16;
    row.paddingLeft = SPECIMEN_PAD_X;
    row.paddingRight = SPECIMEN_PAD_X;
    row.itemSpacing = SPECIMEN_GAP;
    row.fills = [];
    markStretch(row);

    // Col 1: TEXT STYLE (style token path + constant identifier)
    const cStyle = createFixedColumn('Col · Style Name', SPECIMEN_STYLE_W, 'VERTICAL', 3);
    const normalizedStylePath = ts.name
      .replace(/^Typography\//i, 'text/')
      .replace(/\s+/g, '/')
      .toLowerCase();
    const constKey = ts.logicalId
      .replace(/^textstyle\./, '')
      .replace(/[.-]/g, '_')
      .toUpperCase();

    cStyle.appendChild(
      await createSpecText(ctx, normalizedStylePath, {
        weight: 'Medium',
        size: 12,
        lineHeight: 17,
        mono: true,
        colorTokenId: 'semantic.text.primary',
        stretch: true,
      }),
    );
    cStyle.appendChild(
      await createSpecText(ctx, `${constKey} · ${ts.name}`, {
        weight: 'Regular',
        size: 11,
        lineHeight: 15,
        mono: true,
        colorTokenId: 'semantic.text.muted',
        stretch: true,
      }),
    );

    // Col 2: SAMPLE (live TextStyle-bound sample at 1:1 px scale)
    const cSample = createFixedColumn('Col · Sample', SPECIMEN_SAMPLE_W, 'VERTICAL', 0);
    const sampleNode = await createSpecText(ctx, getSpecimenSampleCopy(ts, locale), {
      weight: ts.fontStyle,
      size: ts.fontSize,
      lineHeight: ts.lineHeightPx,
      letterSpacingPx: ts.letterSpacingPx,
      mono: ts.fontRole === 'mono',
      colorTokenId: 'semantic.text.primary',
      stretch: true,
    });
    const styleObj = ctx.tokensCtx.textStylesByLogicalId.get(ts.logicalId);
    if (styleObj) {
      try {
        await figma.loadFontAsync(styleObj.fontName);
      } catch {
        // Fallback font already loaded
      }
      await sampleNode.setTextStyleIdAsync(styleObj.id);
    }
    cSample.appendChild(sampleNode);

    // Col 3: SPEC (monospace pill chips: Font+Style, Size/LH, Weight, Color token)
    const cSpec = createFixedColumn('Col · Spec', SPECIMEN_SPEC_W, 'VERTICAL', 6);
    const resolvedFontFamily =
      ts.fontRole === 'mono' ? activeMonoFont : activePrimaryFont;
    const weightNum = fontStyleToNumericWeight(ts.fontStyle);

    const specTopRow = createAutoContainer('Spec Row 1', 'HORIZONTAL', 6, 0, 0);
    specTopRow.layoutWrap = 'WRAP';
    specTopRow.counterAxisSpacing = 6;
    markStretch(specTopRow);
    specTopRow.appendChild(
      await createSpecChip(ctx, `${resolvedFontFamily} ${ts.fontStyle}`),
    );
    specTopRow.appendChild(
      await createSpecChip(ctx, `${ts.fontSize} / ${ts.lineHeightPx}`),
    );
    specTopRow.appendChild(await createSpecChip(ctx, `w${weightNum}`));

    const specBottomRow = createAutoContainer('Spec Row 2', 'HORIZONTAL', 6, 0, 0);
    specBottomRow.layoutWrap = 'WRAP';
    specBottomRow.counterAxisSpacing = 6;
    markStretch(specBottomRow);
    specBottomRow.appendChild(await createSpecChip(ctx, primaryTextTokenName, true));
    if (ts.letterSpacingPx !== 0) {
      const sign = ts.letterSpacingPx > 0 ? '+' : '';
      specBottomRow.appendChild(
        await createSpecChip(ctx, `ls ${sign}${ts.letterSpacingPx}px`, true),
      );
    }

    cSpec.appendChild(specTopRow);
    cSpec.appendChild(specBottomRow);

    row.appendChild(cStyle);
    row.appendChild(cSample);
    row.appendChild(cSpec);
    specimenTable.appendChild(row);

    if (i < textStyles.length - 1) {
      specimenTable.appendChild(createHorizontalDivider(SHEET_CONTENT_WIDTH, ctx));
    }
  }

  textStylesSection.appendChild(specimenTable);
  sheet.appendChild(textStylesSection);
  finalizeFoundationsAutoLayout(sheet);
  return sheet;
}

async function renderDimensionsAndElevationSheet(
  page: PageNode,
  startY: number,
  ctx: ComponentRenderContext,
  cleanPrefix: string,
  refreshedAtIso: string,
): Promise<FrameNode> {
  const locale = ctx.plan.config.locale;
  const scaleCategories = new Set(['spacing', 'size', 'radius', 'border', 'opacity']);
  const scaleTokens = ctx.plan.tokens.filter(
    (t) => t.collection === 'primitives' && scaleCategories.has(t.category),
  );
  const groups = groupDimensionScaleTokens(scaleTokens, cleanPrefix);

  const sheet = getOrResetSheetRootFrame(
    page,
    'docs.foundations.scales',
    `${ctx.plan.config.namespace} · Dimensions, Radius & Elevation`,
    startY,
    ctx,
  );

  sheet.appendChild(
    await createSheetHeader(
      ctx,
      'VARIABLES · DIMENSIONS, RADIUS & ELEVATION',
      'Spacing, Radius & Elevation',
      locale === 'th'
        ? `สเกลระยะห่าง ขนาดคอนโทรล ความโค้งมุม (${ctx.plan.config.radiusPreset.toUpperCase()}) ความหนาแน่น (${ctx.plan.config.density}) และสไตล์เงา • อัปเดตล่าสุด ${refreshedAtIso}`
        : `Spacing, control sizing, corner radius (${ctx.plan.config.radiusPreset.toUpperCase()}), density (${ctx.plan.config.density}), and elevation styles • Refreshed ${refreshedAtIso}.`,
    ),
  );

  const sidebarNote =
    locale === 'th'
      ? 'ผูกเข้ากับ Auto Layout gap, padding, width/height และ cornerRadius ของทุก Component'
      : 'Bound to Auto Layout gap, padding, control height, and cornerRadius across components.';

  const scalesCard = await createVariablesSplitTableCard(
    ctx,
    'Dimensions',
    groups,
    sidebarNote,
    async (mainTable) => {
      const hdr = figma.createFrame();
      hdr.name = 'Table Header';
      hdr.clipsContent = false;
      hdr.resize(TABLE_MAIN_WIDTH, 40);
      hdr.layoutMode = 'HORIZONTAL';
      hdr.primaryAxisSizingMode = 'FIXED';
      hdr.counterAxisSizingMode = 'AUTO';
      hdr.counterAxisAlignItems = 'CENTER';
      hdr.paddingTop = 10;
      hdr.paddingBottom = 10;
      hdr.paddingLeft = TABLE_ROW_PAD_X;
      hdr.paddingRight = TABLE_ROW_PAD_X;
      hdr.itemSpacing = COL3_GAP;
      hdr.fills = [];
      markStretch(hdr);

      const hColName = createFixedColumn('Header · NAME', COL3_NAME_W, 'HORIZONTAL');
      hColName.appendChild(
        await createSpecText(ctx, 'NAME', {
          weight: 'SemiBold',
          size: 10,
          lineHeight: 14,
          letterSpacingPx: 0.5,
          colorTokenId: 'semantic.text.muted',
        }),
      );

      const hColVal = createFixedColumn('Header · VALUE', COL3_VALUE_W, 'HORIZONTAL');
      hColVal.appendChild(await createHeaderModePill(ctx, 'VALUE', 'accent'));

      const hColCode = createFixedColumn('Header · CODE', COL3_CODE_W, 'HORIZONTAL');
      hColCode.appendChild(
        await createSpecText(ctx, 'CODE', {
          weight: 'SemiBold',
          size: 10,
          lineHeight: 14,
          letterSpacingPx: 0.5,
          colorTokenId: 'semantic.text.muted',
        }),
      );

      hdr.appendChild(hColName);
      hdr.appendChild(hColVal);
      hdr.appendChild(hColCode);
      mainTable.appendChild(hdr);
      mainTable.appendChild(createHorizontalDivider(TABLE_MAIN_WIDTH, ctx));

      for (let gIdx = 0; gIdx < groups.length; gIdx++) {
        const grp = groups[gIdx];
        mainTable.appendChild(await createGroupHeaderRow(ctx, grp.folderName));
        mainTable.appendChild(createHorizontalDivider(TABLE_MAIN_WIDTH, ctx));

        for (let tIdx = 0; tIdx < grp.tokens.length; tIdx++) {
          const tok = grp.tokens[tIdx];
          const baseVal = tok.valuesByMode.Base;
          let formattedVal = 'alias';
          if (baseVal?.kind === 'float') {
            if (tok.category === 'opacity') {
              const pct = baseVal.value <= 1 ? Math.round(baseVal.value * 100) : baseVal.value;
              formattedVal = `${pct}%`;
            } else {
              formattedVal = `${baseVal.value}px`;
            }
          }

          const row = figma.createFrame();
          row.name = `Row · ${tok.name}`;
          row.clipsContent = false;
          row.resize(TABLE_MAIN_WIDTH, 38);
          row.layoutMode = 'HORIZONTAL';
          row.primaryAxisSizingMode = 'FIXED';
          row.counterAxisSizingMode = 'AUTO';
          row.counterAxisAlignItems = 'CENTER';
          row.paddingTop = 9;
          row.paddingBottom = 9;
          row.paddingLeft = TABLE_ROW_PAD_X;
          row.paddingRight = TABLE_ROW_PAD_X;
          row.itemSpacing = COL3_GAP;
          row.fills = [];
          markStretch(row);

          const cName = createFixedColumn('Cell · Name', COL3_NAME_W, 'HORIZONTAL', 10);
          cName.appendChild(
            createDocSvgIcon('Float Var Icon', SVG_FLOAT_VAR, 13, 'semantic.text.muted', ctx),
          );
          cName.appendChild(
            await createSpecText(ctx, tok.name, {
              weight: 'Regular',
              size: 12,
              lineHeight: 17,
              mono: true,
              colorTokenId: 'semantic.text.primary',
              grow: true,
            }),
          );

          const cVal = createFixedColumn('Cell · Value', COL3_VALUE_W, 'HORIZONTAL', 10);
          cVal.appendChild(
            await createSpecText(ctx, formattedVal, {
              weight: 'Medium',
              size: 12,
              lineHeight: 17,
              mono: true,
              colorTokenId: 'semantic.text.primary',
            }),
          );

          if (
            baseVal?.kind === 'float' &&
            (tok.category === 'spacing' || tok.category === 'size') &&
            baseVal.value > 0
          ) {
            const barWidth = Math.max(4, Math.min(96, baseVal.value * 2));
            const visualBar = figma.createRectangle();
            visualBar.name = 'Scale Bar';
            visualBar.resize(barWidth, 6);
            visualBar.cornerRadius = 3;
            applyNodeVariableBindings(
              visualBar,
              { fill: 'semantic.action.primary.bg' },
              ctx.tokensCtx,
            );
            cVal.appendChild(visualBar);
          }

          const cCode = createFixedColumn('Cell · Code', COL3_CODE_W, 'HORIZONTAL', 6);
          cCode.appendChild(
            await createSpecText(ctx, tok.codeSyntax?.WEB ?? tok.sourceTokenName, {
              weight: 'Regular',
              size: 12,
              lineHeight: 17,
              mono: true,
              colorTokenId: 'semantic.text.muted',
              grow: true,
            }),
          );

          row.appendChild(cName);
          row.appendChild(cVal);
          row.appendChild(cCode);
          mainTable.appendChild(row);

          const isVeryLast = gIdx === groups.length - 1 && tIdx === grp.tokens.length - 1;
          if (!isVeryLast) {
            mainTable.appendChild(createHorizontalDivider(TABLE_MAIN_WIDTH, ctx));
          }
        }
      }
    },
  );
  sheet.appendChild(scalesCard);

  // Elevation Effect Styles & 3-Tier Architecture Summary
  if (ctx.plan.effectStyles.length > 0) {
    const elevSection = createAutoContainer('Elevation Styles', 'VERTICAL', 14, 0, 0);
    elevSection.resize(SHEET_CONTENT_WIDTH, 100);
    elevSection.layoutMode = 'VERTICAL';
    elevSection.primaryAxisSizingMode = 'AUTO';
    elevSection.counterAxisSizingMode = 'FIXED';
    markStretch(elevSection);

    elevSection.appendChild(
      await createSpecText(ctx, 'Effect styles & 3-tier alias chain', {
        weight: 'Bold',
        size: 18,
        lineHeight: 26,
        colorTokenId: 'semantic.text.primary',
        stretch: true,
      }),
    );

    const effectRow = createAutoContainer('Effect Swatches', 'HORIZONTAL', 16, 0, 0);
    effectRow.layoutWrap = 'WRAP';
    effectRow.counterAxisSpacing = 16;
    markStretch(effectRow);

    for (const es of ctx.plan.effectStyles) {
      const box = createFixedColumn(`Effect · ${es.name}`, 254, 'VERTICAL', 6);
      box.paddingTop = 16;
      box.paddingBottom = 16;
      box.paddingLeft = 16;
      box.paddingRight = 16;
      box.cornerRadius = 10;
      box.strokeWeight = 1;
      applyNodeVariableBindings(
        box,
        { fill: 'semantic.surface.card', stroke: 'semantic.border.default' },
        ctx.tokensCtx,
      );
      const effectObj = ctx.tokensCtx.effectStylesByLogicalId.get(es.logicalId);
      if (effectObj) {
        await box.setEffectStyleIdAsync(effectObj.id);
      }
      box.appendChild(
        await createSpecText(ctx, es.name, {
          weight: 'SemiBold',
          size: 12,
          lineHeight: 17,
          mono: true,
          colorTokenId: 'semantic.text.primary',
          stretch: true,
        }),
      );
      box.appendChild(
        await createSpecText(ctx, es.description[locale], {
          weight: 'Regular',
          size: 11,
          lineHeight: 16,
          colorTokenId: 'semantic.text.muted',
          stretch: true,
        }),
      );
      effectRow.appendChild(box);
    }
    elevSection.appendChild(effectRow);

    const archBanner = createAutoContainer('Alias Chain Banner', 'VERTICAL', 6, 14, 18);
    archBanner.resize(SHEET_CONTENT_WIDTH, 56);
    archBanner.layoutMode = 'VERTICAL';
    archBanner.primaryAxisSizingMode = 'AUTO';
    archBanner.counterAxisSizingMode = 'FIXED';
    archBanner.cornerRadius = 10;
    archBanner.strokeWeight = 1;
    markStretch(archBanner);
    applyNodeVariableBindings(
      archBanner,
      { fill: 'semantic.surface.muted', stroke: 'semantic.border.default' },
      ctx.tokensCtx,
    );
    archBanner.appendChild(
      await createSpecText(
        ctx,
        `${ctx.plan.collections.componentName} [Base]  →  ${ctx.plan.collections.semanticName} [Light | Dark]  →  ${ctx.plan.collections.primitivesName} [Base]\n` +
          `Example: button/primary/background → action/primary/background → color/brand/600 (Light) | color/brand/400 (Dark)`,
        {
          weight: 'Regular',
          size: 12,
          lineHeight: 19,
          mono: true,
          colorTokenId: 'semantic.text.primary',
          stretch: true,
        },
      ),
    );
    elevSection.appendChild(archBanner);
    sheet.appendChild(elevSection);
  }

  finalizeFoundationsAutoLayout(sheet);
  return sheet;
}

/**
 * Renders the 4 modular Foundations specification frames on `01 Foundations`:
 * 1. Primitives — Color Scales (`NAME | VALUE | CODE` with sidebar folder tree)
 * 2. Semantic — Light & Dark Color Roles (`NAME | LIGHT | DARK | CODE` with sidebar folder tree)
 * 3. Typography (`Typography` Variables table + `Text styles` `TEXT STYLE | SAMPLE | SPEC` table)
 * 4. Spacing, Radius & Elevation (`Dimensions` Variables table + live `EffectStyles` + 3-tier chain)
 *
 * Returns the bottom Y coordinate so preserved Team Custom Notes sit cleanly underneath.
 */
export async function renderFoundationsSpecificationSheets(
  page: PageNode,
  initialY: number,
  ctx: ComponentRenderContext,
  refreshedAtIso: string,
): Promise<number> {
  // Clean up legacy single-card `docs.foundations` frame if upgrading an earlier system instance
  for (const child of [...page.children]) {
    if (child.type === 'FRAME') {
      const meta = getNodeManagedMeta(child);
      if (meta?.systemInstanceId === ctx.systemInstanceId && meta?.logicalId === 'docs.foundations') {
        child.remove();
      }
    }
  }

  const cleanPrefix = ctx.plan.config.tokenPrefix
    ? sanitizeFigmaVariableName(ctx.plan.config.tokenPrefix)
    : '';
  const tokenMap = new Map(ctx.plan.tokens.map((t) => [t.logicalId, t]));
  const sheetGap = 56;

  let cursorY = initialY;

  const primSheet = await renderPrimitivesColorSheet(page, cursorY, ctx, cleanPrefix);
  cursorY = primSheet.y + primSheet.height + sheetGap;

  const semSheet = await renderSemanticColorSheet(page, cursorY, ctx, cleanPrefix, tokenMap);
  cursorY = semSheet.y + semSheet.height + sheetGap;

  const typoSheet = await renderTypographySheet(page, cursorY, ctx, cleanPrefix, tokenMap);
  cursorY = typoSheet.y + typoSheet.height + sheetGap;

  const scalesSheet = await renderDimensionsAndElevationSheet(
    page,
    cursorY,
    ctx,
    cleanPrefix,
    refreshedAtIso,
  );
  return scalesSheet.y + scalesSheet.height;
}
