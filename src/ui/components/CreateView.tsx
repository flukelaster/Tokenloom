import React, { useMemo, useState } from 'react';
import type {
  DensityMode,
  GenerationConfig,
  LibraryDefinition,
  PageNamingStyle,
  RadiusPreset,
  ScopePreset,
  SupportedLocale,
} from '@schema';
import { compileExecutionPlan } from '@engine';
import type { CatalogLibrarySummary } from '@libraries';
import {
  IconCheck,
  IconChevronRight,
  IconDownload,
  IconSearch,
  IconSparkles,
} from './Icons';
import { LibraryLogo } from './LibraryLogo';
import { PreviewCanvas } from './PreviewCanvas';

interface CreateViewProps {
  catalogSummaries: CatalogLibrarySummary[];
  selectedLibrary: LibraryDefinition;
  config: GenerationConfig;
  onSelectLibrary: (libraryId: string) => void;
  onUpdateConfig: (patch: Partial<GenerationConfig>) => void;
  onGenerate: () => void;
  onExportAdHoc: () => void;
}

type CatalogFilter = 'all' | 'ready' | 'soon';

const READINESS_RANK: Record<LibraryDefinition['readiness'], number> = {
  ready: 0,
  beta: 1,
  'coming-soon': 2,
};

export const CreateView: React.FC<CreateViewProps> = ({
  catalogSummaries,
  selectedLibrary,
  config,
  onSelectLibrary,
  onUpdateConfig,
  onGenerate,
  onExportAdHoc,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [catalogFilter, setCatalogFilter] = useState<CatalogFilter>('all');
  const [customHexInput, setCustomHexInput] = useState(config.brandHex);

  const sortedCatalog = useMemo(
    () =>
      [...catalogSummaries].sort(
        (a, b) =>
          READINESS_RANK[a.readiness] - READINESS_RANK[b.readiness] ||
          a.catalogOrder - b.catalogOrder,
      ),
    [catalogSummaries],
  );

  const readyTotalCount = useMemo(
    () => sortedCatalog.filter((i) => i.readiness !== 'coming-soon').length,
    [sortedCatalog],
  );
  const soonTotalCount = sortedCatalog.length - readyTotalCount;

  const filteredCatalog = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sortedCatalog.filter((item) => {
      if (catalogFilter === 'ready' && item.readiness === 'coming-soon') return false;
      if (catalogFilter === 'soon' && item.readiness !== 'coming-soon') return false;
      if (!q) return true;
      return (
        item.displayName.toLowerCase().includes(q) ||
        item.vendorOrOrigin.toLowerCase().includes(q) ||
        item.spdxLicense.toLowerCase().includes(q)
      );
    });
  }, [sortedCatalog, catalogFilter, searchQuery]);

  const activeItems = useMemo(
    () => filteredCatalog.filter((i) => i.readiness !== 'coming-soon'),
    [filteredCatalog],
  );
  const soonItems = useMemo(
    () => filteredCatalog.filter((i) => i.readiness === 'coming-soon'),
    [filteredCatalog],
  );

  const selectedSummary = catalogSummaries.find(
    (s) => s.libraryId === selectedLibrary.libraryId,
  )!;

  const compiledPlan = useMemo(() => {
    if (!selectedSummary.readyGatePassed) return null;
    return compileExecutionPlan(selectedLibrary, config);
  }, [selectedLibrary, selectedSummary.readyGatePassed, config]);

  const userFacingFamilies = useMemo(
    () => selectedLibrary.components.filter((c) => c.tier !== 'helper'),
    [selectedLibrary],
  );

  const toggleCustomComponent = (logicalId: string) => {
    const next = new Set(config.selectedComponentIds);
    if (next.has(logicalId)) {
      next.delete(logicalId);
    } else {
      next.add(logicalId);
    }
    onUpdateConfig({ selectedComponentIds: [...next] });
  };

  const handleCardSelect = (libraryId: string) => {
    onSelectLibrary(libraryId);
    setCustomHexInput(libraryId === selectedLibrary.libraryId ? config.brandHex : '');
  };

  return (
    <>
      <div className="dsf-scroll">
        {/* Step 1: Compact Library Launcher with Brand Logos */}
        <section className="dsf-section" aria-labelledby="catalog-heading">
          <div className="dsf-section-header" style={{ flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div className="dsf-step-row">
                <span className="dsf-step-pill">1</span>
                <h2 id="catalog-heading" className="dsf-h2">
                  Design System Library
                </h2>
              </div>

              <div className="dsf-segmented" role="group" aria-label="Filter by readiness">
                <button
                  type="button"
                  className="dsf-seg-btn"
                  aria-pressed={catalogFilter === 'all'}
                  onClick={() => setCatalogFilter('all')}
                >
                  All ({sortedCatalog.length})
                </button>
                <button
                  type="button"
                  className="dsf-seg-btn"
                  aria-pressed={catalogFilter === 'ready'}
                  onClick={() => setCatalogFilter('ready')}
                >
                  Ready ({readyTotalCount})
                </button>
                <button
                  type="button"
                  className="dsf-seg-btn"
                  aria-pressed={catalogFilter === 'soon'}
                  onClick={() => setCatalogFilter('soon')}
                >
                  Roadmap ({soonTotalCount})
                </button>
              </div>
            </div>

            <div className="dsf-search-wrap" style={{ minWidth: 196, flex: '0 1 220px' }}>
              <span className="dsf-search-icon">
                <IconSearch size={13} />
              </span>
              <input
                type="search"
                className="dsf-input"
                aria-label="Filter library catalog"
                placeholder="Search libraries or license…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="catalog-search-input"
              />
            </div>
          </div>

          {/* Ready & Beta Libraries Row */}
          {activeItems.length > 0 && (
            <div className="dsf-catalog-ready-grid" role="list">
              {activeItems.map((item) => {
                const isSelected = item.libraryId === selectedLibrary.libraryId;
                const isReady = item.readiness === 'ready';
                return (
                  <button
                    key={item.libraryId}
                    type="button"
                    className="dsf-lib-card"
                    aria-pressed={isSelected}
                    title={`${item.displayName} (${item.vendorOrOrigin})`}
                    onClick={() => handleCardSelect(item.libraryId)}
                    data-testid={`lib-card-${item.libraryId}`}
                  >
                    <LibraryLogo libraryId={item.libraryId} size={30} />
                    <div className="dsf-lib-card-body">
                      <div className="dsf-lib-card-title-row">
                        <span className="dsf-lib-card-name">{item.displayName}</span>
                        <span
                          className={`dsf-badge ${
                            isReady ? 'dsf-badge-ready' : 'dsf-badge-beta'
                          }`}
                        >
                          {isReady ? '✓ Ready' : '◆ Beta'}
                        </span>
                      </div>
                      <span className="dsf-lib-card-meta">
                        {item.componentFamilyCount} families ·{' '}
                        {item.themes.includes('dark') ? 'Light & Dark' : 'Light'} ·{' '}
                        {item.spdxLicense}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Compact Roadmap Strip */}
          {soonItems.length > 0 && (
            <div className="dsf-catalog-soon-wrap">
              <div className="dsf-catalog-soon-header">
                <span>Roadmap Adapters — Preview & Provenance Audited (Unlocks after QA Gate)</span>
              </div>
              <div className="dsf-catalog-soon-grid" role="list">
                {soonItems.map((item) => {
                  const isSelected = item.libraryId === selectedLibrary.libraryId;
                  return (
                    <button
                      key={item.libraryId}
                      type="button"
                      className="dsf-lib-card dsf-lib-card-soon"
                      aria-pressed={isSelected}
                      title={`${item.displayName} — Coming Soon (${item.spdxLicense})`}
                      onClick={() => handleCardSelect(item.libraryId)}
                      data-testid={`lib-card-${item.libraryId}`}
                    >
                      <LibraryLogo libraryId={item.libraryId} size={20} />
                      <div className="dsf-lib-card-body">
                        <div className="dsf-lib-card-title-row">
                          <span className="dsf-lib-card-name" style={{ fontSize: 11.5 }}>
                            {item.displayName}
                          </span>
                          <span className="dsf-badge" style={{ fontSize: 10, padding: '1px 5px' }}>
                            Soon
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {filteredCatalog.length === 0 && (
            <p className="dsf-muted" style={{ padding: '6px 2px' }}>
              No libraries match &ldquo;{searchQuery}&rdquo;. Try clearing your search filter.
            </p>
          )}
        </section>

        {/* Side-by-Side Interactive Studio */}
        <div className="dsf-workspace-split">
          <div className="dsf-sticky-col">
            <PreviewCanvas library={selectedLibrary} config={config} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Step 2: Brand & Visual Style (Capability-Gated per DS-009) */}
            {(selectedLibrary.capabilities.brandColor ||
              selectedLibrary.capabilities.fontCustomization ||
              selectedLibrary.capabilities.radiusCustomization) && (
              <section className="dsf-section" aria-labelledby="brand-heading">
                <div className="dsf-section-header">
                  <div className="dsf-step-row">
                    <span className="dsf-step-pill">2</span>
                    <h3 id="brand-heading" className="dsf-h2">
                      Brand & Visual Style
                    </h3>
                  </div>
                  {config.strictFidelity && (
                    <span className="dsf-badge dsf-badge-beta">Strict Fidelity</span>
                  )}
                </div>

                {selectedLibrary.capabilities.brandColor && (
                  <div className="dsf-field" data-testid="control-brand-color">
                    <div className="dsf-label-row">
                      <label className="dsf-label" htmlFor="brand-hex-input">
                        Primary Accent Color
                      </label>
                      <span className="dsf-hint">Auto-scales Light/Dark ramp</span>
                    </div>
                    <div className="dsf-swatch-row">
                      {selectedLibrary.brandPresets.map((preset) => {
                        const isActive =
                          config.brandHex.toUpperCase() === preset.primaryHex.toUpperCase();
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            className="dsf-swatch-btn"
                            title={`${preset.label.en} (${preset.primaryHex})`}
                            aria-label={`${preset.label.en} ${preset.primaryHex}`}
                            aria-pressed={isActive}
                            disabled={config.strictFidelity}
                            style={{ background: preset.primaryHex }}
                            onClick={() => {
                              onUpdateConfig({ brandHex: preset.primaryHex });
                              setCustomHexInput(preset.primaryHex);
                            }}
                          >
                            {isActive && <IconCheck size={11} />}
                          </button>
                        );
                      })}

                      <div className="dsf-hex-chip">
                        <span
                          className="dsf-hex-dot"
                          style={{ background: config.brandHex }}
                          aria-hidden="true"
                        />
                        <input
                          id="brand-hex-input"
                          type="text"
                          className="dsf-hex-input"
                          disabled={config.strictFidelity}
                          value={customHexInput || config.brandHex}
                          onChange={(e) => {
                            const v = e.target.value;
                            setCustomHexInput(v);
                            if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                              onUpdateConfig({ brandHex: v.toUpperCase() });
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {selectedLibrary.capabilities.fontCustomization && (
                  <div className="dsf-field" data-testid="control-font-preset">
                    <label className="dsf-label" htmlFor="font-preset-select">
                      Typography & Thai Fallback
                    </label>
                    <select
                      id="font-preset-select"
                      className="dsf-select"
                      value={config.fontPresetId}
                      onChange={(e) => onUpdateConfig({ fontPresetId: e.target.value })}
                    >
                      {selectedLibrary.fontPresets.map((fp) => (
                        <option key={fp.id} value={fp.id}>
                          {fp.label} · Mono: {fp.monoFamily}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedLibrary.capabilities.radiusCustomization && (
                  <div className="dsf-field" data-testid="control-radius-preset">
                    <span className="dsf-label">Corner Radius</span>
                    <div
                      className="dsf-segmented dsf-segmented-full"
                      role="group"
                      aria-label="Corner radius scale"
                    >
                      {selectedLibrary.capabilities.supportedRadiusPresets.map(
                        (rp: RadiusPreset) => (
                          <button
                            key={rp}
                            type="button"
                            className="dsf-seg-btn"
                            disabled={config.strictFidelity}
                            aria-pressed={config.radiusPreset === rp}
                            onClick={() => onUpdateConfig({ radiusPreset: rp })}
                          >
                            {rp.toUpperCase()}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Step 3: Scope & Output */}
            <section className="dsf-section" aria-labelledby="scope-output-heading">
              <div className="dsf-step-row">
                <span className="dsf-step-pill">3</span>
                <h3 id="scope-output-heading" className="dsf-h2">
                  Scope & Output
                </h3>
              </div>

              <div className="dsf-field">
                <div className="dsf-label-row">
                  <span className="dsf-label">Component Scope</span>
                  <span className="dsf-hint">
                    {config.scope === 'technical-slice'
                      ? 'Fast 3-component smoke test'
                      : config.scope === 'custom'
                        ? `${config.selectedComponentIds.length} selected`
                        : 'Propstar 2D variant matrices'}
                  </span>
                </div>
                <div
                  className="dsf-segmented dsf-segmented-full"
                  role="group"
                  aria-label="Component generation scope"
                >
                  {(
                    [
                      ['core', `Core (${userFacingFamilies.length})`],
                      ['technical-slice', 'Slice (3)'],
                      ['full', 'Full'],
                      ['custom', 'Custom'],
                    ] as Array<[ScopePreset, string]>
                  ).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      className="dsf-seg-btn"
                      aria-pressed={config.scope === val}
                      onClick={() =>
                        onUpdateConfig({
                          scope: val,
                          selectedComponentIds:
                            val === 'custom' && config.selectedComponentIds.length === 0
                              ? userFacingFamilies.slice(0, 3).map((c) => c.logicalId)
                              : config.selectedComponentIds,
                        })
                      }
                      data-testid={`scope-btn-${val}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {config.scope === 'custom' && userFacingFamilies.length > 0 && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: 5,
                    padding: 8,
                    borderRadius: 8,
                    background: 'var(--dsf-bg-recessed)',
                    border: '1px solid var(--dsf-border)',
                    maxHeight: 150,
                    overflowY: 'auto',
                  }}
                >
                  {userFacingFamilies.map((fam) => (
                    <label
                      key={fam.logicalId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 11.5,
                        cursor: 'pointer',
                        padding: '2px 4px',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={config.selectedComponentIds.includes(fam.logicalId)}
                        onChange={() => toggleCustomComponent(fam.logicalId)}
                      />
                      <span className="dsf-truncate">{fam.name}</span>
                    </label>
                  ))}
                </div>
              )}

              <div className="dsf-field">
                <div className="dsf-label-row">
                  <label className="dsf-label" htmlFor="namespace-input">
                    System Namespace
                  </label>
                  <span className="dsf-hint">Isolates collections & pages</span>
                </div>
                <input
                  id="namespace-input"
                  type="text"
                  className="dsf-input"
                  value={config.namespace}
                  onChange={(e) => onUpdateConfig({ namespace: e.target.value })}
                  data-testid="namespace-input"
                />
              </div>

              <div className="dsf-field-row">
                <div className="dsf-field">
                  <label className="dsf-label" htmlFor="doc-locale-select">
                    Docs Language
                  </label>
                  <select
                    id="doc-locale-select"
                    className="dsf-select"
                    value={config.locale}
                    onChange={(e) =>
                      onUpdateConfig({ locale: e.target.value as SupportedLocale })
                    }
                    data-testid="locale-select"
                  >
                    {selectedLibrary.capabilities.locales.includes('en') && (
                      <option value="en">English (EN)</option>
                    )}
                    {selectedLibrary.capabilities.locales.includes('th') && (
                      <option value="th">ภาษาไทย (TH)</option>
                    )}
                  </select>
                </div>

                <div className="dsf-field">
                  <label className="dsf-label" htmlFor="page-naming-select">
                    Page Naming
                  </label>
                  <select
                    id="page-naming-select"
                    className="dsf-select"
                    value={config.pageNaming}
                    onChange={(e) =>
                      onUpdateConfig({ pageNaming: e.target.value as PageNamingStyle })
                    }
                  >
                    <option value="numbered">Numbered (00, 01…)</option>
                    <option value="clean">Clean Names</option>
                  </select>
                </div>
              </div>

              {/* Optional Advanced Disclosure */}
              <details className="dsf-details">
                <summary data-testid="advanced-settings-toggle">
                  <span>Advanced Options</span>
                  <IconChevronRight size={13} className="dsf-details-chevron" />
                </summary>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                  {selectedLibrary.capabilities.density && (
                    <div className="dsf-field" data-testid="control-density">
                      <span className="dsf-label">Control Density Algorithm</span>
                      <div className="dsf-segmented">
                        {selectedLibrary.capabilities.supportedDensities.map(
                          (dm: DensityMode) => (
                            <button
                              key={dm}
                              type="button"
                              className="dsf-seg-btn"
                              aria-pressed={config.density === dm}
                              onClick={() => onUpdateConfig({ density: dm })}
                            >
                              {dm === 'compact' ? 'Compact' : 'Default'}
                            </button>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                  {selectedLibrary.capabilities.tokenPrefixCustomization && (
                    <div className="dsf-field">
                      <label className="dsf-label" htmlFor="token-prefix-input">
                        Optional Variable Path Prefix
                      </label>
                      <input
                        id="token-prefix-input"
                        type="text"
                        className="dsf-input"
                        placeholder="e.g. ds"
                        value={config.tokenPrefix}
                        onChange={(e) => onUpdateConfig({ tokenPrefix: e.target.value })}
                      />
                    </div>
                  )}

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                      cursor: 'pointer',
                      fontSize: 11.5,
                      color: 'var(--dsf-text-secondary)',
                    }}
                  >
                    <input
                      type="checkbox"
                      style={{ marginTop: 2 }}
                      checked={config.strictFidelity}
                      onChange={(e) => onUpdateConfig({ strictFidelity: e.target.checked })}
                    />
                    <span>
                      <strong style={{ color: 'var(--dsf-text-primary)' }}>
                        Strict Upstream Fidelity
                      </strong>{' '}
                      — Emit canonical library defaults without custom brand/radius overrides
                    </span>
                  </label>
                </div>
              </details>
            </section>
          </div>
        </div>

        {/* Preflight Warnings Box */}
        {compiledPlan && compiledPlan.preflightWarnings.length > 0 && (
          <div className="dsf-alert dsf-alert-warning" role="status">
            <div>
              <strong>Preflight Notes ({compiledPlan.preflightWarnings.length})</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 18, fontSize: 11.5 }}>
                {compiledPlan.preflightWarnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Action Footer */}
      <footer className="dsf-footer">
        <div className="dsf-estimates" data-testid="footer-estimates">
          {compiledPlan ? (
            <>
              <span className="dsf-metric-chip">
                <strong>{compiledPlan.estimates.pages}</strong> Pages
              </span>
              <span className="dsf-metric-chip">
                <strong>{compiledPlan.estimates.userFacingComponents}</strong> Families (
                {compiledPlan.estimates.totalVariants})
              </span>
              <span className="dsf-metric-chip">
                <strong>{compiledPlan.estimates.variables}</strong> Variables
              </span>
              <span className="dsf-metric-chip">
                <strong>{compiledPlan.estimates.styles}</strong> Styles
              </span>
            </>
          ) : (
            <span>
              <strong>{selectedLibrary.displayName}</strong> is in Roadmap QA — select a{' '}
              <strong>Ready</strong> or <strong>Beta</strong> library above to generate.
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            className="dsf-btn"
            disabled={!selectedSummary.readyGatePassed}
            onClick={onExportAdHoc}
            data-testid="footer-export-btn"
          >
            <IconDownload size={13} />
            <span>Export JSON</span>
          </button>
          <button
            type="button"
            className="dsf-btn dsf-btn-primary"
            disabled={!selectedSummary.readyGatePassed || !config.namespace.trim()}
            onClick={onGenerate}
            data-testid="generate-system-btn"
          >
            <IconSparkles size={13} />
            <span>Generate design system</span>
          </button>
        </div>
      </footer>
    </>
  );
};
