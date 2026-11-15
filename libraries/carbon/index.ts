import type { LibraryDefinition, TokenDefinition } from '@schema';
import { createHelperIconRecipes } from '../shared/icons';
import { APACHE_2_LICENSE_EXCERPT_FULL } from '../shared/licenses';
import { buildControlComponentRecipes } from '../shared/recipe-factory-controls';
import {
  buildStandardPatterns,
  buildSurfaceComponentRecipes,
} from '../shared/recipe-factory-surfaces';
import {
  buildStandardEffectStyles,
  buildStandardTextStyles,
} from '../shared/styles-builder';
import { SHADCN_BINDINGS } from '../shadcn';
import { buildShadcnTokens } from '../shadcn/tokens';

const CARBON_NAME_MAP: Record<string, { name: string; source: string; code: string }> = {
  'semantic.surface.background': { name: 'theme/background', source: '$background', code: 'var(--cds-background)' },
  'semantic.surface.card': { name: 'layer/layer-01', source: '$layer-01', code: 'var(--cds-layer-01)' },
  'semantic.surface.muted': { name: 'layer/layer-02', source: '$layer-02', code: 'var(--cds-layer-02)' },
  'semantic.surface.accent': { name: 'layer/layer-hover-01', source: '$layer-hover-01', code: 'var(--cds-layer-hover-01)' },
  'semantic.text.primary': { name: 'text/text-primary', source: '$text-primary', code: 'var(--cds-text-primary)' },
  'semantic.text.muted': { name: 'text/text-secondary', source: '$text-secondary', code: 'var(--cds-text-secondary)' },
  'semantic.action.primary.bg': { name: 'interactive/interactive', source: '$interactive', code: 'var(--cds-interactive)' },
  'semantic.action.primary.hover': { name: 'interactive/button-primary-hover', source: '$button-primary-hover', code: 'var(--cds-button-primary-hover)' },
  'semantic.action.primary.pressed': { name: 'interactive/button-primary-active', source: '$button-primary-active', code: 'var(--cds-button-primary-active)' },
  'semantic.action.primary.fg': { name: 'text/text-on-color', source: '$text-on-color', code: 'var(--cds-text-on-color)' },
  'semantic.border.default': { name: 'border/border-subtle-01', source: '$border-subtle-01', code: 'var(--cds-border-subtle-01)' },
  'semantic.border.input': { name: 'border/border-strong-01', source: '$border-strong-01', code: 'var(--cds-border-strong-01)' },
  'semantic.border.focus': { name: 'focus/focus', source: '$focus', code: 'var(--cds-focus)' },
  'semantic.feedback.destructive.bg': { name: 'support/support-error', source: '$support-error', code: 'var(--cds-support-error)' },
  'semantic.feedback.success.bg': { name: 'support/support-success', source: '$support-success', code: 'var(--cds-support-success)' },
  'semantic.feedback.warning.bg': { name: 'support/support-warning', source: '$support-warning', code: 'var(--cds-support-warning)' },
};

function buildCarbonTokens(): TokenDefinition[] {
  return buildShadcnTokens().map((tok) => {
    const mapped = CARBON_NAME_MAP[tok.logicalId];
    let adjustedValues = tok.valuesByMode;
    if (
      tok.logicalId === 'primitive.radius.sm' ||
      tok.logicalId === 'primitive.radius.md' ||
      tok.logicalId === 'primitive.radius.lg'
    ) {
      adjustedValues = { Base: { kind: 'float', value: 0, radiusScaleFactor: 0 } };
    }
    return {
      ...tok,
      name: mapped ? mapped.name : tok.name,
      sourceTokenName: mapped ? mapped.source : tok.sourceTokenName,
      valuesByMode: adjustedValues,
      codeSyntax: mapped ? { WEB: mapped.code } : tok.codeSyntax,
      sourceVersion: '11.76.0',
    };
  });
}

const STYLE_REFS = {
  fontSansTokenId: 'primitive.font.sans',
  fontMonoTokenId: 'primitive.font.mono',
  fontSizeXsTokenId: 'primitive.font.size.xs',
  fontSizeSmTokenId: 'primitive.font.size.sm',
  fontSizeMdTokenId: 'primitive.font.size.md',
  fontSizeLgTokenId: 'primitive.font.size.lg',
  fontSizeXlTokenId: 'primitive.font.size.xl',
  fontSize2xlTokenId: 'primitive.font.size.2xl',
  lineHeightTightTokenId: 'primitive.font.line.tight',
  lineHeightNormalTokenId: 'primitive.font.line.normal',
  lineHeightRelaxedTokenId: 'primitive.font.line.relaxed',
  shadowColorTokenId: 'semantic.elevation.shadow',
  focusRingColorTokenId: 'semantic.border.focus',
};

const CARBON_BETA_IDS = new Set(['button', 'input', 'checkbox', 'badge', 'card', 'alert']);

export const carbonLibrary: LibraryDefinition = {
  schemaVersion: 1,
  libraryId: 'carbon',
  displayName: 'Carbon Design System',
  vendorOrOrigin: 'carbon-design-system/carbon (Apache-2.0 Beta Slice)',
  tagline: {
    en: 'IBM Carbon v11 White/G100 theme & $layer-01/$layer-02 token semantics with crisp 0px geometry.',
    th: 'ระบบโทเคน Carbon v11 รักษาความหมายของ $layer-01/$layer-02 พร้อมบันทึกสิทธิ์ Apache 2.0 ครบถ้วน',
  },
  coverageSummary: {
    en: 'Beta slice covering 6 foundational Carbon families (Button, Input, Checkbox, Tag/Badge, Tile/Card, InlineNotification/Alert).',
    th: 'ชุด Beta ครอบคลุม 6 ตระกูลพื้นฐานพร้อมโครงสร้างตัวแปร Layer ของ Carbon v11',
  },
  packageVersion: '0.1.0',
  catalogOrder: 9,
  readiness: 'beta',
  defaultNamespace: 'Acme · Carbon',
  source: {
    repository: 'https://github.com/carbon-design-system/carbon',
    pinnedRef: 'carbon-v11.76.0-f3109d2c',
    sourceVersion: '11.76.0',
    spdxLicense: 'Apache-2.0',
    copyrightNotice: 'Copyright 2016, 2026 IBM Corp.',
    licenseUrl: 'https://github.com/carbon-design-system/carbon/blob/main/LICENSE',
    licenseText: APACHE_2_LICENSE_EXCERPT_FULL,
    noticeText:
      'Carbon Design System — Copyright 2016, 2026 IBM Corp. Licensed under the Apache License, Version 2.0. Token names ($background, $layer-01, $layer-02, $interactive, $focus) are adapted from @carbon/themes.',
    modifications: [
      {
        scope: 'Token & Recipe Adaptation',
        summary:
          'Mapped @carbon/themes White (Light) and G100 (Dark) token roles into 3-tier Figma Variable collections and authored clean-room Auto Layout component recipes.',
        date: '2026-11-15',
      },
    ],
    inspectedPaths: [
      'packages/themes/src/white.js',
      'packages/themes/src/g100.js',
      'LICENSE',
    ],
    excludedUpstreamAssets: [
      'IBM eight-bar logo and Carbon trademark badges',
      'Unmodified upstream Figma Community file nodes',
    ],
    assetInventory: [
      {
        assetType: 'tokens',
        name: '@carbon/themes White & G100 Layer Token Mapping',
        spdxLicense: 'Apache-2.0',
        provenance: 'Derived from carbon-design-system/carbon packages/themes @ v11.76.0 with NOTICE preserved',
      },
      {
        assetType: 'recipe',
        name: '6 Clean-Room Carbon Geometry Component Recipes',
        spdxLicense: 'MIT',
        provenance: 'Authored in-house for DS Forge',
      },
    ],
  },
  capabilities: {
    themes: ['light', 'dark'],
    locales: ['en', 'th'],
    brandColor: true,
    fontCustomization: true,
    radiusCustomization: false,
    supportedRadiusPresets: ['none'],
    density: true,
    supportedDensities: ['default', 'compact'],
    tokenPrefixCustomization: true,
  },
  brandPresets: [
    { id: 'ibm-blue-60', label: { en: 'IBM Blue 60', th: 'น้ำเงิน IBM 60' }, primaryHex: '#0F62FE' },
    { id: 'teal-60', label: { en: 'Carbon Teal 60', th: 'เขียวอมฟ้า 60' }, primaryHex: '#007D79' },
    { id: 'purple-60', label: { en: 'Carbon Purple 60', th: 'ม่วง 60' }, primaryHex: '#8A3FFC' },
  ],
  defaultBrandHex: '#0F62FE',
  fontPresets: [
    {
      id: 'ibm-plex',
      label: 'IBM Plex Sans + IBM Plex Sans Thai',
      sansFamily: 'IBM Plex Sans',
      monoFamily: 'IBM Plex Mono',
      thaiFallbackFamily: 'IBM Plex Sans Thai',
    },
    {
      id: 'inter',
      label: 'Inter + Noto Sans Thai',
      sansFamily: 'Inter',
      monoFamily: 'Roboto Mono',
      thaiFallbackFamily: 'Noto Sans Thai',
    },
  ],
  defaultFontPresetId: 'ibm-plex',
  defaultRadiusPreset: 'none',
  previewFixture: {
    fixtureVersion: '0.1.0',
    buttonLabel: { en: 'Provision cluster', th: 'สร้างคลัสเตอร์' },
    secondaryButtonLabel: { en: 'Configure', th: 'ตั้งค่า' },
    inputPlaceholder: { en: 'Filter resources...', th: 'กรองทรัพยากร...' },
    cardTitle: { en: 'Carbon White / G100 Layers', th: 'ระบบเลเยอร์ Carbon White / G100' },
    cardBody: {
      en: 'Sharp 0px architectural corners with $layer-01 / $layer-02 token hierarchy and Apache 2.0 NOTICE tracking.',
      th: 'ดีไซน์มุมฉากคมชัด 0px รักษาความหมายของเลเยอร์ $layer-01 / $layer-02 พร้อมบันทึกสิทธิ์ Apache 2.0',
    },
    navItems: [
      { en: 'Catalog', th: 'แคตตาล็อก' },
      { en: 'Layers', th: 'เลเยอร์' },
      { en: 'Notices', th: 'ใบอนุญาต' },
    ],
    simulatedAttributes: ['$interactive Hue', 'Sharp 0px Geometry', 'White / G100 Theme'],
    nonSimulatedLimitations: {
      en: 'Radius customization is intentionally disabled on Carbon to preserve authentic 0px grid alignment.',
      th: 'ปิดการปรับความโค้งมุมเพื่อให้ตรงตามเอกลักษณ์มุมฉาก 0px ของระบบออกแบบ Carbon',
    },
  },
  tokens: buildCarbonTokens(),
  textStyles: buildStandardTextStyles(STYLE_REFS),
  effectStyles: buildStandardEffectStyles(STYLE_REFS),
  components: [
    ...createHelperIconRecipes('semantic.text.primary'),
    ...[
      ...buildControlComponentRecipes(SHADCN_BINDINGS, {
        libraryLabel: 'Carbon v11',
        docsBaseUrl: 'https://carbondesignsystem.com/components',
        pillBadges: true,
        sharpCornersByDefault: true,
      }),
      ...buildSurfaceComponentRecipes(SHADCN_BINDINGS, {
        libraryLabel: 'Carbon v11',
        docsBaseUrl: 'https://carbondesignsystem.com/components',
        sharpCornersByDefault: true,
      }),
    ].filter((c) => CARBON_BETA_IDS.has(c.logicalId)),
  ],
  patterns: buildStandardPatterns(SHADCN_BINDINGS).filter((p) =>
    p.requiredComponents.every((id) => CARBON_BETA_IDS.has(id)),
  ),
  changelog: [
    {
      version: '0.1.0',
      date: '2026-11-15',
      notes: {
        en: 'Beta release with 6 Carbon families, White/G100 layer tokens, and Apache-2.0 provenance.',
        th: 'รุ่นทดสอบ Beta ครอบคลุม 6 ตระกูลพื้นฐาน เลเยอร์โหมดสว่าง/มืด และข้อมูลลิขสิทธิ์ Apache-2.0',
      },
    },
  ],
  migrations: [],
};
