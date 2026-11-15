import {
  GENERATOR_VERSION,
  SCHEMA_VERSION,
  type InstalledSystemRecord,
  type ManagedObjectRecord,
  type ValidationReport,
} from '@schema';
import type { CompiledComponentPlan, PlannedPage } from '@engine';
import {
  applyNodeVariableBindings,
  finalizeComponentAutoLayout,
  renderRecipeChildNode,
  resolveVariantComponent,
  type ComponentRenderContext,
} from './components-engine';
import { getNodeManagedMeta, setNodeManagedMeta } from './storage';

async function createDocText(
  ctx: ComponentRenderContext,
  content: string,
  opts?: {
    weight?: 'Regular' | 'Medium' | 'SemiBold' | 'Bold';
    size?: number;
    lineHeight?: number;
    colorTokenId?: string;
    mono?: boolean;
    stretch?: boolean;
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
  text.fontSize = opts?.size ?? 13;
  text.lineHeight = { unit: 'PIXELS', value: opts?.lineHeight ?? Math.round((opts?.size ?? 13) * 1.5) };
  text.characters = content;
  applyNodeVariableBindings(
    text,
    { textFill: opts?.colorTokenId ?? 'semantic.text.primary' },
    ctx.tokensCtx,
  );
  if (opts?.stretch) {
    text.layoutAlign = 'STRETCH';
    text.textAutoResize = 'HEIGHT';
    try {
      text.setPluginData('ds_forge:stretch', '1');
    } catch {
      // Ignore if pluginData restricted
    }
  }
  return text;
}

/**
 * Re-applies `layoutAlign = 'STRETCH'` and `textAutoResize = 'HEIGHT'` top-down AFTER
 * nodes are appended into their final Auto Layout parent hierarchy so Figma Desktop
 * computes exact stretched widths and multi-line text heights instead of keeping initial 100px widths.
 */
function finalizeAutoLayoutStretch(container: FrameNode): void {
  const walk = (node: SceneNode) => {
    let shouldStretch = 'layoutAlign' in node && node.layoutAlign === 'STRETCH';
    if (!shouldStretch) {
      try {
        shouldStretch = node.getPluginData('ds_forge:stretch') === '1';
      } catch {
        shouldStretch = false;
      }
    }
    if (shouldStretch && 'layoutAlign' in node) {
      try {
        node.layoutAlign = 'STRETCH';
        if (node.type === 'FRAME' && node.layoutMode !== 'NONE') {
          node.primaryAxisSizingMode = 'AUTO';
        }
        if (node.type === 'TEXT') {
          node.textAutoResize = 'HEIGHT';
        }
      } catch {
        // Safe fallback across Figma host versions
      }
    }
    if ('children' in node && node.type !== 'INSTANCE') {
      for (const child of node.children) {
        walk(child);
      }
    }
  };

  for (const child of container.children) {
    walk(child);
  }
}

function createAutoFrame(
  name: string,
  direction: 'VERTICAL' | 'HORIZONTAL',
  spacing: number,
  padding = 0,
): FrameNode {
  const frame = figma.createFrame();
  frame.name = name;
  frame.clipsContent = false;
  frame.layoutMode = direction;
  frame.primaryAxisSizingMode = 'AUTO';
  frame.counterAxisSizingMode = 'AUTO';
  frame.itemSpacing = spacing;
  frame.paddingTop = padding;
  frame.paddingRight = padding;
  frame.paddingBottom = padding;
  frame.paddingLeft = padding;
  frame.fills = [];
  return frame;
}

function getOrResetManagedRootFrame(
  page: PageNode,
  logicalId: string,
  name: string,
  width: number,
  ctx: ComponentRenderContext,
  objectKind: ManagedObjectRecord['objectKind'] = 'docs-section',
  x = 80,
  y = 80,
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

  frame.x = x;
  frame.y = y;
  frame.name = name;
  frame.clipsContent = false;
  // Resize MUST precede layoutMode / primaryAxisSizingMode so Figma does not reset AUTO to FIXED.
  frame.resize(width, 200);
  frame.layoutMode = 'VERTICAL';
  frame.primaryAxisSizingMode = 'AUTO';
  frame.counterAxisSizingMode = 'FIXED';
  frame.paddingTop = 36;
  frame.paddingRight = 36;
  frame.paddingBottom = 36;
  frame.paddingLeft = 36;
  frame.itemSpacing = 24;
  frame.cornerRadius = 12;
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

/**
 * Ensures a user-owned Custom Notes frame exists on a page and NEVER overwrites its children on update! (Section 12)
 */
async function ensurePreservedCustomNotesFrame(
  page: PageNode,
  logicalId: string,
  yOffset: number,
  ctx: ComponentRenderContext,
): Promise<FrameNode> {
  for (const child of page.children) {
    if (child.type === 'FRAME' && child.getPluginData('ds_forge:custom_notes_id') === logicalId) {
      child.clipsContent = false;
      child.y = Math.max(child.y, yOffset);
      return child;
    }
  }

  const locale = ctx.plan.config.locale;
  const notesFrame = figma.createFrame();
  notesFrame.name =
    locale === 'th'
      ? 'Custom Notes (พื้นที่บันทึกของทีม — ไม่ถูกเขียนทับเมื่ออัปเดต)'
      : 'Custom Notes (Team Owned — Preserved Across Updates)';
  notesFrame.setPluginData('ds_forge:custom_notes_id', logicalId);
  notesFrame.clipsContent = false;
  notesFrame.x = 80;
  notesFrame.y = yOffset;
  notesFrame.resize(1040, 120);
  notesFrame.layoutMode = 'VERTICAL';
  notesFrame.primaryAxisSizingMode = 'AUTO';
  notesFrame.counterAxisSizingMode = 'FIXED';
  notesFrame.paddingTop = 24;
  notesFrame.paddingRight = 24;
  notesFrame.paddingBottom = 24;
  notesFrame.paddingLeft = 24;
  notesFrame.itemSpacing = 8;
  notesFrame.cornerRadius = 10;
  notesFrame.strokeWeight = 1;
  applyNodeVariableBindings(
    notesFrame,
    { fill: 'semantic.surface.card', stroke: 'semantic.border.default' },
    ctx.tokensCtx,
  );

  const heading = await createDocText(
    ctx,
    locale === 'th' ? 'บันทึกเพิ่มเติมของทีม (Custom Notes)' : 'Team Custom Notes',
    { weight: 'SemiBold', size: 15, lineHeight: 22, stretch: true },
  );
  const hint = await createDocText(
    ctx,
    locale === 'th'
      ? 'เพิ่มข้อตกลงเฉพาะของโปรเจกต์หรือตัวอย่างเพิ่มเติมในเฟรมนี้ได้ ระบบ DS Forge จะไม่เขียนทับเนื้อหาภายในเมื่อกด Refresh หรือ Update'
      : 'Add project-specific guidelines, edge cases, or annotations inside this frame. DS Forge never overwrites children placed here during Refresh or Update.',
    { size: 12, lineHeight: 18, colorTokenId: 'semantic.text.muted', stretch: true },
  );
  notesFrame.appendChild(heading);
  notesFrame.appendChild(hint);
  page.appendChild(notesFrame);
  finalizeAutoLayoutStretch(notesFrame);
  ctx.journal.createdNodeIds.push(notesFrame.id);
  return notesFrame;
}

async function createSectionCard(
  ctx: ComponentRenderContext,
  title: string,
): Promise<FrameNode> {
  const card = createAutoFrame(title, 'VERTICAL', 12, 20);
  card.resize(968, 80);
  card.layoutMode = 'VERTICAL';
  card.primaryAxisSizingMode = 'AUTO';
  card.counterAxisSizingMode = 'FIXED';
  card.layoutAlign = 'STRETCH';
  try {
    card.setPluginData('ds_forge:stretch', '1');
  } catch {
    // Ignore if pluginData restricted
  }
  card.cornerRadius = 8;
  card.strokeWeight = 1;
  applyNodeVariableBindings(
    card,
    { fill: 'semantic.surface.card', stroke: 'semantic.border.default' },
    ctx.tokensCtx,
  );
  const heading = await createDocText(ctx, title, {
    weight: 'SemiBold',
    size: 15,
    lineHeight: 22,
    stretch: true,
  });
  card.appendChild(heading);
  return card;
}

export async function ensureManagedPages(
  planPages: PlannedPage[],
  systemInstanceId: string,
  libraryId: string,
  packageVersion: string,
  existingRecord: InstalledSystemRecord | undefined,
  skipLogicalIds: ReadonlySet<string>,
  createdPageIds: string[],
  recordObject: (obj: ManagedObjectRecord) => void,
): Promise<Map<string, PageNode>> {
  const pagesByLogicalId = new Map<string, PageNode>();

  for (const planned of planPages) {
    let page: PageNode | undefined;
    const trackedId = existingRecord?.objects[planned.logicalId]?.figmaId;
    if (trackedId) {
      page = figma.root.children.find((p) => p.id === trackedId);
    }
    if (!page) {
      page = figma.root.children.find((p) => {
        const meta = getNodeManagedMeta(p);
        return meta?.systemInstanceId === systemInstanceId && meta?.logicalId === planned.logicalId;
      });
    }
    if (!page) {
      page = figma.root.children.find((p) => p.name === planned.title);
    }

    const skipRename = Boolean(page) && skipLogicalIds.has(planned.logicalId);
    if (!page) {
      page = figma.createPage();
      page.name = planned.title;
      createdPageIds.push(page.id);
    } else if (!skipRename && page.name !== planned.title) {
      page.name = planned.title;
    }

    const hash = `page:${planned.pageKey}:${page.name}`;
    setNodeManagedMeta(page, {
      systemInstanceId,
      libraryId,
      logicalId: planned.logicalId,
      objectKind: 'page',
      schemaVersion: SCHEMA_VERSION,
      packageVersion,
      generatorVersion: GENERATOR_VERSION,
      lastGeneratedHash: hash,
    });

    recordObject({
      logicalId: planned.logicalId,
      figmaId: page.id,
      objectKind: 'page',
      displayName: page.name,
      lastGeneratedHash: hash,
      managedFields: { name: page.name },
    });

    pagesByLogicalId.set(planned.logicalId, page);
  }

  // Order managed pages cleanly according to manifest order
  const orderedPages = [...planPages]
    .sort((a, b) => a.order - b.order)
    .map((p) => pagesByLogicalId.get(p.logicalId))
    .filter((p): p is PageNode => Boolean(p));

  const firstIdx = Math.max(
    0,
    figma.root.children.findIndex((p) => orderedPages.includes(p)),
  );
  for (let i = 0; i < orderedPages.length; i++) {
    const targetIdx = Math.min(figma.root.children.length - 1, firstIdx + i);
    try {
      figma.root.insertChild(targetIdx, orderedPages[i]);
    } catch {
      // Safe fallback if host restricts page index move
    }
  }

  return pagesByLogicalId;
}

async function activateDocPage(page: PageNode): Promise<void> {
  await page.loadAsync();
  if (figma.currentPage.id !== page.id) {
    await figma.setCurrentPageAsync(page);
  }
}

export async function renderStartHerePage(
  ctx: ComponentRenderContext,
  refreshedAtIso: string,
): Promise<void> {
  const page = ctx.pagesByLogicalId.get('page.start-here');
  if (!page) return;
  await activateDocPage(page);

  const locale = ctx.plan.config.locale;
  const root = getOrResetManagedRootFrame(
    page,
    'docs.start-here',
    `${ctx.plan.config.namespace} · Start Here Overview`,
    1040,
    ctx,
  );

  const title = await createDocText(
    ctx,
    `${ctx.plan.config.namespace} — ${ctx.plan.library.displayName} Design System`,
    { weight: 'Bold', size: 24, lineHeight: 32, stretch: true },
  );
  const subtitle = await createDocText(
    ctx,
    `${ctx.plan.library.tagline[locale]} • Package v${ctx.plan.library.packageVersion} • Generator v${GENERATOR_VERSION} • Refreshed ${refreshedAtIso}`,
    { size: 13, lineHeight: 20, colorTokenId: 'semantic.text.muted', stretch: true },
  );
  root.appendChild(title);
  root.appendChild(subtitle);

  const quickStartCard = await createSectionCard(
    ctx,
    locale === 'th' ? '1. วิธีเริ่มต้นใช้งานและการสลับ Light / Dark Mode' : '1. Quick Start & Light / Dark Theme Switching',
  );
  quickStartCard.appendChild(
    await createDocText(
      ctx,
      locale === 'th'
        ? '• ดึง Component จากแผง Assets ไปวางบน Frame ออกแบบของคุณได้ทันที\n• การสลับโหมดสีทำได้โดยเลือก Frame แม่ แล้วเปลี่ยน Variable Mode ของคอลเลกชัน Semantic เป็น Light หรือ Dark\n• ตัวอย่างทุกชิ้นในเอกสารสร้างจาก Instance ของ Main Component จริง ไม่ใช่ภาพนิ่ง และไม่ได้ถูก Detach'
        : '• Drag any component from the Assets panel into your product frames.\n• Switch Light / Dark theme by setting the Variable Mode of the Semantic collection on any parent Frame (or use Manage → Switch Canvas Theme).\n• All documentation examples use live linked Component Instances — zero screenshots or detached layers.',
      { size: 13, lineHeight: 21, stretch: true },
    ),
  );
  root.appendChild(quickStartCard);

  const scopeCard = await createSectionCard(
    ctx,
    locale === 'th' ? '2. ขอบเขตที่รองรับและค่าที่ตั้งไว้' : '2. Installed Scope & Active Configuration',
  );
  scopeCard.appendChild(
    await createDocText(
      ctx,
      `Library: ${ctx.plan.library.displayName} (${ctx.plan.library.source.repository} @ ${ctx.plan.library.source.pinnedRef})\n` +
        `Brand Primary: ${ctx.plan.config.brandHex} | Radius: ${ctx.plan.config.radiusPreset} | Density: ${ctx.plan.config.density} | Fidelity: ${ctx.plan.config.strictFidelity ? 'Strict Upstream' : 'Brand Customized'}\n` +
        `Components Installed: ${ctx.plan.estimates.userFacingComponents} families (${ctx.plan.estimates.totalVariants} variants) | Tokens: ${ctx.plan.estimates.variables} variables across 3 collections`,
      { size: 12, lineHeight: 20, mono: true, stretch: true },
    ),
  );
  root.appendChild(scopeCard);

  const licenseCard = await createSectionCard(
    ctx,
    locale === 'th' ? '3. แหล่งที่มาและสัญญาอนุญาต (Provenance & License)' : '3. Source Provenance & License Notice',
  );
  licenseCard.appendChild(
    await createDocText(
      ctx,
      `License: ${ctx.plan.library.source.spdxLicense} — ${ctx.plan.library.source.copyrightNotice}\n` +
        `Excluded Assets: ${ctx.plan.library.source.excludedUpstreamAssets.join(', ')}\n` +
        `Note: DS Forge is an independent clean-room generator and does not claim official partnership or trademark endorsement.`,
      { size: 12, lineHeight: 19, colorTokenId: 'semantic.text.muted', stretch: true },
    ),
  );
  root.appendChild(licenseCard);
  finalizeAutoLayoutStretch(root);
}

export async function renderFoundationsPage(
  ctx: ComponentRenderContext,
  refreshedAtIso: string,
): Promise<void> {
  const page = ctx.pagesByLogicalId.get('page.foundations');
  if (!page) return;
  await activateDocPage(page);

  const locale = ctx.plan.config.locale;
  const helperRack = page.children.find(
    (c): c is FrameNode =>
      c.type === 'FRAME' &&
      getNodeManagedMeta(c)?.logicalId === 'frame.foundations.helper-icons',
  );
  const foundationsY = helperRack ? helperRack.y + helperRack.height + 48 : 220;

  const root = getOrResetManagedRootFrame(
    page,
    'docs.foundations',
    `${ctx.plan.config.namespace} · Foundations & Token Architecture`,
    1040,
    ctx,
    'docs-section',
    80,
    foundationsY,
  );

  root.appendChild(
    await createDocText(
      ctx,
      locale === 'th'
        ? `พื้นฐานระบบออกแบบและโครงสร้างโทเคน (อัปเดตล่าสุด ${refreshedAtIso})`
        : `Design Foundations & Token Architecture (Last refreshed ${refreshedAtIso})`,
      { weight: 'Bold', size: 22, lineHeight: 30, stretch: true },
    ),
  );

  // 1. Token Layering Diagram Card
  const archCard = await createSectionCard(
    ctx,
    locale === 'th' ? 'โครงสร้างตัวแปร 3 ระดับ (Three-Tier Alias Chain)' : 'Three-Tier Variable Alias Architecture',
  );
  archCard.appendChild(
    await createDocText(
      ctx,
      `${ctx.plan.collections.componentName} [Base]  →  ${ctx.plan.collections.semanticName} [Light | Dark]  →  ${ctx.plan.collections.primitivesName} [Base]\n` +
        `Example: button/primary/background → action/primary/background → color/brand/600 (Light) | color/brand/400 (Dark)`,
      { size: 12, lineHeight: 20, mono: true, stretch: true },
    ),
  );
  root.appendChild(archCard);

  // 2. Semantic Color Swatches Grid
  const semanticColors = ctx.plan.tokens.filter(
    (t) => t.collection === 'semantic' && t.type === 'COLOR',
  );
  const colorCard = await createSectionCard(
    ctx,
    locale === 'th' ? `สีตามความหมาย (${semanticColors.length} ตัวแปร)` : `Semantic Color Roles (${semanticColors.length} Variables)`,
  );
  const swatchWrap = createAutoFrame('Swatches Grid', 'HORIZONTAL', 12, 0);
  swatchWrap.layoutWrap = 'WRAP';
  swatchWrap.layoutAlign = 'STRETCH';
  swatchWrap.counterAxisSpacing = 12;

  for (const tok of semanticColors) {
    const chip = createAutoFrame(`Swatch · ${tok.name}`, 'VERTICAL', 6, 10);
    chip.resize(210, 82);
    chip.layoutMode = 'VERTICAL';
    chip.primaryAxisSizingMode = 'AUTO';
    chip.counterAxisSizingMode = 'FIXED';
    chip.cornerRadius = 8;
    chip.strokeWeight = 1;
    applyNodeVariableBindings(
      chip,
      { fill: 'semantic.surface.background', stroke: 'semantic.border.default' },
      ctx.tokensCtx,
    );

    const previewBar = figma.createRectangle();
    previewBar.name = 'Color Bar';
    previewBar.resize(190, 28);
    previewBar.cornerRadius = 4;
    previewBar.strokeWeight = 1;
    applyNodeVariableBindings(
      previewBar,
      { fill: tok.logicalId, stroke: 'semantic.border.default' },
      ctx.tokensCtx,
    );
    chip.appendChild(previewBar);
    chip.appendChild(
      await createDocText(ctx, tok.name, { weight: 'Medium', size: 11, lineHeight: 15, mono: true }),
    );
    chip.appendChild(
      await createDocText(ctx, tok.sourceTokenName, {
        size: 10,
        lineHeight: 14,
        colorTokenId: 'semantic.text.muted',
        mono: true,
      }),
    );
    swatchWrap.appendChild(chip);
  }
  colorCard.appendChild(swatchWrap);
  root.appendChild(colorCard);

  // 3. Typography Scale
  const typoCard = await createSectionCard(
    ctx,
    locale === 'th' ? 'ระบบตัวอักษร (Typography Styles)' : 'Typography Styles',
  );
  for (const ts of ctx.plan.textStyles) {
    const row = createAutoFrame(`Type · ${ts.name}`, 'HORIZONTAL', 16, 8);
    row.layoutAlign = 'STRETCH';
    row.counterAxisAlignItems = 'CENTER';
    const sample = await createDocText(
      ctx,
      locale === 'th'
        ? `${ts.name} — ตัวอย่างข้อความภาษาไทยและ English ABC 123`
        : `${ts.name} — The quick brown fox jumps over 123`,
      { weight: ts.fontStyle, size: ts.fontSize, lineHeight: ts.lineHeightPx },
    );
    const styleObj = ctx.tokensCtx.textStylesByLogicalId.get(ts.logicalId);
    if (styleObj) {
      try {
        await figma.loadFontAsync(styleObj.fontName);
      } catch {
        // Already loaded via fallback
      }
      await sample.setTextStyleIdAsync(styleObj.id);
    }
    row.appendChild(sample);
    typoCard.appendChild(row);
  }
  root.appendChild(typoCard);

  // 4. Spacing, Radius & Elevation Summary
  const scaleCard = await createSectionCard(
    ctx,
    locale === 'th' ? 'ระยะห่าง ความโค้งมุม และเงา (Spacing, Radius & Elevation)' : 'Spacing, Radius & Elevation Tokens',
  );
  const floatTokens = ctx.plan.tokens
    .filter((t) => t.type === 'FLOAT' && (t.category === 'spacing' || t.category === 'radius' || t.category === 'size'))
    .map((t) => `${t.name} = ${t.valuesByMode.Base && t.valuesByMode.Base.kind === 'float' ? `${t.valuesByMode.Base.value}px` : 'alias'}`)
    .join('   •   ');
  scaleCard.appendChild(
    await createDocText(ctx, floatTokens, { size: 12, lineHeight: 20, mono: true, stretch: true }),
  );
  root.appendChild(scaleCard);
  finalizeAutoLayoutStretch(root);

  await ensurePreservedCustomNotesFrame(page, 'notes.foundations', root.y + root.height + 40, ctx);
}

export async function renderComponentDocumentationPage(
  compPlan: CompiledComponentPlan,
  ctx: ComponentRenderContext,
  refreshedAtIso: string,
): Promise<void> {
  const doc = compPlan.recipe.documentation;
  if (!doc) return;
  const page = ctx.pagesByLogicalId.get(`page.component.${compPlan.logicalId}`);
  if (!page) return;
  await activateDocPage(page);

  const entry = ctx.componentsByLogicalId.get(compPlan.logicalId);
  if (!entry) return;

  const locale = ctx.plan.config.locale;
  const showcaseFrame = page.children.find(
    (c): c is FrameNode =>
      c.type === 'FRAME' &&
      getNodeManagedMeta(c)?.logicalId === `frame.showcase.${compPlan.logicalId}`,
  );
  const docY = showcaseFrame ? showcaseFrame.y + showcaseFrame.height + 56 : 480;

  const docRoot = getOrResetManagedRootFrame(
    page,
    `docs.component.${compPlan.logicalId}`,
    `${compPlan.recipe.name} · Documentation & Live Examples`,
    1040,
    ctx,
    'docs-section',
    80,
    docY,
  );

  // Header + Snapshot Refresh Timestamp
  docRoot.appendChild(
    await createDocText(
      ctx,
      `${compPlan.recipe.displayName[locale]} — Specification & Usage`,
      { weight: 'Bold', size: 22, lineHeight: 30, stretch: true },
    ),
  );
  docRoot.appendChild(
    await createDocText(
      ctx,
      locale === 'th'
        ? `ข้อมูลตารางและเอกสารรีเฟรชล่าสุดเมื่อ: ${refreshedAtIso} (ใช้คำสั่ง Manage → Refresh Documentation เพื่ออัปเดตตาราง Snapshot)`
        : `Documentation snapshot refreshed at: ${refreshedAtIso} (Run Manage → Refresh Documentation to sync text tables after updates).`,
      { size: 11, lineHeight: 16, colorTokenId: 'semantic.text.muted', stretch: true },
    ),
  );

  // Section 1: Overview (Purpose, Usage scenarios, When not to use)
  const overviewCard = await createSectionCard(
    ctx,
    locale === 'th' ? '1. ภาพรวมและการเลือกใช้งาน (Overview)' : '1. Overview & Usage Scenarios',
  );
  overviewCard.appendChild(
    await createDocText(ctx, doc.purpose[locale], { size: 13, lineHeight: 20, stretch: true }),
  );
  overviewCard.appendChild(
    await createDocText(
      ctx,
      (locale === 'th' ? 'ควรใช้เมื่อ:\n' : 'When to use:\n') +
        doc.usageScenarios.map((u) => `• ${u[locale]}`).join('\n') +
        '\n\n' +
        (locale === 'th' ? 'ไม่ควรใช้เมื่อ:\n' : 'When not to use:\n') +
        doc.whenNotToUse.map((w) => `• ${w[locale]}`).join('\n'),
      { size: 12, lineHeight: 19, colorTokenId: 'semantic.text.muted', stretch: true },
    ),
  );
  docRoot.appendChild(overviewCard);

  // Section 2: Live Examples (Real Component Instances!)
  const examplesCard = await createSectionCard(
    ctx,
    locale === 'th' ? '2. ตัวอย่างจากอินสแตนซ์จริง (Live Component Instances)' : '2. Live Examples (Linked Instances)',
  );
  const examplesRow = createAutoFrame('Examples Row', 'HORIZONTAL', 20, 0);
  examplesRow.layoutWrap = 'WRAP';
  examplesRow.layoutAlign = 'STRETCH';
  examplesRow.counterAxisSpacing = 20;

  for (const ex of doc.examples) {
    const variantNode = resolveVariantComponent(entry, ex.variantProps);
    const liveInstance = variantNode.createInstance();
    liveInstance.name = `Instance · ${compPlan.recipe.name}`;
    if (ex.componentProps) {
      const mappedProps: Record<string, string | boolean> = {};
      for (const [logicalKey, val] of Object.entries(ex.componentProps)) {
        const figmaKey = entry.propertyKeyByLogicalKey.get(logicalKey);
        if (figmaKey) mappedProps[figmaKey] = val;
      }
      if (Object.keys(mappedProps).length > 0) {
        try {
          liveInstance.setProperties(mappedProps);
        } catch {
          // Ignore mismatched override safely
        }
      }
    }

    const exBoxWidth = Math.max(300, Math.min(920, Math.ceil(liveInstance.width) + 40));
    const exBox = createAutoFrame(`Example · ${ex.id}`, 'VERTICAL', 12, 16);
    exBox.clipsContent = false;
    exBox.resize(exBoxWidth, 120);
    exBox.layoutMode = 'VERTICAL';
    exBox.primaryAxisSizingMode = 'AUTO';
    exBox.counterAxisSizingMode = 'FIXED';
    exBox.cornerRadius = 8;
    exBox.strokeWeight = 1;
    applyNodeVariableBindings(
      exBox,
      { fill: 'semantic.surface.background', stroke: 'semantic.border.default' },
      ctx.tokensCtx,
    );

    exBox.appendChild(
      await createDocText(ctx, ex.title[locale], {
        weight: 'SemiBold',
        size: 13,
        lineHeight: 18,
        stretch: true,
      }),
    );
    exBox.appendChild(
      await createDocText(ctx, ex.description[locale], {
        size: 11,
        lineHeight: 16,
        colorTokenId: 'semantic.text.muted',
        stretch: true,
      }),
    );

    exBox.appendChild(liveInstance);
    examplesRow.appendChild(exBox);
  }
  examplesCard.appendChild(examplesRow);
  docRoot.appendChild(examplesCard);

  // Section 3: Anatomy & Properties
  const anatomyCard = await createSectionCard(
    ctx,
    locale === 'th' ? '3. โครงสร้างส่วนประกอบและพร็อพเพอร์ตี้ (Anatomy & Properties)' : '3. Anatomy, Variant Axes & Component Properties',
  );
  const anatomyLines = doc.anatomy
    .map(
      (a) =>
        `[${a.nodeId}] ${a.partName[locale]} (${a.required ? 'Required' : 'Optional'}) — ${a.roleDescription[locale]}`,
    )
    .join('\n');
  const axesLines = compPlan.recipe.variantAxes
    .map(
      (ax) =>
        `Variant Axis "${ax.name}": ${ax.values.join(' | ')} (Default: ${ax.defaultValue}) — ${ax.description[locale]}`,
    )
    .join('\n');
  const propLines = compPlan.recipe.properties
    .map(
      (p) =>
        `Property "${p.name}" [${p.type}] (Default: ${String(p.defaultValue)}) — ${p.description[locale]}`,
    )
    .join('\n');
  anatomyCard.appendChild(
    await createDocText(
      ctx,
      [anatomyLines, axesLines, propLines].filter(Boolean).join('\n\n'),
      { size: 12, lineHeight: 19, mono: true, stretch: true },
    ),
  );
  docRoot.appendChild(anatomyCard);

  // Section 4: States Matrix & Token Mapping
  const statesCard = await createSectionCard(
    ctx,
    locale === 'th' ? '4. ตารางสถานะและการผูกตัวแปร (States & Token Mapping)' : '4. State Matrix & Token Mapping',
  );
  const stateLines = doc.stateMatrix
    .map(
      (s) =>
        `• ${s.state}: ${s.visualSummary[locale]} (Runtime: ${s.runtimeNote[locale]})`,
    )
    .join('\n');

  // Collect bound token IDs referenced by this component
  const referencedTokenIds = new Set<string>();
  const scanBindings = (b?: Record<string, string | undefined>) => {
    for (const v of Object.values(b ?? {})) {
      if (v) referencedTokenIds.add(v);
    }
  };
  const walkSpec = (n: typeof compPlan.recipe.baseNode) => {
    scanBindings(n.bindings);
    for (const c of n.children ?? []) walkSpec(c);
  };
  walkSpec(compPlan.recipe.baseNode);
  for (const ov of compPlan.recipe.variantOverrides) {
    for (const patch of Object.values(ov.nodePatches)) {
      scanBindings(patch.bindings);
    }
  }
  const tokenMap = new Map(ctx.plan.tokens.map((t) => [t.logicalId, t]));
  const tokenLines = [...referencedTokenIds]
    .map((id) => {
      const tok = tokenMap.get(id);
      return tok
        ? `${tok.logicalId}  →  ${tok.name}  (${tok.sourceTokenName})`
        : id;
    })
    .join('\n');

  statesCard.appendChild(
    await createDocText(ctx, `${stateLines}\n\nBound Tokens:\n${tokenLines}`, {
      size: 12,
      lineHeight: 19,
      mono: true,
      stretch: true,
    }),
  );
  docRoot.appendChild(statesCard);

  // Section 5: Do & Don't (with Live Component Instances!)
  const doDontCard = await createSectionCard(
    ctx,
    locale === 'th' ? '5. แนวทางที่ควรทำและไม่ควรทำ (Do & Don’t)' : '5. Do & Don’t Guidelines',
  );
  const doDontRow = createAutoFrame('Do Dont Grid', 'HORIZONTAL', 20, 0);
  doDontRow.layoutAlign = 'STRETCH';
  doDontRow.layoutWrap = 'WRAP';

  for (const item of doc.doAndDont) {
    const sampleVariant = resolveVariantComponent(entry, item.exampleVariantProps);
    const sampleInstance = sampleVariant.createInstance();
    const boxWidth = Math.max(456, Math.min(920, Math.ceil(sampleInstance.width) + 40));

    const box = createAutoFrame(`${item.kind.toUpperCase()} Card`, 'VERTICAL', 10, 16);
    box.clipsContent = false;
    box.resize(boxWidth, 120);
    box.layoutMode = 'VERTICAL';
    box.primaryAxisSizingMode = 'AUTO';
    box.counterAxisSizingMode = 'FIXED';
    box.cornerRadius = 8;
    box.strokeWeight = 1;
    applyNodeVariableBindings(
      box,
      {
        fill: item.kind === 'do' ? 'semantic.feedback.success.subtle' : 'semantic.feedback.destructive.subtle',
        stroke: item.kind === 'do' ? 'semantic.feedback.success.bg' : 'semantic.feedback.destructive.bg',
      },
      ctx.tokensCtx,
    );
    const badgePrefix = item.kind === 'do' ? 'DO ✓ — ' : "DON'T ✕ — ";
    box.appendChild(
      await createDocText(ctx, `${badgePrefix}${item.title[locale]}`, {
        weight: 'SemiBold',
        size: 13,
        lineHeight: 19,
        stretch: true,
      }),
    );
    box.appendChild(
      await createDocText(ctx, item.rationale[locale], {
        size: 12,
        lineHeight: 18,
        colorTokenId: 'semantic.text.muted',
        stretch: true,
      }),
    );
    box.appendChild(sampleInstance);
    doDontRow.appendChild(box);
  }
  doDontCard.appendChild(doDontRow);
  docRoot.appendChild(doDontCard);

  // Section 6: Accessibility, Responsive, Content Guidelines & Source Provenance
  const a11yCard = await createSectionCard(
    ctx,
    locale === 'th'
      ? '6. การเข้าถึง การย่อขยาย แนวทางภาษาไทย/อังกฤษ และแหล่งอ้างอิง'
      : '6. Accessibility, Responsive Behavior, Content Guidelines & Provenance',
  );
  a11yCard.appendChild(
    await createDocText(
      ctx,
      [
        `Labeling: ${doc.accessibility.labelGuidance[locale]}`,
        `Contrast: ${doc.accessibility.contrastNotes[locale]}`,
        `Focus Visibility: ${doc.accessibility.focusVisibility[locale]}`,
        `Keyboard (Code Runtime): ${doc.accessibility.keyboardExpectations[locale]}`,
        `Responsive / Auto Layout: ${doc.responsiveGuidance[locale]}`,
        `Content (EN): ${doc.contentGuidelines.en}`,
        `Content (TH): ${doc.contentGuidelines.th}`,
        `Differences from Runtime Code: ${doc.differencesFromSource.map((d) => d[locale]).join(' ')}`,
        `Source: ${doc.sourceLinks.map((s) => `${s.label} (${s.url})`).join(', ')} — Pinned @ ${ctx.plan.library.source.pinnedRef}`,
      ].join('\n'),
      { size: 12, lineHeight: 19, stretch: true },
    ),
  );
  docRoot.appendChild(a11yCard);
  finalizeAutoLayoutStretch(docRoot);

  // Preserved user-owned Custom Notes section below managed documentation
  await ensurePreservedCustomNotesFrame(
    page,
    `notes.component.${compPlan.logicalId}`,
    docRoot.y + docRoot.height + 40,
    ctx,
  );
}

export async function renderPatternsPage(ctx: ComponentRenderContext): Promise<void> {
  const page = ctx.pagesByLogicalId.get('page.patterns');
  if (!page) return;
  await activateDocPage(page);

  const locale = ctx.plan.config.locale;
  const root = getOrResetManagedRootFrame(
    page,
    'docs.patterns',
    `${ctx.plan.config.namespace} · Composed UI Patterns`,
    1120,
    ctx,
    'pattern-frame',
  );

  root.appendChild(
    await createDocText(
      ctx,
      locale === 'th'
        ? 'รูปแบบหน้าจอมาตรฐาน (Patterns ที่ประกอบจาก Component Instances จริง)'
        : 'Composed UI Patterns (Built Exclusively from Live Component Instances)',
      { weight: 'Bold', size: 22, lineHeight: 30, stretch: true },
    ),
  );

  if (ctx.plan.selectedPatterns.length === 0) {
    root.appendChild(
      await createDocText(
        ctx,
        locale === 'th'
          ? 'ชุดคอมโพเนนต์ที่เลือกไว้ยังไม่ครบตามที่ Pattern ต้องการ (แนะนำเลือก Core scope เพื่อสร้างครบทุก Pattern)'
          : 'Selected custom component subset omits dependencies needed for full Patterns. Re-run with Core scope to materialize all Patterns.',
        { size: 13, lineHeight: 20, colorTokenId: 'semantic.text.muted', stretch: true },
      ),
    );
    return;
  }

  const row = createAutoFrame('Patterns Gallery', 'HORIZONTAL', 32, 0);
  row.layoutWrap = 'WRAP';
  row.layoutAlign = 'STRETCH';
  row.counterAxisSpacing = 32;

  for (const pat of ctx.plan.selectedPatterns) {
    const wrapper = createAutoFrame(`Pattern Card · ${pat.logicalId}`, 'VERTICAL', 12, 0);
    wrapper.appendChild(
      await createDocText(ctx, pat.name[locale], { weight: 'SemiBold', size: 15, lineHeight: 22 }),
    );
    wrapper.appendChild(
      await createDocText(ctx, pat.description[locale], {
        size: 12,
        lineHeight: 18,
        colorTokenId: 'semantic.text.muted',
      }),
    );
    const renderedPattern = await renderRecipeChildNode(pat.rootNode, ctx);
    finalizeComponentAutoLayout(renderedPattern);
    wrapper.appendChild(renderedPattern);
    row.appendChild(wrapper);
  }
  root.appendChild(row);
  finalizeAutoLayoutStretch(root);
}

/**
 * Renders side-by-side Light Mode and Dark Mode Playground frames with explicit
 * Semantic Variable Mode assignments to verify live theme inheritance (Section 11).
 */
export async function renderThemePlaygroundPage(ctx: ComponentRenderContext): Promise<void> {
  const page = ctx.pagesByLogicalId.get('page.playground');
  if (!page) return;
  await activateDocPage(page);

  const locale = ctx.plan.config.locale;
  const root = getOrResetManagedRootFrame(
    page,
    'docs.playground',
    `${ctx.plan.config.namespace} · Light & Dark Theme Playground`,
    1240,
    ctx,
    'playground-frame',
  );

  root.appendChild(
    await createDocText(
      ctx,
      locale === 'th'
        ? 'พื้นที่ทดสอบโหมดสว่างและโหมดมืดคู่กัน (Side-by-Side Variable Mode Inheritance)'
        : 'Side-by-Side Light & Dark Variable Mode Playground',
      { weight: 'Bold', size: 22, lineHeight: 30, stretch: true },
    ),
  );
  root.appendChild(
    await createDocText(
      ctx,
      locale === 'th'
        ? 'ทั้งสองคอลัมน์ใช้ Component Instances ชุดเดียวกันทุกประการ โดยเปลี่ยนเฉพาะ Explicit Variable Mode (Light vs Dark) บน Frame แม่'
        : 'Both columns instantiate the exact same Main Components; only the parent Frame Semantic mode (Light vs Dark) differs.',
      { size: 13, lineHeight: 20, colorTokenId: 'semantic.text.muted', stretch: true },
    ),
  );

  const columns = createAutoFrame('Theme Columns', 'HORIZONTAL', 28, 0);
  columns.layoutAlign = 'STRETCH';

  for (const theme of ['Light', 'Dark'] as const) {
    const modeId =
      theme === 'Light'
        ? ctx.tokensCtx.modeIds.semanticLight
        : ctx.tokensCtx.modeIds.semanticDark;
    const panelLogicalId = `playground.column.${theme.toLowerCase()}`;

    const col = createAutoFrame(`${theme} Mode Preview`, 'VERTICAL', 18, 24);
    col.clipsContent = false;
    col.resize(568, 200);
    col.layoutMode = 'VERTICAL';
    col.primaryAxisSizingMode = 'AUTO';
    col.counterAxisSizingMode = 'FIXED';
    col.cornerRadius = 12;
    col.strokeWeight = 1;
    applyNodeVariableBindings(
      col,
      { fill: 'semantic.surface.background', stroke: 'semantic.border.default' },
      ctx.tokensCtx,
    );

    // Explicitly assign Semantic Light or Dark mode to this Playground column frame!
    col.setExplicitVariableModeForCollection(ctx.tokensCtx.collections.semantic, modeId);

    setNodeManagedMeta(col, {
      systemInstanceId: ctx.systemInstanceId,
      libraryId: ctx.plan.library.libraryId,
      logicalId: panelLogicalId,
      objectKind: 'playground-frame',
      schemaVersion: SCHEMA_VERSION,
      packageVersion: ctx.plan.library.packageVersion,
      generatorVersion: GENERATOR_VERSION,
      lastGeneratedHash: `playground:${theme}`,
    });
    ctx.recordObject({
      logicalId: panelLogicalId,
      figmaId: col.id,
      objectKind: 'playground-frame',
      displayName: col.name,
      lastGeneratedHash: `playground:${theme}`,
      managedFields: { mode: theme },
    });

    col.appendChild(
      await createDocText(ctx, `${theme} Mode (${ctx.plan.collections.semanticName})`, {
        weight: 'SemiBold',
        size: 16,
        lineHeight: 24,
        stretch: true,
      }),
    );

    const userFacing = ctx.plan.orderedComponents.filter((c) => c.recipe.tier !== 'helper');
    for (const compPlan of userFacing) {
      const entry = ctx.componentsByLogicalId.get(compPlan.logicalId);
      if (!entry) continue;
      const itemRow = createAutoFrame(`Sample · ${compPlan.recipe.name}`, 'VERTICAL', 8, 14);
      itemRow.layoutAlign = 'STRETCH';
      itemRow.counterAxisSizingMode = 'FIXED';
      itemRow.cornerRadius = 8;
      itemRow.strokeWeight = 1;
      applyNodeVariableBindings(
        itemRow,
        { fill: 'semantic.surface.card', stroke: 'semantic.border.default' },
        ctx.tokensCtx,
      );
      itemRow.appendChild(
        await createDocText(ctx, compPlan.recipe.name, {
          weight: 'Medium',
          size: 11,
          lineHeight: 16,
          colorTokenId: 'semantic.text.muted',
          mono: true,
        }),
      );
      const inst = entry.defaultVariant.createInstance();
      itemRow.appendChild(inst);
      col.appendChild(itemRow);
    }

    columns.appendChild(col);
  }

  root.appendChild(columns);
  finalizeAutoLayoutStretch(root);
}

export async function renderQualityReportPage(
  ctx: ComponentRenderContext,
  report: ValidationReport,
): Promise<void> {
  const page = ctx.pagesByLogicalId.get('page.quality-report');
  if (!page) return;
  await activateDocPage(page);

  const root = getOrResetManagedRootFrame(
    page,
    'docs.quality-report',
    `${ctx.plan.config.namespace} · Quality & Validation Report`,
    1040,
    ctx,
  );

  root.appendChild(
    await createDocText(
      ctx,
      `Quality Gate & Validation Report — ${report.passed ? 'PASSED ✓' : 'ATTENTION REQUIRED !'}`,
      { weight: 'Bold', size: 22, lineHeight: 30, stretch: true },
    ),
  );
  root.appendChild(
    await createDocText(
      ctx,
      `Evaluated at ${report.timestamp} • Errors: ${report.summaryCounts.error} • Warnings: ${report.summaryCounts.warning} • Passed Checks: ${report.summaryCounts.pass}`,
      { size: 13, lineHeight: 20, colorTokenId: 'semantic.text.muted', stretch: true },
    ),
  );

  const catCard = await createSectionCard(ctx, 'Category Status Summary');
  const catSummary = Object.entries(report.categoryStatus)
    .map(([cat, status]) => `${cat.padEnd(14)} : ${status.toUpperCase()}`)
    .join('\n');
  catCard.appendChild(
    await createDocText(ctx, catSummary, { size: 12, lineHeight: 19, mono: true, stretch: true }),
  );
  root.appendChild(catCard);

  const contrastCard = await createSectionCard(
    ctx,
    `Declared Contrast Pair Checks (${report.contrastChecks.length} pairs — Not a full WCAG site audit guarantee)`,
  );
  const contrastLines = report.contrastChecks
    .map(
      (c) =>
        `[${c.passed ? 'PASS' : 'WARN'}] ${c.componentLogicalId} (${c.label}) — Light ${c.lightRatio ?? 'N/A'}:1 | Dark ${c.darkRatio ?? 'N/A'}:1 (min ${c.minRatio}:1)`,
    )
    .join('\n');
  contrastCard.appendChild(
    await createDocText(ctx, contrastLines || 'No contrast pairs declared.', {
      size: 12,
      lineHeight: 19,
      mono: true,
      stretch: true,
    }),
  );
  root.appendChild(contrastCard);

  const exceptionsCard = await createSectionCard(
    ctx,
    'Documented Non-Bindable Capability Exceptions & Font Fallback Log',
  );
  const excLines = report.nonBindableExceptions
    .map((e) => `• ${e.componentLogicalId}.${e.nodeId} [${e.field}]: ${e.reason}`)
    .join('\n');
  const fontLines =
    ctx.fontManager.fallbackNotes.length > 0
      ? ctx.fontManager.fallbackNotes
          .map(
            (f) =>
              `• Font fallback: ${f.requestedFamily} (${f.requestedStyle}) → ${f.resolvedFamily} (${f.resolvedStyle}) — ${f.reason}`,
          )
          .join('\n')
      : '• All requested fonts loaded without substitution.';
  exceptionsCard.appendChild(
    await createDocText(ctx, `${excLines || '• Zero component exceptions.'}\n\n${fontLines}`, {
      size: 12,
      lineHeight: 19,
      mono: true,
      stretch: true,
    }),
  );
  root.appendChild(exceptionsCard);

  if (report.issues.length > 0) {
    const issuesCard = await createSectionCard(ctx, 'Detailed Diagnostic Findings');
    const issueLines = report.issues
      .map((i) => `[${i.severity.toUpperCase()}] (${i.category}) ${i.title}: ${i.detail}`)
      .join('\n');
    issuesCard.appendChild(
      await createDocText(ctx, issueLines, { size: 12, lineHeight: 19, mono: true, stretch: true }),
    );
    root.appendChild(issuesCard);
  }
  finalizeAutoLayoutStretch(root);
}

export async function renderChangelogAndLicensePage(ctx: ComponentRenderContext): Promise<void> {
  const page = ctx.pagesByLogicalId.get('page.changelog-license');
  if (!page) return;
  await activateDocPage(page);

  const src = ctx.plan.library.source;
  const locale = ctx.plan.config.locale;
  const root = getOrResetManagedRootFrame(
    page,
    'docs.changelog-license',
    `${ctx.plan.config.namespace} · Changelog, Provenance & License`,
    1040,
    ctx,
  );

  root.appendChild(
    await createDocText(ctx, 'Source Provenance, Asset Inventory & License Notices', {
      weight: 'Bold',
      size: 22,
      lineHeight: 30,
      stretch: true,
    }),
  );

  const provCard = await createSectionCard(ctx, 'Upstream Source Pin & Asset Inventory');
  const inventoryLines = src.assetInventory
    .map((a) => `• [${a.assetType}] ${a.name} (${a.spdxLicense}) — ${a.provenance}`)
    .join('\n');
  provCard.appendChild(
    await createDocText(
      ctx,
      `Repository: ${src.repository}\nPinned Ref: ${src.pinnedRef} (Upstream v${src.sourceVersion})\nSPDX License: ${src.spdxLicense}\nCopyright: ${src.copyrightNotice}\nInspected Paths: ${src.inspectedPaths.join(', ')}\n\nAsset Inventory:\n${inventoryLines}`,
      { size: 12, lineHeight: 19, mono: true, stretch: true },
    ),
  );
  root.appendChild(provCard);

  if (src.noticeText || (src.modifications && src.modifications.length > 0)) {
    const noticeCard = await createSectionCard(ctx, 'NOTICE & Derivative Modification Log');
    const modLines = (src.modifications ?? [])
      .map((m) => `• [${m.date}] ${m.scope}: ${m.summary}`)
      .join('\n');
    noticeCard.appendChild(
      await createDocText(
        ctx,
        `${src.noticeText ?? ''}\n\nModifications:\n${modLines}`,
        { size: 12, lineHeight: 19, mono: true, stretch: true },
      ),
    );
    root.appendChild(noticeCard);
  }

  const licTextCard = await createSectionCard(ctx, 'Full License Text');
  licTextCard.appendChild(
    await createDocText(ctx, src.licenseText, {
      size: 11,
      lineHeight: 17,
      mono: true,
      colorTokenId: 'semantic.text.muted',
      stretch: true,
    }),
  );
  root.appendChild(licTextCard);

  const changelogCard = await createSectionCard(ctx, 'Package Changelog');
  const logLines = ctx.plan.library.changelog
    .map((c) => `v${c.version} (${c.date}) — ${c.notes[locale]}`)
    .join('\n');
  changelogCard.appendChild(
    await createDocText(ctx, logLines, { size: 12, lineHeight: 19, stretch: true }),
  );
  root.appendChild(changelogCard);
  finalizeAutoLayoutStretch(root);
}
