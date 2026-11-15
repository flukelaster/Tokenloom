import { auditAllCatalogLibraries, CATALOG_LIBRARIES } from '../libraries';

const audits = auditAllCatalogLibraries();
let failed = false;

console.log('=== DS Forge Library Catalog Package Audit ===\n');

for (const lib of CATALOG_LIBRARIES) {
  const res = audits[lib.libraryId];
  const statusIcon = res.validForCatalog ? 'PASS' : 'FAIL';
  console.log(
    `[${statusIcon}] #${String(lib.catalogOrder).padStart(2, '0')} ${lib.displayName.padEnd(22)} | readiness=${lib.readiness.padEnd(11)} | generateReady=${String(res.readyGatePassed).padEnd(5)} | license=${lib.source.spdxLicense.padEnd(10)} | components=${res.stats.userFacingComponentCount} (+${res.stats.helperComponentCount} helpers) | tokens=${res.stats.tokenCount} | patterns=${res.stats.patternCount}`,
  );
  if (res.issues.length > 0) {
    for (const issue of res.issues) {
      console.log(`   - [${issue.severity.toUpperCase()}] ${issue.code}: ${issue.message} (${issue.path ?? ''})`);
    }
  }
  if (!res.validForCatalog) {
    failed = true;
  }
  if ((lib.readiness === 'ready' || lib.readiness === 'beta') && !res.readyGatePassed) {
    console.error(`   ! Package "${lib.libraryId}" claims "${lib.readiness}" without passing Ready Gate!`);
    failed = true;
  }
}

if (CATALOG_LIBRARIES.length !== 10) {
  console.error(`\nExpected 10 catalog libraries per roadmap, found ${CATALOG_LIBRARIES.length}`);
  failed = true;
}

if (failed) {
  console.error('\nPackage audit FAILED.');
  process.exit(1);
}

console.log('\nAll 10 library packages passed schema, provenance, token-graph, and recipe Quality Gates.');
