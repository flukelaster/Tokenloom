import { describe, expect, it } from 'vitest';
import {
  FIGMA_CAPABILITY_MATRIX,
  validateLibraryDefinition,
  type LibraryDefinition,
} from '@schema';
import { auditAllCatalogLibraries, CATALOG_LIBRARIES, getLibraryById } from '@libraries';

describe('Schema, Capability Matrix & Library Catalog Quality Gates', () => {
  it('includes all 10 roadmap libraries in catalog order and validates every package', () => {
    expect(CATALOG_LIBRARIES).toHaveLength(10);
    expect(CATALOG_LIBRARIES.map((l) => l.libraryId)).toEqual([
      'shadcn',
      'antd',
      'mui',
      'chakra',
      'mantine',
      'heroui',
      'radix-themes',
      'fluent-web',
      'carbon',
      'material-web',
    ]);

    const audits = auditAllCatalogLibraries();
    for (const lib of CATALOG_LIBRARIES) {
      const res = audits[lib.libraryId];
      expect(res.validForCatalog, `${lib.libraryId} issues: ${JSON.stringify(res.issues)}`).toBe(
        true,
      );
      if (lib.readiness === 'ready' || lib.readiness === 'beta') {
        expect(res.readyGatePassed).toBe(true);
      } else {
        expect(res.readyGatePassed).toBe(false);
      }
    }
  });

  it('enforces Core coverage targets and license rules across Ready & Beta packages', () => {
    const shadcn = getLibraryById('shadcn')!;
    const antd = getLibraryById('antd')!;
    const mui = getLibraryById('mui')!;
    const carbon = getLibraryById('carbon')!;

    expect(shadcn.components.filter((c) => c.tier !== 'helper')).toHaveLength(15);
    expect(antd.components.filter((c) => c.tier !== 'helper')).toHaveLength(10);
    expect(antd.capabilities.density).toBe(true);

    expect(mui.components.filter((c) => c.tier !== 'helper')).toHaveLength(10);
    expect(mui.source.spdxLicense).toBe('MIT');
    expect(mui.source.excludedUpstreamAssets.some((s) => s.includes('MUI X'))).toBe(true);

    expect(carbon.readiness).toBe('beta');
    expect(carbon.source.spdxLicense).toBe('Apache-2.0');
    expect(carbon.source.noticeText).toContain('Apache License');
    expect(carbon.source.modifications?.length).toBeGreaterThan(0);
    expect(carbon.capabilities.radiusCustomization).toBe(false);
  });

  it('detects token alias cycles and dangling aliases in validateLibraryDefinition', () => {
    const base = structuredClone(getLibraryById('shadcn')!) as LibraryDefinition;

    // Introduce a two-node cycle between two semantic tokens
    const tokA = base.tokens.find((t) => t.logicalId === 'semantic.action.primary.bg')!;
    const tokB = base.tokens.find((t) => t.logicalId === 'semantic.action.primary.hover')!;
    tokA.valuesByMode.Light = { kind: 'alias', targetLogicalId: tokB.logicalId };
    tokB.valuesByMode.Light = { kind: 'alias', targetLogicalId: tokA.logicalId };

    const cycleAudit = validateLibraryDefinition(base);
    expect(cycleAudit.validForCatalog).toBe(false);
    expect(cycleAudit.issues.some((i) => i.code.includes('CYCLE'))).toBe(true);

    // Introduce a dangling alias
    const baseDangling = structuredClone(getLibraryById('shadcn')!) as LibraryDefinition;
    baseDangling.tokens[0].valuesByMode.Base = {
      kind: 'alias',
      targetLogicalId: 'primitives.nonexistent.999',
    };
    const danglingAudit = validateLibraryDefinition(baseDangling);
    expect(danglingAudit.validForCatalog).toBe(false);
    expect(danglingAudit.issues.some((i) => i.code.includes('ALIAS'))).toBe(true);
  });

  it('rejects Apache-2.0 packages missing NOTICE text or modification logs', () => {
    const brokenCarbon = structuredClone(getLibraryById('carbon')!) as LibraryDefinition;
    delete brokenCarbon.source.noticeText;
    delete brokenCarbon.source.modifications;

    const audit = validateLibraryDefinition(brokenCarbon);
    expect(audit.validForCatalog).toBe(false);
    expect(audit.issues.some((i) => i.code.includes('APACHE'))).toBe(true);
  });

  it('rejects circular component dependencies', () => {
    const brokenDeps = structuredClone(getLibraryById('shadcn')!) as LibraryDefinition;
    const btn = brokenDeps.components.find((c) => c.logicalId === 'button')!;
    const card = brokenDeps.components.find((c) => c.logicalId === 'card')!;
    btn.dependencies.push('card');
    expect(card.dependencies).toContain('button');

    const audit = validateLibraryDefinition(brokenDeps);
    expect(audit.validForCatalog).toBe(false);
    expect(audit.issues.some((i) => i.code.includes('DEPENDENCY'))).toBe(true);
  });

  it('documents Figma binding capabilities and non-bindable vector exceptions transparently', () => {
    expect(FIGMA_CAPABILITY_MATRIX.fill.bindable).toBe(true);
    expect(FIGMA_CAPABILITY_MATRIX.paddingLeft.bindable).toBe(true);
    expect(FIGMA_CAPABILITY_MATRIX.svgVectorGeometry.bindable).toBe(false);
    expect(FIGMA_CAPABILITY_MATRIX.svgVectorGeometry.rationale.length).toBeGreaterThan(
      10,
    );
  });
});
