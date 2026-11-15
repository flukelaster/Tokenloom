import type { LibraryDefinition } from '@schema';
import { APACHE_2_LICENSE_EXCERPT_FULL, MIT_LICENSE_TEMPLATE } from '../shared/licenses';

interface RoadmapEntrySpec {
  libraryId: string;
  displayName: string;
  vendorOrOrigin: string;
  catalogOrder: number;
  repository: string;
  pinnedRef: string;
  sourceVersion: string;
  spdxLicense: 'MIT' | 'Apache-2.0';
  copyrightNotice: string;
  licenseUrl: string;
  noticeText?: string;
  defaultBrandHex: string;
  taglineEn: string;
  taglineTh: string;
  coverageEn: string;
  coverageTh: string;
  excludedAssets: string[];
}

function createRoadmapCatalogPackage(spec: RoadmapEntrySpec): LibraryDefinition {
  return {
    schemaVersion: 1,
    libraryId: spec.libraryId,
    displayName: spec.displayName,
    vendorOrOrigin: spec.vendorOrOrigin,
    tagline: { en: spec.taglineEn, th: spec.taglineTh },
    coverageSummary: { en: spec.coverageEn, th: spec.coverageTh },
    packageVersion: '0.1.0',
    catalogOrder: spec.catalogOrder,
    readiness: 'coming-soon',
    defaultNamespace: `Acme · ${spec.displayName}`,
    source: {
      repository: spec.repository,
      pinnedRef: spec.pinnedRef,
      sourceVersion: spec.sourceVersion,
      spdxLicense: spec.spdxLicense,
      copyrightNotice: spec.copyrightNotice,
      licenseUrl: spec.licenseUrl,
      licenseText:
        spec.spdxLicense === 'Apache-2.0'
          ? APACHE_2_LICENSE_EXCERPT_FULL
          : MIT_LICENSE_TEMPLATE(spec.copyrightNotice),
      ...(spec.spdxLicense === 'Apache-2.0'
        ? {
            noticeText: spec.noticeText,
            modifications: [
              {
                scope: 'Catalog Provenance Audit',
                summary: 'Recorded repository pin and Apache-2.0 attribution ahead of recipe authoring.',
                date: '2026-11-15',
              },
            ],
          }
        : {}),
      inspectedPaths: ['LICENSE', 'package.json'],
      excludedUpstreamAssets: spec.excludedAssets,
      assetInventory: [
        {
          assetType: 'documentation',
          name: `${spec.displayName} Catalog Provenance Manifest`,
          spdxLicense: spec.spdxLicense,
          provenance: `Audited upstream license from ${spec.repository} @ ${spec.pinnedRef}`,
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
      {
        id: 'default',
        label: { en: 'Upstream Default', th: 'สีเริ่มต้นต้นฉบับ' },
        primaryHex: spec.defaultBrandHex,
      },
    ],
    defaultBrandHex: spec.defaultBrandHex,
    fontPresets: [
      {
        id: 'inter',
        label: 'Inter + Noto Sans Thai',
        sansFamily: 'Inter',
        monoFamily: 'Roboto Mono',
        thaiFallbackFamily: 'Noto Sans Thai',
      },
    ],
    defaultFontPresetId: 'inter',
    defaultRadiusPreset: 'md',
    previewFixture: {
      fixtureVersion: '0.1.0',
      buttonLabel: { en: 'Coming Soon', th: 'เร็วๆ นี้' },
      secondaryButtonLabel: { en: 'Roadmap', th: 'แผนพัฒนา' },
      inputPlaceholder: { en: 'Adapter under QA gate...', th: 'กำลังพัฒนาและตรวจสอบคุณภาพ...' },
      cardTitle: { en: `${spec.displayName} Adapter`, th: `ชุดอะแดปเตอร์ ${spec.displayName}` },
      cardBody: { en: spec.coverageEn, th: spec.coverageTh },
      navItems: [
        { en: 'Tokens', th: 'โทเคน' },
        { en: 'Recipes', th: 'สูตรคอมโพเนนต์' },
      ],
      simulatedAttributes: ['Catalog Preview Only'],
      nonSimulatedLimitations: {
        en: 'Generation is locked until all component recipes and token contrast gates pass QA.',
        th: 'ปิดปุ่ม Generate ไว้จนกว่าสูตรคอมโพเนนต์และการตรวจสอบคุณภาพจะผ่านเกณฑ์ครบถ้วน',
      },
    },
    tokens: [],
    textStyles: [],
    effectStyles: [],
    components: [],
    patterns: [],
    changelog: [
      {
        version: '0.1.0',
        date: '2026-11-15',
        notes: {
          en: 'Catalog provenance & license audit registered; awaiting Quality Gate completion.',
          th: 'บันทึกข้อมูลแหล่งที่มาและสัญญาอนุญาตแล้ว อยู่ระหว่างพัฒนาสูตรคอมโพเนนต์ให้ผ่านเกณฑ์คุณภาพ',
        },
      },
    ],
    migrations: [],
  };
}

export const roadmapLibraries: LibraryDefinition[] = [
  createRoadmapCatalogPackage({
    libraryId: 'chakra',
    displayName: 'Chakra UI',
    vendorOrOrigin: 'chakra-ui/chakra-ui',
    catalogOrder: 4,
    repository: 'https://github.com/chakra-ui/chakra-ui',
    pinnedRef: 'chakra-v3.8.0-19a4c712',
    sourceVersion: '3.8.0',
    spdxLicense: 'MIT',
    copyrightNotice: 'Copyright (c) 2019 Segun Adebayo',
    licenseUrl: 'https://github.com/chakra-ui/chakra-ui/blob/main/LICENSE',
    defaultBrandHex: '#0D9488',
    taglineEn: 'Semantic token role hierarchy (solid, subtle, surface, outline) from Chakra UI v3.',
    taglineTh: 'โครงสร้าง Semantic token roles (solid, subtle, surface, outline) ตามมาตรฐาน Chakra UI v3',
    coverageEn: 'Roadmap pack — semantic token role adapter in QA; generation unlocks once Core gate passes.',
    coverageTh: 'อยู่ในแผนพัฒนา — จะเปิดให้กดสร้างเมื่อผ่าน Quality gate ครบถ้วน',
    excludedAssets: ['Chakra UI Pro commercial blocks', 'Chakra brand logos'],
  }),
  createRoadmapCatalogPackage({
    libraryId: 'mantine',
    displayName: 'Mantine',
    vendorOrOrigin: 'mantinedev/mantine',
    catalogOrder: 5,
    repository: 'https://github.com/mantinedev/mantine',
    pinnedRef: 'mantine-v7.17.0-62d08f3a',
    sourceVersion: '7.17.0',
    spdxLicense: 'MIT',
    copyrightNotice: 'Copyright (c) 2021 Vitaly Rtishchev',
    licenseUrl: 'https://github.com/mantinedev/mantine/blob/master/LICENSE',
    defaultBrandHex: '#228BE6',
    taglineEn: '10-shade primaryColor tuple scale and rich form control recipes from Mantine v7.',
    taglineTh: 'สเกลสี 10 ระดับและชุดฟอร์มคอนโทรลตามโครงสร้างของ Mantine v7',
    coverageEn: 'Roadmap pack — separating Core controls from complex rich-text/date-picker specs.',
    coverageTh: 'อยู่ในแผนพัฒนา — แยกขอบเขตคอมโพเนนต์พื้นฐานออกจากคอมโพเนนต์ซับซ้อน',
    excludedAssets: ['Mantine logos and third-party Figma community files'],
  }),
  createRoadmapCatalogPackage({
    libraryId: 'heroui',
    displayName: 'HeroUI',
    vendorOrOrigin: 'heroui-inc/heroui (MIT Core Only)',
    catalogOrder: 6,
    repository: 'https://github.com/heroui-inc/heroui',
    pinnedRef: 'heroui-v2.7.3-51f22e90',
    sourceVersion: '2.7.3',
    spdxLicense: 'MIT',
    copyrightNotice: 'Copyright (c) 2024 HeroUI Inc.',
    licenseUrl: 'https://github.com/heroui-inc/heroui/blob/main/LICENSE',
    defaultBrandHex: '#006FEE',
    taglineEn: 'Modern soft surfaces and slot-based component anatomy from MIT HeroUI.',
    taglineTh: 'พื้นผิวนุ่มนวลทันสมัยและโครงสร้าง Slot ของคอมโพเนนต์จาก HeroUI (เฉพาะ MIT)',
    coverageEn: 'Roadmap pack — strictly excludes HeroUI Pro commercial templates and assets.',
    coverageTh: 'อยู่ในแผนพัฒนา — ไม่รวมเทมเพลตเชิงพาณิชย์ของ HeroUI Pro โดยเด็ดขาด',
    excludedAssets: ['HeroUI Pro commercial components and Figma kits'],
  }),
  createRoadmapCatalogPackage({
    libraryId: 'radix-themes',
    displayName: 'Radix Themes',
    vendorOrOrigin: 'radix-ui/themes',
    catalogOrder: 7,
    repository: 'https://github.com/radix-ui/themes',
    pinnedRef: 'radix-themes-v3.2.0-77c90e14',
    sourceVersion: '3.2.0',
    spdxLicense: 'MIT',
    copyrightNotice: 'Copyright (c) 2023 WorkOS',
    licenseUrl: 'https://github.com/radix-ui/themes/blob/main/LICENSE',
    defaultBrandHex: '#3E63DD',
    taglineEn: '12-step functional color scales and radius factor presets modeled on Radix Themes.',
    taglineTh: 'สเกลสี 12 ขั้นตามหน้าที่การใช้งานและระดับความโค้งมุมจาก Radix Themes',
    coverageEn: 'Roadmap pack — scoped specifically to Radix Themes (does not claim unstyled Radix Primitives parity).',
    coverageTh: 'อยู่ในแผนพัฒนา — รองรับเฉพาะส่วน Radix Themes ไม่ได้อ้างครอบคลุม Radix Primitives ทั้งระบบ',
    excludedAssets: ['WorkOS / Radix brand marks'],
  }),
  createRoadmapCatalogPackage({
    libraryId: 'fluent-web',
    displayName: 'Fluent UI Web v9',
    vendorOrOrigin: 'microsoft/fluentui (@fluentui/react-components)',
    catalogOrder: 8,
    repository: 'https://github.com/microsoft/fluentui',
    pinnedRef: 'fluentui-react-v9.59.0-30e48b11',
    sourceVersion: '9.59.0',
    spdxLicense: 'MIT',
    copyrightNotice: 'Copyright (c) Microsoft Corporation',
    licenseUrl: 'https://github.com/microsoft/fluentui/blob/master/LICENSE',
    defaultBrandHex: '#0F6CBD',
    taglineEn: 'Fluent v9 Web neutral/brand ramp tokens and platform-scoped web controls.',
    taglineTh: 'โทเคนสีและคอนโทรลสำหรับเว็บตามมาตรฐาน Fluent UI Web v9',
    coverageEn: 'Roadmap pack — explicitly scoped to Fluent UI Web v9 (excludes Windows/iOS native & proprietary Microsoft assets).',
    coverageTh: 'อยู่ในแผนพัฒนา — ระบุขอบเขตเฉพาะ Fluent UI Web v9 ไม่รวมสินทรัพย์ลิขสิทธิ์อื่นของ Microsoft',
    excludedAssets: ['Segoe UI proprietary font binaries', 'Microsoft product icons & Windows shell assets'],
  }),
  createRoadmapCatalogPackage({
    libraryId: 'material-web',
    displayName: 'Material Web (M3)',
    vendorOrOrigin: 'material-components/material-web',
    catalogOrder: 10,
    repository: 'https://github.com/material-components/material-web',
    pinnedRef: 'material-web-v2.2.0-94a17d05',
    sourceVersion: '2.2.0',
    spdxLicense: 'Apache-2.0',
    copyrightNotice: 'Copyright 2023 Google LLC',
    licenseUrl: 'https://github.com/material-components/material-web/blob/main/LICENSE',
    noticeText:
      'Material Web Components — Copyright 2023 Google LLC. Licensed under the Apache License, Version 2.0 (--md-sys-color-* and --md-ref-palette-* token conventions).',
    defaultBrandHex: '#6750A4',
    taglineEn: 'Material 3 --md-sys-color and --md-ref-palette web component token architecture.',
    taglineTh: 'โครงสร้างตัวแปร --md-sys-color และ --md-ref-palette จากโครงการ Material Web',
    coverageEn: 'Roadmap pack — scoped to open-source material-components/material-web (Apache-2.0).',
    coverageTh: 'อยู่ในแผนพัฒนา — อ้างอิงเฉพาะโค้ดเปิดของ material-components/material-web ภายใต้ Apache-2.0',
    excludedAssets: ['Google proprietary product icons & Google Sans fonts'],
  }),
];
