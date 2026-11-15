import type { LibraryDefinition, TokenDefinition } from '@schema';
import { createHelperIconRecipes } from '../shared/icons';
import { MIT_LICENSE_TEMPLATE } from '../shared/licenses';
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

const MUI_NAME_MAP: Record<string, { name: string; source: string; code: string }> = {
  'semantic.surface.background': { name: 'palette/background/default', source: 'theme.palette.background.default', code: 'var(--mui-palette-background-default)' },
  'semantic.surface.card': { name: 'palette/background/paper', source: 'theme.palette.background.paper', code: 'var(--mui-palette-background-paper)' },
  'semantic.surface.muted': { name: 'palette/action/hover', source: 'theme.palette.action.hover', code: 'var(--mui-palette-action-hover)' },
  'semantic.surface.accent': { name: 'palette/action/selected', source: 'theme.palette.action.selected', code: 'var(--mui-palette-action-selected)' },
  'semantic.text.primary': { name: 'palette/text/primary', source: 'theme.palette.text.primary', code: 'var(--mui-palette-text-primary)' },
  'semantic.text.muted': { name: 'palette/text/secondary', source: 'theme.palette.text.secondary', code: 'var(--mui-palette-text-secondary)' },
  'semantic.action.primary.bg': { name: 'palette/primary/main', source: 'theme.palette.primary.main', code: 'var(--mui-palette-primary-main)' },
  'semantic.action.primary.hover': { name: 'palette/primary/dark', source: 'theme.palette.primary.dark', code: 'var(--mui-palette-primary-dark)' },
  'semantic.action.primary.fg': { name: 'palette/primary/contrastText', source: 'theme.palette.primary.contrastText', code: 'var(--mui-palette-primary-contrastText)' },
  'semantic.border.default': { name: 'palette/divider', source: 'theme.palette.divider', code: 'var(--mui-palette-divider)' },
  'semantic.feedback.destructive.bg': { name: 'palette/error/main', source: 'theme.palette.error.main', code: 'var(--mui-palette-error-main)' },
  'semantic.feedback.success.bg': { name: 'palette/success/main', source: 'theme.palette.success.main', code: 'var(--mui-palette-success-main)' },
  'semantic.feedback.warning.bg': { name: 'palette/warning/main', source: 'theme.palette.warning.main', code: 'var(--mui-palette-warning-main)' },
  'component.button.primary.bg': { name: 'MuiButton/containedPrimaryBg', source: 'MuiButton.styleOverrides.containedPrimary', code: 'var(--mui-palette-primary-main)' },
  'component.button.radius': { name: 'shape/borderRadius', source: 'theme.shape.borderRadius', code: 'var(--mui-shape-borderRadius)' },
  'component.input.bg': { name: 'MuiOutlinedInput/background', source: 'MuiOutlinedInput.root.backgroundColor', code: 'var(--mui-palette-background-paper)' },
  'component.card.bg': { name: 'MuiPaper/elevation1Bg', source: 'MuiCard.root.backgroundColor', code: 'var(--mui-palette-background-paper)' },
};

function buildMuiTokens(): TokenDefinition[] {
  return buildShadcnTokens().map((tok) => {
    const mapped = MUI_NAME_MAP[tok.logicalId];
    return {
      ...tok,
      name: mapped ? mapped.name : tok.name,
      sourceTokenName: mapped ? mapped.source : tok.sourceTokenName,
      codeSyntax: mapped ? { WEB: mapped.code } : tok.codeSyntax,
      sourceVersion: '6.4.5',
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

const CORE_10_IDS = new Set([
  'button',
  'input',
  'checkbox',
  'switch',
  'select',
  'badge',
  'card',
  'tabs',
  'alert',
  'dialog',
]);

export const muiLibrary: LibraryDefinition = {
  schemaVersion: 1,
  libraryId: 'mui',
  displayName: 'Material UI Core',
  vendorOrOrigin: 'mui/material-ui (MIT Core Only)',
  tagline: {
    en: 'MIT Material UI v6 CSS theme variables, palette.primary/paper semantics, and 10 Core families.',
    th: 'ระบบโทเคน Material UI Core v6 (เฉพาะชุด MIT ฟรี) รักษาโครงสร้าง palette และ shape ครบ 10 ตระกูลหลัก',
  },
  coverageSummary: {
    en: 'Covers 10 MIT Material UI Core families; explicitly excludes MUI X Pro/Premium and commercial Figma kits.',
    th: 'ครอบคลุม 10 คอมโพเนนต์หลักจาก MUI Core (MIT) ไม่รวม MUI X Pro/Premium หรือชุดออกแบบเชิงพาณิชย์',
  },
  packageVersion: '0.1.0',
  catalogOrder: 3,
  readiness: 'ready',
  defaultNamespace: 'Acme · MUI Core',
  source: {
    repository: 'https://github.com/mui/material-ui',
    pinnedRef: 'mui-v6.4.5-4b19d20a',
    sourceVersion: '6.4.5',
    spdxLicense: 'MIT',
    copyrightNotice: 'Copyright (c) 2014 Call-Em-All (Material-UI / MUI)',
    licenseUrl: 'https://github.com/mui/material-ui/blob/master/LICENSE',
    licenseText: MIT_LICENSE_TEMPLATE('Copyright (c) 2014 Call-Em-All'),
    inspectedPaths: [
      'packages/mui-material/src/styles/createPalette.js',
      'packages/mui-material/src/Button/*',
      'LICENSE',
    ],
    excludedUpstreamAssets: [
      'MUI X Pro and MUI X Premium packages',
      'Commercial MUI for Figma paid design kit assets',
      'MUI company logos and trademarks',
    ],
    assetInventory: [
      {
        assetType: 'tokens',
        name: 'MUI v6 CSS Theme Variables Palette & Shape Mapping',
        spdxLicense: 'MIT',
        provenance: 'Mapped from @mui/material v6.4.5 createTheme / CssVarsProvider specs',
      },
      {
        assetType: 'recipe',
        name: '10 Clean-Room MUI Core Component Recipes',
        spdxLicense: 'MIT',
        provenance: 'Authored in-house for DS Forge from MIT @mui/material component specs',
      },
    ],
  },
  capabilities: {
    themes: ['light', 'dark'],
    locales: ['en', 'th'],
    brandColor: true,
    fontCustomization: true,
    radiusCustomization: true,
    supportedRadiusPresets: ['none', 'sm', 'md', 'lg', 'full'],
    density: false,
    supportedDensities: ['default'],
    tokenPrefixCustomization: true,
  },
  brandPresets: [
    { id: 'mui-blue', label: { en: 'MUI Blue 700', th: 'น้ำเงิน MUI มาตรฐาน' }, primaryHex: '#1976D2' },
    { id: 'indigo', label: { en: 'Deep Indigo', th: 'ครามเข้ม' }, primaryHex: '#3F51B5' },
    { id: 'teal', label: { en: 'Material Teal', th: 'เขียวอมฟ้า' }, primaryHex: '#00796B' },
    { id: 'purple', label: { en: 'Royal Purple', th: 'ม่วงเข้ม' }, primaryHex: '#7B1FA2' },
  ],
  defaultBrandHex: '#1976D2',
  fontPresets: [
    {
      id: 'roboto',
      label: 'Roboto + Noto Sans Thai',
      sansFamily: 'Roboto',
      monoFamily: 'Roboto Mono',
      thaiFallbackFamily: 'Noto Sans Thai',
    },
    {
      id: 'inter',
      label: 'Inter + Noto Sans Thai',
      sansFamily: 'Inter',
      monoFamily: 'Roboto Mono',
      thaiFallbackFamily: 'Noto Sans Thai',
    },
  ],
  defaultFontPresetId: 'roboto',
  defaultRadiusPreset: 'sm',
  previewFixture: {
    fixtureVersion: '0.1.0',
    buttonLabel: { en: 'Create Resource', th: 'สร้างรายการ' },
    secondaryButtonLabel: { en: 'Discard', th: 'ยกเลิก' },
    inputPlaceholder: { en: 'Outlined TextField...', th: 'กรอกข้อมูลในช่อง...' },
    cardTitle: { en: 'MUI CssVarsProvider Palette', th: 'ชุดสี MUI CssVarsProvider' },
    cardBody: {
      en: 'Maps palette.primary.main, background.paper, and shape.borderRadius to native Figma Variables.',
      th: 'เชื่อมโยง palette.primary.main, background.paper และความโค้งมุมเข้ากับตัวแปร Figma โดยตรง',
    },
    navItems: [
      { en: 'Summary', th: 'สรุปผล' },
      { en: 'Palette', th: 'ชุดสี' },
      { en: 'Surfaces', th: 'พื้นผิว' },
    ],
    simulatedAttributes: ['palette.primary', 'shape.borderRadius', 'Paper Surface Mode', 'Locale'],
    nonSimulatedLimitations: {
      en: 'TouchRipple animation and floating InputLabel shrink transition are runtime React behaviors.',
      th: 'แอนิเมชัน TouchRipple และการย่อป้ายชื่อลอยตัวเป็นพฤติกรรมของโค้ด React ตอนทำงานจริง',
    },
  },
  tokens: buildMuiTokens(),
  textStyles: buildStandardTextStyles(STYLE_REFS),
  effectStyles: buildStandardEffectStyles(STYLE_REFS),
  components: [
    ...createHelperIconRecipes('semantic.text.primary'),
    ...[
      ...buildControlComponentRecipes(SHADCN_BINDINGS, {
        libraryLabel: 'MUI Core',
        docsBaseUrl: 'https://mui.com/material-ui/react',
        pillBadges: true,
      }),
      ...buildSurfaceComponentRecipes(SHADCN_BINDINGS, {
        libraryLabel: 'MUI Core',
        docsBaseUrl: 'https://mui.com/material-ui/react',
      }),
    ].filter((c) => CORE_10_IDS.has(c.logicalId)),
  ],
  patterns: buildStandardPatterns(SHADCN_BINDINGS),
  changelog: [
    {
      version: '0.1.0',
      date: '2026-11-15',
      notes: {
        en: 'Initial Ready release of MIT Material UI Core v6 adapter.',
        th: 'เปิดใช้งานชุด Material UI Core v6 (MIT) รุ่นแรก',
      },
    },
  ],
  migrations: [],
};
