import type { LibraryDefinition, TokenDefinition } from '@schema';
import { createHelperIconRecipes } from '../shared/icons';
import { MIT_LICENSE_TEMPLATE } from '../shared/licenses';
import { buildControlComponentRecipes } from '../shared/recipe-factory-controls';
import {
  buildStandardPatterns,
  buildSurfaceComponentRecipes,
} from '../shared/recipe-factory-surfaces';
import { SHADCN_BINDINGS } from '../shadcn';
import { buildShadcnTokens } from '../shadcn/tokens';
import {
  buildStandardEffectStyles,
  buildStandardTextStyles,
} from '../shared/styles-builder';

const ANTD_NAME_MAP: Record<string, { name: string; source: string; code: string }> = {
  'semantic.surface.background': { name: 'map/colorBgLayout', source: 'token.colorBgLayout', code: 'token.colorBgLayout' },
  'semantic.surface.card': { name: 'map/colorBgContainer', source: 'token.colorBgContainer', code: 'token.colorBgContainer' },
  'semantic.surface.muted': { name: 'map/colorFillAlter', source: 'token.colorFillAlter', code: 'token.colorFillAlter' },
  'semantic.surface.accent': { name: 'map/colorFillSecondary', source: 'token.colorFillSecondary', code: 'token.colorFillSecondary' },
  'semantic.surface.inverse': { name: 'map/colorBgSpotlight', source: 'token.colorBgSpotlight', code: 'token.colorBgSpotlight' },
  'semantic.text.primary': { name: 'map/colorText', source: 'token.colorText', code: 'token.colorText' },
  'semantic.text.muted': { name: 'map/colorTextSecondary', source: 'token.colorTextSecondary', code: 'token.colorTextSecondary' },
  'semantic.text.inverse': { name: 'map/colorTextLightSolid', source: 'token.colorTextLightSolid', code: 'token.colorTextLightSolid' },
  'semantic.action.primary.bg': { name: 'seed/colorPrimary', source: 'token.colorPrimary', code: 'token.colorPrimary' },
  'semantic.action.primary.hover': { name: 'map/colorPrimaryHover', source: 'token.colorPrimaryHover', code: 'token.colorPrimaryHover' },
  'semantic.action.primary.pressed': { name: 'map/colorPrimaryActive', source: 'token.colorPrimaryActive', code: 'token.colorPrimaryActive' },
  'semantic.action.primary.fg': { name: 'map/colorTextOnPrimary', source: 'token.colorTextLightSolid', code: 'token.colorTextLightSolid' },
  'semantic.border.default': { name: 'map/colorBorderSecondary', source: 'token.colorBorderSecondary', code: 'token.colorBorderSecondary' },
  'semantic.border.input': { name: 'map/colorBorder', source: 'token.colorBorder', code: 'token.colorBorder' },
  'semantic.border.focus': { name: 'map/colorPrimaryBorder', source: 'token.colorPrimaryBorder', code: 'token.colorPrimaryBorder' },
  'semantic.feedback.destructive.bg': { name: 'seed/colorError', source: 'token.colorError', code: 'token.colorError' },
  'semantic.feedback.destructive.subtle': { name: 'map/colorErrorBg', source: 'token.colorErrorBg', code: 'token.colorErrorBg' },
  'semantic.feedback.success.bg': { name: 'seed/colorSuccess', source: 'token.colorSuccess', code: 'token.colorSuccess' },
  'semantic.feedback.success.subtle': { name: 'map/colorSuccessBg', source: 'token.colorSuccessBg', code: 'token.colorSuccessBg' },
  'semantic.feedback.warning.bg': { name: 'seed/colorWarning', source: 'token.colorWarning', code: 'token.colorWarning' },
  'semantic.feedback.warning.subtle': { name: 'map/colorWarningBg', source: 'token.colorWarningBg', code: 'token.colorWarningBg' },
  'component.button.primary.bg': { name: 'Button/primaryBg', source: 'components.Button.colorPrimary', code: 'components.Button.colorPrimary' },
  'component.button.primary.hover': { name: 'Button/primaryHoverBg', source: 'components.Button.colorPrimaryHover', code: 'components.Button.colorPrimaryHover' },
  'component.button.primary.pressed': { name: 'Button/primaryActiveBg', source: 'components.Button.colorPrimaryActive', code: 'components.Button.colorPrimaryActive' },
  'component.button.primary.fg': { name: 'Button/primaryColor', source: 'components.Button.primaryColor', code: 'components.Button.primaryColor' },
  'component.button.secondary.bg': { name: 'Button/defaultBg', source: 'components.Button.defaultBg', code: 'components.Button.defaultBg' },
  'component.button.radius': { name: 'Button/borderRadius', source: 'components.Button.borderRadius', code: 'components.Button.borderRadius' },
  'component.input.bg': { name: 'Input/colorBgContainer', source: 'components.Input.colorBgContainer', code: 'components.Input.colorBgContainer' },
  'component.input.border': { name: 'Input/colorBorder', source: 'components.Input.colorBorder', code: 'components.Input.colorBorder' },
  'component.input.radius': { name: 'Input/borderRadius', source: 'components.Input.borderRadius', code: 'components.Input.borderRadius' },
  'component.card.bg': { name: 'Card/colorBgContainer', source: 'components.Card.colorBgContainer', code: 'components.Card.colorBgContainer' },
  'component.card.border': { name: 'Card/colorBorderSecondary', source: 'components.Card.colorBorderSecondary', code: 'components.Card.colorBorderSecondary' },
  'component.card.radius': { name: 'Card/borderRadiusLG', source: 'components.Card.borderRadiusLG', code: 'components.Card.borderRadiusLG' },
};

function buildAntdTokens(): TokenDefinition[] {
  return buildShadcnTokens().map((tok) => {
    const mapped = ANTD_NAME_MAP[tok.logicalId];
    // Ant Design default heights: 24 / 32 / 40 (compact: 22 / 28 / 32)
    let adjustedValues = tok.valuesByMode;
    if (tok.logicalId === 'primitive.size.control.sm') {
      adjustedValues = { Base: { kind: 'float', value: 24, compactValue: 22 } };
    } else if (tok.logicalId === 'primitive.size.control.md') {
      adjustedValues = { Base: { kind: 'float', value: 32, compactValue: 28 } };
    } else if (tok.logicalId === 'primitive.size.control.lg') {
      adjustedValues = { Base: { kind: 'float', value: 40, compactValue: 32 } };
    }
    return {
      ...tok,
      name: mapped ? mapped.name : tok.name,
      sourceTokenName: mapped ? mapped.source : tok.sourceTokenName,
      valuesByMode: adjustedValues,
      codeSyntax: mapped ? { WEB: mapped.code } : tok.codeSyntax,
      sourceVersion: '5.24.2',
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

export const antdLibrary: LibraryDefinition = {
  schemaVersion: 1,
  libraryId: 'antd',
  displayName: 'Ant Design',
  vendorOrOrigin: 'ant-design/ant-design (Design Token v5 Adapter)',
  tagline: {
    en: 'Enterprise Seed → Map → Component token system with Default & Compact density algorithms.',
    th: 'ระบบออกแบบระดับองค์กร รักษาโครงสร้าง Seed/Map/Component tokens พร้อมโหมดความหนาแน่น Compact',
  },
  coverageSummary: {
    en: '10 Core enterprise families with Ant Design v5 token semantics, Default/Compact density, and Light/Dark algorithms.',
    th: 'ครอบคลุม 10 ตระกูลหลักของ Ant Design v5 รองรับ Default/Compact density และสลับโหมด Light/Dark',
  },
  packageVersion: '0.1.0',
  catalogOrder: 2,
  readiness: 'ready',
  defaultNamespace: 'Acme · AntD',
  source: {
    repository: 'https://github.com/ant-design/ant-design',
    pinnedRef: 'antd-5.24.2-c9e12b74',
    sourceVersion: '5.24.2',
    spdxLicense: 'MIT',
    copyrightNotice: 'Copyright (c) 2015-present Ant UED, https://xtech.antfin.com/',
    licenseUrl: 'https://github.com/ant-design/ant-design/blob/master/LICENSE',
    licenseText: MIT_LICENSE_TEMPLATE(
      'Copyright (c) 2015-present Ant UED, https://xtech.antfin.com/',
    ),
    inspectedPaths: [
      'components/theme/interface/*',
      'components/button/style/*',
      'components/input/style/*',
      'LICENSE',
    ],
    excludedUpstreamAssets: [
      'Ant Design Pro commercial templates',
      'Paid third-party Ant Design Figma UI kits',
      'Ant Group brand marks and illustrations',
    ],
    assetInventory: [
      {
        assetType: 'tokens',
        name: 'Ant Design v5 Seed/Map/Component Token Mapping',
        spdxLicense: 'MIT',
        provenance: 'Mapped from ant-design/ant-design v5.24.2 theme interface definitions',
      },
      {
        assetType: 'recipe',
        name: '10 Core Enterprise Figma Auto Layout Recipes',
        spdxLicense: 'MIT',
        provenance: 'Clean-room Figma recipes authored for DS Forge',
      },
    ],
  },
  capabilities: {
    themes: ['light', 'dark'],
    locales: ['en', 'th'],
    brandColor: true,
    fontCustomization: true,
    radiusCustomization: true,
    supportedRadiusPresets: ['none', 'sm', 'md', 'lg'],
    density: true,
    supportedDensities: ['default', 'compact'],
    tokenPrefixCustomization: true,
  },
  brandPresets: [
    { id: 'daybreak', label: { en: 'Daybreak Blue', th: 'น้ำเงิน Ant มาตรฐาน' }, primaryHex: '#1677FF' },
    { id: 'geekblue', label: { en: 'Geek Blue', th: 'น้ำเงินคราม' }, primaryHex: '#2F54EB' },
    { id: 'polar', label: { en: 'Polar Green', th: 'เขียวโพลาร์' }, primaryHex: '#52C41A' },
    { id: 'sunset', label: { en: 'Sunset Orange', th: 'ส้มอัสดง' }, primaryHex: '#FA8C16' },
  ],
  defaultBrandHex: '#1677FF',
  fontPresets: [
    {
      id: 'inter',
      label: 'Inter + Noto Sans Thai',
      sansFamily: 'Inter',
      monoFamily: 'Roboto Mono',
      thaiFallbackFamily: 'Noto Sans Thai',
    },
    {
      id: 'ibm-plex',
      label: 'IBM Plex Sans + IBM Plex Sans Thai',
      sansFamily: 'IBM Plex Sans',
      monoFamily: 'IBM Plex Mono',
      thaiFallbackFamily: 'IBM Plex Sans Thai',
    },
  ],
  defaultFontPresetId: 'inter',
  defaultRadiusPreset: 'md',
  previewFixture: {
    fixtureVersion: '0.1.0',
    buttonLabel: { en: 'Submit Order', th: 'ส่งคำสั่งซื้อ' },
    secondaryButtonLabel: { en: 'Reset Filter', th: 'ล้างตัวกรอง' },
    inputPlaceholder: { en: 'Filter enterprise records...', th: 'ค้นหารายการข้อมูล...' },
    cardTitle: { en: 'AntD v5 Seed & Map Tokens', th: 'ระบบโทเคน Ant Design v5' },
    cardBody: {
      en: 'Supports Default (32px) and Compact (28px) control density without duplicating Light/Dark modes.',
      th: 'รองรับความหนาแน่นปกติ (32px) และแบบกระชับ (28px) แยกจากโหมดสว่างและมืดอย่างเป็นระบบ',
    },
    navItems: [
      { en: 'Workbench', th: 'หน้างาน' },
      { en: 'Records', th: 'ทะเบียนข้อมูล' },
      { en: 'Audit', th: 'ตรวจสอบ' },
    ],
    simulatedAttributes: ['colorPrimary Seed', 'Default / Compact Density', 'Border Radius', 'Light / Dark Algorithm'],
    nonSimulatedLimitations: {
      en: 'Wave click ripple and runtime popup placement are AntD React runtime behaviors not simulated in static Figma frames.',
      th: 'เอฟเฟกต์คลื่นเมื่อคลิกและการคำนวณตำแหน่งเมนูเป็นพฤติกรรมตอนรันของ React ไม่ได้จำลองในเฟรมคงที่',
    },
  },
  tokens: buildAntdTokens(),
  textStyles: buildStandardTextStyles(STYLE_REFS),
  effectStyles: buildStandardEffectStyles(STYLE_REFS),
  components: [
    ...createHelperIconRecipes('semantic.text.primary'),
    ...[
      ...buildControlComponentRecipes(SHADCN_BINDINGS, {
        libraryLabel: 'Ant Design',
        docsBaseUrl: 'https://ant.design/components',
        pillBadges: false,
      }),
      ...buildSurfaceComponentRecipes(SHADCN_BINDINGS, {
        libraryLabel: 'Ant Design',
        docsBaseUrl: 'https://ant.design/components',
      }),
    ].filter((c) => CORE_10_IDS.has(c.logicalId)),
  ],
  patterns: buildStandardPatterns(SHADCN_BINDINGS),
  changelog: [
    {
      version: '0.1.0',
      date: '2026-11-15',
      notes: {
        en: 'Initial Ready release with Ant Design v5 Seed/Map/Component tokens and Compact density support.',
        th: 'เปิดใช้งานชุด Ant Design v5 พร้อม Seed/Map/Component tokens และโหมดความหนาแน่น Compact',
      },
    },
  ],
  migrations: [],
};
