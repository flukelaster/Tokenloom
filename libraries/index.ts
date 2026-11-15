import {
  validateLibraryDefinition,
  type LibraryDefinition,
  type PackageAuditResult,
} from '@schema';
import { antdLibrary } from './antd';
import { carbonLibrary } from './carbon';
import { muiLibrary } from './mui';
import { roadmapLibraries } from './roadmap';
import { shadcnLibrary } from './shadcn';

export const CATALOG_LIBRARIES: ReadonlyArray<LibraryDefinition> = [
  shadcnLibrary,
  antdLibrary,
  muiLibrary,
  ...roadmapLibraries.filter((l) => l.catalogOrder < 9),
  carbonLibrary,
  ...roadmapLibraries.filter((l) => l.catalogOrder >= 10),
].sort((a, b) => a.catalogOrder - b.catalogOrder);

export interface CatalogLibrarySummary {
  libraryId: string;
  displayName: string;
  vendorOrOrigin: string;
  packageVersion: string;
  sourceVersion: string;
  spdxLicense: 'MIT' | 'Apache-2.0';
  catalogOrder: number;
  readiness: LibraryDefinition['readiness'];
  readyGatePassed: boolean;
  componentFamilyCount: number;
  tokenCount: number;
  patternCount: number;
  themes: LibraryDefinition['capabilities']['themes'];
  locales: LibraryDefinition['capabilities']['locales'];
  supportsDensity: boolean;
}

export function getLibraryById(libraryId: string): LibraryDefinition | undefined {
  return CATALOG_LIBRARIES.find((lib) => lib.libraryId === libraryId);
}

export function auditAllCatalogLibraries(): Record<string, PackageAuditResult> {
  const results: Record<string, PackageAuditResult> = {};
  for (const lib of CATALOG_LIBRARIES) {
    results[lib.libraryId] = validateLibraryDefinition(lib);
  }
  return results;
}

export function getCatalogSummaries(): CatalogLibrarySummary[] {
  return CATALOG_LIBRARIES.map((lib) => {
    const audit = validateLibraryDefinition(lib);
    return {
      libraryId: lib.libraryId,
      displayName: lib.displayName,
      vendorOrOrigin: lib.vendorOrOrigin,
      packageVersion: lib.packageVersion,
      sourceVersion: lib.source.sourceVersion,
      spdxLicense: lib.source.spdxLicense,
      catalogOrder: lib.catalogOrder,
      readiness: lib.readiness,
      readyGatePassed: audit.readyGatePassed,
      componentFamilyCount: audit.stats.userFacingComponentCount,
      tokenCount: audit.stats.tokenCount,
      patternCount: audit.stats.patternCount,
      themes: lib.capabilities.themes,
      locales: lib.capabilities.locales,
      supportsDensity: lib.capabilities.density,
    };
  });
}
