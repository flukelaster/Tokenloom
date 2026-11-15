import React, { useState } from 'react';
import type { GenerationConfig, LibraryDefinition, RadiusPreset } from '@schema';
import { generateBrandPalette, wcagContrastRatio } from '@engine';
import { IconMoon, IconSearch, IconSun } from './Icons';
import { LibraryLogo } from './LibraryLogo';

interface PreviewCanvasProps {
  library: LibraryDefinition;
  config: GenerationConfig;
}

const RADIUS_PX: Record<RadiusPreset, number> = {
  none: 0,
  sm: 4,
  md: 6,
  lg: 10,
  full: 999,
};

export const PreviewCanvas: React.FC<PreviewCanvasProps> = ({ library, config }) => {
  const [previewTheme, setPreviewTheme] = useState<'light' | 'dark'>('light');

  const activeHex = config.strictFidelity ? library.defaultBrandHex : config.brandHex;
  const palette = generateBrandPalette(activeHex);
  const isDark = previewTheme === 'dark';

  const primaryBg = isDark ? palette['400'] : palette['600'];
  const primaryFg = isDark ? palette['on-brand-dark'] : palette['on-brand-light'];
  const canvasBg = isDark ? '#0B0B0E' : '#F8F9FB';
  const cardBg = isDark ? '#16161B' : '#FFFFFF';
  const mutedBg = isDark ? '#222229' : '#EEF0F4';
  const borderCol = isDark ? '#2A2A34' : '#E2E5EC';
  const textCol = isDark ? '#F8FAFC' : '#0F172A';
  const mutedText = isDark ? '#94A3B8' : '#64748B';

  const effectiveRadiusPreset =
    config.strictFidelity || !library.capabilities.radiusCustomization
      ? library.defaultRadiusPreset
      : config.radiusPreset;
  const ctrlRadius = RADIUS_PX[effectiveRadiusPreset];
  const cardRadius = effectiveRadiusPreset === 'none' ? 0 : Math.min(14, ctrlRadius + 3);

  const isCompact =
    !config.strictFidelity && library.capabilities.density && config.density === 'compact';
  const controlHeight = isCompact ? 28 : 33;

  const fontPreset =
    library.fontPresets.find((f) => f.id === config.fontPresetId) ?? library.fontPresets[0];
  const previewFont =
    config.locale === 'th' ? fontPreset.thaiFallbackFamily : fontPreset.sansFamily;

  const fixture = library.previewFixture;
  const locale = config.locale;
  const contrast = wcagContrastRatio(primaryFg, primaryBg);

  return (
    <div className="dsf-section" data-testid="library-preview-panel">
      <div className="dsf-section-header" style={{ gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
          <LibraryLogo libraryId={library.libraryId} size={28} />
          <div style={{ minWidth: 0 }}>
            <h3 className="dsf-h2 dsf-truncate">{library.displayName}</h3>
            <p className="dsf-muted dsf-truncate">
              Live Preview · {library.source.spdxLicense}
            </p>
          </div>
        </div>

        <div
          className="dsf-segmented"
          role="group"
          aria-label="Library preview theme mode"
        >
          <button
            type="button"
            className="dsf-seg-btn"
            aria-pressed={previewTheme === 'light'}
            onClick={() => setPreviewTheme('light')}
            data-testid="preview-theme-light"
          >
            <IconSun size={12} />
            <span>Light</span>
          </button>
          <button
            type="button"
            className="dsf-seg-btn"
            aria-pressed={previewTheme === 'dark'}
            onClick={() => setPreviewTheme('dark')}
            data-testid="preview-theme-dark"
          >
            <IconMoon size={12} />
            <span>Dark</span>
          </button>
        </div>
      </div>

      {/* Simulated Canvas Stage */}
      <div
        className="dsf-preview-stage"
        data-testid="preview-stage"
        data-preview-mode={previewTheme}
        style={{
          backgroundColor: canvasBg,
          color: textCol,
          border: `1px solid ${borderCol}`,
          padding: isCompact ? 12 : 14,
          fontFamily: `'${previewFont}', var(--dsf-font-sans)`,
          display: 'flex',
          flexDirection: 'column',
          gap: isCompact ? 9 : 11,
        }}
      >
        {/* Top Row: Segmented Nav + Contrast Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              gap: 3,
              padding: 3,
              background: mutedBg,
              borderRadius: effectiveRadiusPreset === 'none' ? 0 : 8,
            }}
          >
            {fixture.navItems.map((item, idx) => (
              <span
                key={idx}
                style={{
                  padding: isCompact ? '2.5px 8px' : '3.5px 9px',
                  fontSize: 11.5,
                  fontWeight: idx === 0 ? 600 : 500,
                  borderRadius: effectiveRadiusPreset === 'none' ? 0 : 6,
                  background: idx === 0 ? cardBg : 'transparent',
                  color: idx === 0 ? textCol : mutedText,
                  boxShadow: idx === 0 ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {item[locale]}
              </span>
            ))}
          </div>

          <span
            style={{
              fontSize: 10.5,
              fontWeight: 650,
              padding: '2px 7px',
              borderRadius: effectiveRadiusPreset === 'none' ? 0 : 999,
              background: primaryBg,
              color: primaryFg,
            }}
          >
            AA {contrast}:1
          </span>
        </div>

        {/* Search Input Sample */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            height: controlHeight,
            padding: '0 10px',
            background: cardBg,
            border: `1px solid ${borderCol}`,
            borderRadius: Math.min(ctrlRadius, 999),
            fontSize: 12,
            color: mutedText,
          }}
        >
          <IconSearch size={12} />
          <span className="dsf-truncate">{fixture.inputPlaceholder[locale]}</span>
        </div>

        {/* Surface Card Sample */}
        <div
          style={{
            background: cardBg,
            border: `1px solid ${borderCol}`,
            borderRadius: cardRadius,
            padding: isCompact ? 11 : 14,
            boxShadow: isDark
              ? '0 2px 8px rgba(0,0,0,0.28)'
              : '0 2px 6px rgba(15,23,42,0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: 9,
          }}
        >
          <strong style={{ fontSize: 13.5, letterSpacing: '-0.01em' }}>
            {fixture.cardTitle[locale]}
          </strong>
          <p style={{ margin: 0, fontSize: 11.5, color: mutedText, lineHeight: 1.45 }}>
            {fixture.cardBody[locale]}
          </p>
          <div style={{ display: 'flex', gap: 7, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: controlHeight,
                padding: '0 11px',
                borderRadius: Math.min(ctrlRadius, 999),
                border: `1px solid ${borderCol}`,
                background: cardBg,
                color: textCol,
                fontSize: 11.5,
                fontWeight: 550,
              }}
            >
              {fixture.secondaryButtonLabel[locale]}
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: controlHeight,
                padding: '0 13px',
                borderRadius: Math.min(ctrlRadius, 999),
                background: primaryBg,
                color: primaryFg,
                fontSize: 11.5,
                fontWeight: 600,
              }}
            >
              {fixture.buttonLabel[locale]}
            </span>
          </div>
        </div>
      </div>

      {/* Live Token Readout Strip + Honesty Footnote */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        <span className="dsf-badge" style={{ fontFamily: 'var(--dsf-font-mono)' }}>
          {activeHex.toUpperCase()}
        </span>
        <span className="dsf-badge">Radius: {effectiveRadiusPreset.toUpperCase()}</span>
        <span className="dsf-badge">{previewFont}</span>
      </div>

      <p className="dsf-muted" style={{ fontSize: 11 }}>
        <strong>Simulated:</strong> {fixture.simulatedAttributes.join(' · ')}.{' '}
        {fixture.nonSimulatedLimitations[locale]}
      </p>
    </div>
  );
};
