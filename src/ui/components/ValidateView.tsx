import React, { useState } from 'react';
import type { InstalledSystemRecord, ValidationCategory, ValidationReport } from '@schema';
import { IconShieldCheck } from './Icons';

interface ValidateViewProps {
  installedSystems: InstalledSystemRecord[];
  latestReport: ValidationReport | null;
  onRunValidation: (systemInstanceId: string) => void;
}

const CATEGORY_LABELS: Record<ValidationCategory, string> = {
  tokens: 'Tokens & Descriptions',
  bindings: 'Variable Bindings',
  themes: 'Light / Dark Modes',
  components: 'Native Auto Layout',
  docs: 'Docs & Live Instances',
  pages: 'Manifest Pages',
  idempotency: 'Registry & Idempotency',
  contrast: 'Declared Contrast Pairs',
  fonts: 'Fonts & Thai Fallback',
  license: 'License & Provenance',
};

export const ValidateView: React.FC<ValidateViewProps> = ({
  installedSystems,
  latestReport,
  onRunValidation,
}) => {
  const [selectedId, setSelectedId] = useState<string>(
    latestReport?.systemInstanceId ?? installedSystems[0]?.systemInstanceId ?? '',
  );

  return (
    <div className="dsf-scroll">
      <section className="dsf-section" aria-labelledby="validate-heading">
        <div className="dsf-section-header" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 id="validate-heading" className="dsf-h2">
              Live Output Validator & Quality Gate
            </h2>
            <p className="dsf-muted">
              Audits live Figma Variables, alias integrity, Light/Dark modes, Auto Layout, linked Instances, and declared contrast pairs.
            </p>
          </div>
          {installedSystems.length > 0 && (
            <div style={{ display: 'flex', gap: 8 }}>
              <select
                aria-label="Select installed system to validate"
                className="dsf-select"
                style={{ width: 190 }}
                value={selectedId || installedSystems[0].systemInstanceId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {installedSystems.map((s) => (
                  <option key={s.systemInstanceId} value={s.systemInstanceId}>
                    {s.namespace}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="dsf-btn dsf-btn-primary"
                onClick={() =>
                  onRunValidation(selectedId || installedSystems[0].systemInstanceId)
                }
                data-testid="run-live-validation-btn"
              >
                <IconShieldCheck size={13} />
                <span>Run Audit</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {!latestReport ? (
        <div
          className="dsf-section"
          style={{ alignItems: 'center', textAlign: 'center', padding: '28px 20px' }}
        >
          <span
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'var(--dsf-accent-subtle)',
              color: 'var(--dsf-accent)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconShieldCheck size={19} />
          </span>
          <p className="dsf-muted">
            {installedSystems.length === 0
              ? 'Generate a Design System first to view live output validation results.'
              : 'Click "Run Audit" above to inspect the live Figma canvas.'}
          </p>
        </div>
      ) : (
        <>
          <section className="dsf-section" data-testid="validation-report-card">
            <div className="dsf-section-header" style={{ flexWrap: 'wrap', gap: 8 }}>
              <div>
                <h3 className="dsf-h2">
                  {latestReport.namespace} —{' '}
                  {latestReport.passed ? '✓ Quality Gate Passed' : '✕ Errors Detected'}
                </h3>
                <p className="dsf-muted">
                  Checked at {new Date(latestReport.timestamp).toLocaleString()}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <span className="dsf-badge dsf-badge-pass">
                  ✓ {latestReport.summaryCounts.pass} Pass
                </span>
                <span className="dsf-badge dsf-badge-warning">
                  ! {latestReport.summaryCounts.warning} Warn
                </span>
                <span className="dsf-badge dsf-badge-error">
                  ✕ {latestReport.summaryCounts.error} Error
                </span>
              </div>
            </div>

            <div className="dsf-catalog-grid">
              {(Object.keys(CATEGORY_LABELS) as ValidationCategory[]).map((cat) => {
                const st = latestReport.categoryStatus[cat];
                const badgeClass =
                  st === 'pass'
                    ? 'dsf-badge-pass'
                    : st === 'warning'
                      ? 'dsf-badge-warning'
                      : 'dsf-badge-error';
                const icon = st === 'pass' ? '✓ PASS' : st === 'warning' ? '! WARN' : '✕ FAIL';
                return (
                  <div
                    key={cat}
                    style={{
                      padding: '7px 10px',
                      borderRadius: 8,
                      border: '1px solid var(--dsf-border)',
                      background: 'var(--dsf-bg-elevated)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 550 }}>{CATEGORY_LABELS[cat]}</span>
                    <span className={`dsf-badge ${badgeClass}`}>{icon}</span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Contrast Pairs Table */}
          <section className="dsf-section">
            <div className="dsf-section-header">
              <h3 className="dsf-h2">
                Declared Recipe Contrast Checks ({latestReport.contrastChecks.length})
              </h3>
            </div>
            <p className="dsf-muted">
              Evaluates foreground/background token pairs declared in component recipes across Light & Dark modes.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 190, overflowY: 'auto' }}>
              {latestReport.contrastChecks.map((chk) => (
                <div
                  key={`${chk.componentLogicalId}-${chk.pairId}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: 11.5,
                    padding: '5px 9px',
                    borderRadius: 7,
                    background: 'var(--dsf-bg-elevated)',
                    border: '1px solid var(--dsf-border)',
                    gap: 8,
                  }}
                >
                  <span>
                    <strong>{chk.componentLogicalId}</strong> · {chk.label}
                  </span>
                  <span className={`dsf-badge ${chk.passed ? 'dsf-badge-pass' : 'dsf-badge-warning'}`}>
                    {chk.passed ? '✓' : '!'} Light {chk.lightRatio ?? 'N/A'}:1 · Dark{' '}
                    {chk.darkRatio ?? 'N/A'}:1 (≥{chk.minRatio}:1)
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Non-Bindable Capability Exceptions */}
          {latestReport.nonBindableExceptions.length > 0 && (
            <section className="dsf-section">
              <h3 className="dsf-h2">
                Documented Non-Bindable Capability Exceptions ({latestReport.nonBindableExceptions.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11.5 }}>
                {latestReport.nonBindableExceptions.map((ex, i) => (
                  <div key={i} className="dsf-muted">
                    • <code>{ex.componentLogicalId}.{ex.nodeId}</code> [{ex.field}]: {ex.reason}
                  </div>
                ))}
              </div>
            </section>
          )}

          {latestReport.issues.length > 0 && (
            <section className="dsf-section">
              <h3 className="dsf-h2">Diagnostic Findings ({latestReport.issues.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {latestReport.issues.map((iss) => (
                  <div
                    key={iss.id}
                    className={`dsf-alert ${
                      iss.severity === 'error' ? 'dsf-alert-error' : 'dsf-alert-warning'
                    }`}
                  >
                    <div>
                      <strong>
                        [{iss.severity.toUpperCase()}] {iss.title}
                      </strong>
                      <p className="dsf-muted">{iss.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};
