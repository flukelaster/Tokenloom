import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { validateLibraryDefinition } from '../packages/schema/src';
import {
  buildCanonicalTokenExport,
  compileExecutionPlan,
  verifyExportedTokenBundle,
} from '../packages/engine/src';
import { CATALOG_LIBRARIES, getLibraryById } from '../libraries';
import { createFigmaMock } from '../tests/helpers/figma-mock';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function fail(message: string): never {
  console.error(`❌ Release check failed: ${message}`);
  process.exit(1);
}

// 1. Verify manifest.json constraints (Section 5.1 & 15)
const manifestPath = path.join(rootDir, 'manifest.json');
if (!fs.existsSync(manifestPath)) {
  fail('manifest.json does not exist at repository root.');
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
  main?: string;
  ui?: string;
  editorType?: string[];
  documentAccess?: string;
  networkAccess?: { allowedDomains?: string[] };
};

if (manifest.documentAccess !== 'dynamic-page') {
  fail(`manifest.documentAccess must be "dynamic-page", found "${manifest.documentAccess}".`);
}
if (
  !manifest.networkAccess?.allowedDomains ||
  manifest.networkAccess.allowedDomains.length !== 1 ||
  manifest.networkAccess.allowedDomains[0] !== 'none'
) {
  fail('manifest.networkAccess.allowedDomains must strictly be ["none"].');
}
if (!Array.isArray(manifest.editorType) || !manifest.editorType.includes('figma')) {
  fail('manifest.editorType must include "figma".');
}

// 2. Verify built dist artifacts exist and dist/ui.html is self-contained single-file
const mainDistPath = path.join(rootDir, manifest.main ?? 'dist/plugin.js');
const uiDistPath = path.join(rootDir, manifest.ui ?? 'dist/ui.html');

if (!fs.existsSync(mainDistPath) || fs.statSync(mainDistPath).size < 1024) {
  fail(`Built plugin bundle missing or empty: ${mainDistPath}`);
}
if (!fs.existsSync(uiDistPath) || fs.statSync(uiDistPath).size < 1024) {
  fail(`Built UI bundle missing or empty: ${uiDistPath}`);
}

const uiHtml = fs.readFileSync(uiDistPath, 'utf8');
if (/<script[^>]+src=/i.test(uiHtml) || /<link[^>]+rel=["']stylesheet["']/i.test(uiHtml)) {
  fail('dist/ui.html contains external script/stylesheet references; Figma requires single-file inlined HTML.');
}

// 3. Verify all 10 catalog packages pass schema, license, and quality gates
if (CATALOG_LIBRARIES.length !== 10) {
  fail(`Expected 10 catalog libraries in roadmap, found ${CATALOG_LIBRARIES.length}.`);
}
for (const lib of CATALOG_LIBRARIES) {
  const audit = validateLibraryDefinition(lib);
  if (!audit.validForCatalog) {
    fail(
      `Catalog library "${lib.libraryId}" failed validation: ${audit.issues
        .map((i) => `${i.code}: ${i.message}`)
        .join('; ')}`,
    );
  }
  if ((lib.readiness === 'ready' || lib.readiness === 'beta') && !audit.readyGatePassed) {
    fail(`Active library "${lib.libraryId}" did not pass Ready/Beta Quality Gate.`);
  }
  if (lib.source.spdxLicense === 'Apache-2.0' && (!lib.source.noticeText || !lib.source.modifications?.length)) {
    fail(`Apache-2.0 library "${lib.libraryId}" is missing required NOTICE text or modification records.`);
  }
}

// 4. Verify canonical token export & independent resolver across all active libraries (EN & TH)
const activeLibraries = CATALOG_LIBRARIES.filter(
  (l) => l.readiness === 'ready' || l.readiness === 'beta',
);
for (const lib of activeLibraries) {
  for (const locale of ['en', 'th'] as const) {
    const plan = compileExecutionPlan(lib, {
      libraryId: lib.libraryId,
      namespace: `ReleaseCheck ${lib.defaultNamespace}`,
      locale,
      pageNaming: 'numbered',
      scope: 'core',
      selectedComponentIds: [],
      brandHex: lib.defaultBrandHex,
      fontPresetId: lib.defaultFontPresetId,
      radiusPreset: lib.defaultRadiusPreset,
      density: 'default',
      tokenPrefix: '',
      strictFidelity: true,
    });
    const exported = buildCanonicalTokenExport(plan, '2026-01-01T00:00:00.000Z');
    const verified = verifyExportedTokenBundle(exported);
    if (!verified.valid) {
      fail(
        `Canonical export resolver failed for "${lib.libraryId}" (${locale}): ${verified.errors.join('; ')}`,
      );
    }
  }
}

// 5. Verify canonical shadcn regression snapshot fixture
const fixturePath = path.join(rootDir, 'fixtures', 'canonical-shadcn-summary.json');
if (!fs.existsSync(fixturePath)) {
  fail(`Missing canonical regression fixture at ${fixturePath}`);
}
const expectedFixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8')) as {
  schemaVersion: number;
  libraryId: string;
  packageVersion: string;
  collections: { primitives: string; semantic: string; component: string };
  counts: {
    tokens: number;
    textStyles: number;
    effectStyles: number;
    userFacingComponents: number;
    helperComponents: number;
    totalVariants: number;
    pages: number;
    patterns: number;
  };
  sampleResolvedTokens: {
    Light: Record<string, string | number | boolean>;
    Dark: Record<string, string | number | boolean>;
  };
};

const shadcn = getLibraryById('shadcn')!;
const shadcnPlan = compileExecutionPlan(shadcn, {
  libraryId: 'shadcn',
  namespace: 'Acme shadcn/ui',
  locale: 'en',
  pageNaming: 'numbered',
  scope: 'core',
  selectedComponentIds: [],
  brandHex: shadcn.defaultBrandHex,
  fontPresetId: shadcn.defaultFontPresetId,
  radiusPreset: shadcn.defaultRadiusPreset,
  density: 'default',
  tokenPrefix: '',
  strictFidelity: true,
});
const shadcnBundle = buildCanonicalTokenExport(shadcnPlan, '2026-01-01T00:00:00.000Z');

if (
  shadcnPlan.estimates.variables !== expectedFixture.counts.tokens ||
  shadcnPlan.estimates.userFacingComponents !== expectedFixture.counts.userFacingComponents ||
  shadcnPlan.estimates.helperComponents !== expectedFixture.counts.helperComponents ||
  shadcnPlan.estimates.totalVariants !== expectedFixture.counts.totalVariants ||
  shadcnPlan.estimates.pages !== expectedFixture.counts.pages ||
  shadcnPlan.estimates.patterns !== expectedFixture.counts.patterns
) {
  fail(
    `Canonical shadcn counts drifted from fixture! Got ${JSON.stringify(shadcnPlan.estimates)} vs expected ${JSON.stringify(expectedFixture.counts)}`,
  );
}

for (const theme of ['Light', 'Dark'] as const) {
  for (const [tokenId, expectedVal] of Object.entries(expectedFixture.sampleResolvedTokens[theme])) {
    const actualVal = shadcnBundle.resolvedThemes[theme][tokenId];
    if (actualVal !== expectedVal) {
      fail(
        `Canonical shadcn resolved token "${tokenId}" (${theme}) drifted: expected "${String(expectedVal)}", got "${String(actualVal)}"`,
      );
    }
  }
}

// 6. Execute compiled dist/plugin.js inside a bare QuickJS-equivalent VM context
//    (no URL, process, window, document, Buffer, crypto, structuredClone, TextEncoder)
const pluginJsSource = fs.readFileSync(mainDistPath, 'utf8');
const quickJsHarness = createFigmaMock({ fileName: 'QuickJS Sandbox Check' });
const quickJsContext = vm.createContext({
  figma: quickJsHarness.figma,
  __html__: uiHtml,
  console,
  setTimeout,
  clearTimeout,
});
vm.runInContext(pluginJsSource, quickJsContext, { filename: 'dist/plugin.js' });

await quickJsHarness.sendUiMessage({
  type: 'GENERATE_SYSTEM',
  config: {
    libraryId: 'shadcn',
    namespace: 'shadcn',
    locale: 'en',
    pageNaming: 'numbered',
    scope: 'core',
    selectedComponentIds: [],
    brandHex: shadcn.defaultBrandHex,
    fontPresetId: shadcn.defaultFontPresetId,
    radiusPreset: shadcn.defaultRadiusPreset,
    density: 'default',
    tokenPrefix: '',
    strictFidelity: false,
  },
});

const finishedMsg = [...quickJsHarness.sentToUi]
  .reverse()
  .find((m) => m.type === 'JOB_FINISHED');
if (
  !finishedMsg ||
  finishedMsg.type !== 'JOB_FINISHED' ||
  finishedMsg.status !== 'completed' ||
  !finishedMsg.validationReport?.passed
) {
  fail(
    `Compiled dist/plugin.js failed inside bare QuickJS VM simulation: ${JSON.stringify(finishedMsg ?? quickJsHarness.sentToUi)}`,
  );
}

console.log('✅ Release check passed:');
console.log('   • manifest.json (dynamic-page, networkAccess: ["none"], editorType: ["figma"])');
console.log('   • dist/plugin.js & self-contained single-file dist/ui.html');
console.log('   • Compiled dist/plugin.js executed end-to-end inside bare QuickJS VM simulation');
console.log(`   • ${CATALOG_LIBRARIES.length} catalog packages (${activeLibraries.length} Ready/Beta, ${CATALOG_LIBRARIES.length - activeLibraries.length} Coming Soon)`);
console.log('   • Canonical DTCG + Theme Manifest token export & resolver verified (EN & TH)');
console.log('   • Canonical shadcn/ui golden fixture verified');
