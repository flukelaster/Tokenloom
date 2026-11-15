import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { InstalledSystemRecord } from '@schema';
import {
  buildCanonicalTokenExport,
  compileExecutionPlan,
  computeThreeWayDiff,
  generateBrandPalette,
  verifyExportedTokenBundle,
  wcagContrastRatio,
  type LiveDocumentSnapshot,
} from '@engine';
import { getLibraryById } from '@libraries';

describe('Engine: Color Ramp, Compiler, Three-Way Diff & Canonical Exporter', () => {
  it('generates perceptual 11-step brand palettes with WCAG AA on-brand foregrounds', () => {
    const testColors = ['#2563EB', '#1677FF', '#059669', '#E11D48', '#F59E0B', '#09090B'];
    for (const hex of testColors) {
      const palette = generateBrandPalette(hex);
      expect(palette['600']).toMatch(/^#[0-9A-F]{6}$/);
      expect(palette['400']).toMatch(/^#[0-9A-F]{6}$/);

      const lightContrast = wcagContrastRatio(palette['on-brand-light'], palette['600']);
      const darkContrast = wcagContrastRatio(palette['on-brand-dark'], palette['400']);
      expect(lightContrast).toBeGreaterThanOrEqual(4.5);
      expect(darkContrast).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('compiles canonical shadcn plan matching golden fixture and resolves dependencies topologically', () => {
    const shadcn = getLibraryById('shadcn')!;
    const plan = compileExecutionPlan(shadcn, {
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

    const fixturePath = path.resolve(process.cwd(), 'fixtures/canonical-shadcn-summary.json');
    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

    expect(plan.estimates.variables).toBe(fixture.counts.tokens);
    expect(plan.estimates.userFacingComponents).toBe(fixture.counts.userFacingComponents);
    expect(plan.estimates.helperComponents).toBe(fixture.counts.helperComponents);
    expect(plan.estimates.totalVariants).toBe(fixture.counts.totalVariants);
    expect(plan.estimates.pages).toBe(fixture.counts.pages);

    // Topological invariant: helper icons before Button, Button before Card and Dialog
    const ids = plan.orderedComponents.map((c) => c.logicalId);
    const iconIdx = ids.indexOf('icon.chevron-down');
    const btnIdx = ids.indexOf('button');
    const cardIdx = ids.indexOf('card');
    const dialogIdx = ids.indexOf('dialog');
    expect(iconIdx).toBeGreaterThanOrEqual(0);
    expect(iconIdx).toBeLessThan(btnIdx);
    expect(btnIdx).toBeLessThan(cardIdx);
    expect(btnIdx).toBeLessThan(dialogIdx);
  });

  it('auto-includes transitive component dependencies when custom scope selects only Card', () => {
    const shadcn = getLibraryById('shadcn')!;
    const plan = compileExecutionPlan(shadcn, {
      libraryId: 'shadcn',
      namespace: 'Custom Card DS',
      locale: 'th',
      pageNaming: 'clean',
      scope: 'custom',
      selectedComponentIds: ['card'],
      brandHex: '#7C3AED',
      fontPresetId: shadcn.defaultFontPresetId,
      radiusPreset: 'lg',
      density: 'default',
      tokenPrefix: 'acme',
      strictFidelity: false,
    });

    const ids = plan.orderedComponents.map((c) => c.logicalId);
    expect(ids).toContain('card');
    expect(ids).toContain('button'); // Transitive dependency of Card!
    expect(plan.pages[0].title).toBe('Custom Card DS · Start Here'); // clean page naming (no 00 prefix)
    expect(plan.tokens[0].name.startsWith('acme/')).toBe(true);
  });

  it('applies Ant Design compact density overrides when strictFidelity is false', () => {
    const antd = getLibraryById('antd')!;
    const defaultPlan = compileExecutionPlan(antd, {
      libraryId: 'antd',
      namespace: 'AntD Default',
      locale: 'en',
      pageNaming: 'numbered',
      scope: 'technical-slice',
      selectedComponentIds: [],
      brandHex: antd.defaultBrandHex,
      fontPresetId: antd.defaultFontPresetId,
      radiusPreset: 'md',
      density: 'default',
      tokenPrefix: '',
      strictFidelity: false,
    });
    const compactPlan = compileExecutionPlan(antd, {
      ...defaultPlan.config,
      density: 'compact',
    });

    const defHeight = defaultPlan.tokens.find((t) => t.logicalId === 'primitive.size.control.md');
    const cmpHeight = compactPlan.tokens.find((t) => t.logicalId === 'primitive.size.control.md');
    expect(defHeight?.valuesByMode.Base).not.toEqual(cmpHeight?.valuesByMode.Base);
  });

  it('computes accurate Three-Way Diff classifications and handles migration renames & deprecations', () => {
    const shadcn = getLibraryById('shadcn')!;
    const basePlan = compileExecutionPlan(shadcn, {
      libraryId: 'shadcn',
      namespace: 'Diff Test',
      locale: 'en',
      pageNaming: 'numbered',
      scope: 'technical-slice',
      selectedComponentIds: [],
      brandHex: '#2563EB',
      fontPresetId: shadcn.defaultFontPresetId,
      radiusPreset: 'md',
      density: 'default',
      tokenPrefix: '',
      strictFidelity: false,
    });

    const baselineObjects: InstalledSystemRecord['objects'] = {};
    for (const p of basePlan.pages) {
      baselineObjects[p.logicalId] = {
        logicalId: p.logicalId,
        figmaId: `page:${p.logicalId}`,
        objectKind: 'page',
        displayName: p.title,
        lastGeneratedHash: `page:${p.pageKey}:${p.title}`,
        managedFields: { name: p.title },
      };
    }
    for (const t of basePlan.tokens) {
      baselineObjects[t.logicalId] = {
        logicalId: t.logicalId,
        figmaId: `var:${t.logicalId}`,
        objectKind: 'variable',
        displayName: t.name,
        lastGeneratedHash: basePlan.tokenHashes[t.logicalId],
        managedFields: { name: t.name },
      };
    }
    for (const c of basePlan.orderedComponents) {
      baselineObjects[c.logicalId] = {
        logicalId: c.logicalId,
        figmaId: `comp:${c.logicalId}`,
        objectKind: c.recipe.variantAxes.length > 0 ? 'component-set' : 'component',
        displayName: c.recipe.name,
        lastGeneratedHash: c.hash,
        managedFields: { name: c.recipe.name },
      };
    }
    // Add a legacy variable not in nextPlan to verify non-destructive deprecation
    baselineObjects['semantic.legacy.removed'] = {
      logicalId: 'semantic.legacy.removed',
      figmaId: 'var:legacy',
      objectKind: 'variable',
      displayName: 'legacy/removed',
      lastGeneratedHash: 'hash_legacy',
      managedFields: { name: 'legacy/removed' },
    };

    const baseline: InstalledSystemRecord = {
      systemInstanceId: 'ds_test_1',
      libraryId: 'shadcn',
      libraryDisplayName: 'shadcn/ui',
      namespace: 'Diff Test',
      schemaVersion: 1,
      packageVersion: shadcn.packageVersion,
      generatorVersion: '0.1.0',
      generatedAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      docsRefreshedAt: '2026-01-01T00:00:00.000Z',
      config: basePlan.config,
      objects: baselineObjects,
    };

    const liveSnap: LiveDocumentSnapshot = {
      systemInstanceId: 'ds_test_1',
      objectsByLogicalId: Object.fromEntries(
        Object.entries(baselineObjects).map(([id, obj]) => [
          id,
          {
            logicalId: id,
            figmaId: obj.figmaId,
            exists: true,
            currentDisplayName: obj.displayName,
            currentHash: obj.lastGeneratedHash,
          },
        ]),
      ),
    };

    // Simulate local Figma edits:
    // 1. User edited neutral surface token (which nextPlan won't touch -> preserve-local)
    liveSnap.objectsByLogicalId['semantic.surface.card'].currentHash = 'local-edit:card-surface';
    // 2. User edited brand 600 primitive token AND nextPlan changes brandHex -> conflict!
    liveSnap.objectsByLogicalId['primitive.color.brand.600'].currentHash = 'local-edit:brand-600';

    const nextPlan = compileExecutionPlan(shadcn, {
      ...basePlan.config,
      brandHex: '#E11D48', // Updates brand palette tokens!
    });

    const diff = computeThreeWayDiff(baseline, liveSnap, nextPlan);
    const byId = new Map(diff.entries.map((e) => [e.logicalId, e]));

    expect(byId.get('semantic.surface.card')?.action).toBe('preserve-local');
    expect(byId.get('primitive.color.brand.600')?.action).toBe('conflict');
    expect(byId.get('primitive.color.brand.500')?.action).toBe('safe-update');
    expect(byId.get('semantic.legacy.removed')?.action).toBe('deprecated');
    expect(diff.hasConflicts).toBe(true);
    expect(diff.hasLocalChanges).toBe(true);
  });

  it('exports canonical DTCG + Theme Manifest JSON and detects tampered resolutions', () => {
    const mui = getLibraryById('mui')!;
    const plan = compileExecutionPlan(mui, {
      libraryId: 'mui',
      namespace: 'Acme Material UI',
      locale: 'th',
      pageNaming: 'numbered',
      scope: 'core',
      selectedComponentIds: [],
      brandHex: '#0284C7',
      fontPresetId: mui.defaultFontPresetId,
      radiusPreset: 'md',
      density: 'default',
      tokenPrefix: '',
      strictFidelity: false,
    });

    const bundle = buildCanonicalTokenExport(plan);
    const verified = verifyExportedTokenBundle(bundle);
    expect(verified.valid).toBe(true);
    expect(verified.resolvedCount).toBe(bundle.tokens.length * 2);

    // Tamper with one Dark resolved value and confirm verifier catches mismatch
    const firstId = bundle.tokens[0].logicalId;
    bundle.resolvedThemes.Dark[firstId] = '#DEADBE';
    const brokenVerification = verifyExportedTokenBundle(bundle);
    expect(brokenVerification.valid).toBe(false);
    expect(brokenVerification.errors[0]).toContain('Theme resolution mismatch');
  });
});
