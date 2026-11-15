import React, { useState } from 'react';
import type { InstalledSystemRecord } from '@schema';
import type { ConflictResolutionChoice, ThreeWayDiffReport } from '@engine';
import {
  IconCheck,
  IconCompass,
  IconCopy,
  IconDiff,
  IconDownload,
  IconLayers,
  IconMoon,
  IconRefresh,
  IconShieldCheck,
  IconSun,
  IconTrash,
} from './Icons';
import { LibraryLogo } from './LibraryLogo';

interface ManageViewProps {
  installedSystems: InstalledSystemRecord[];
  activeDiffReport: ThreeWayDiffReport | null;
  onRequestDiffPreview: (systemInstanceId: string) => void;
  onApplyUpdate: (
    systemInstanceId: string,
    conflictResolutions: Record<string, ConflictResolutionChoice>,
  ) => void;
  onRefreshDocs: (systemInstanceId: string) => void;
  onValidate: (systemInstanceId: string) => void;
  onSwitchTheme: (
    systemInstanceId: string,
    mode: 'light' | 'dark',
    scope: 'managed-roots' | 'selection',
  ) => void;
  onExportTokens: (systemInstanceId: string) => void;
  onDeleteSystem: (systemInstanceId: string) => void;
  onNavigate: (
    systemInstanceId: string,
    target: 'overview' | 'components' | 'quality-report' | 'playground',
  ) => void;
}

export const ManageView: React.FC<ManageViewProps> = ({
  installedSystems,
  activeDiffReport,
  onRequestDiffPreview,
  onApplyUpdate,
  onRefreshDocs,
  onValidate,
  onSwitchTheme,
  onExportTokens,
  onDeleteSystem,
  onNavigate,
}) => {
  const [themeScope, setThemeScope] = useState<'managed-roots' | 'selection'>('managed-roots');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [resolutions, setResolutions] = useState<Record<string, ConflictResolutionChoice>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // ignore
    }
  };

  if (installedSystems.length === 0) {
    return (
      <div className="dsf-scroll">
        <div
          className="dsf-section"
          style={{ alignItems: 'center', textAlign: 'center', padding: '32px 20px' }}
          data-testid="manage-empty-state"
        >
          <span
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'var(--dsf-accent-subtle)',
              color: 'var(--dsf-accent)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconLayers size={20} />
          </span>
          <h2 className="dsf-h2">No Managed Design Systems in This File Yet</h2>
          <p className="dsf-muted" style={{ maxWidth: 420 }}>
            Generate a Design System from the <strong>Create</strong> tab to preview three-way updates, switch canvas Light/Dark modes, refresh documentation, or export DTCG tokens.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="dsf-scroll">
      {/* Scoped Canvas Theme Switcher Toolbar */}
      <section className="dsf-section" aria-labelledby="theme-scope-heading">
        <div className="dsf-section-header" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 id="theme-scope-heading" className="dsf-h2">
              Canvas Theme Switch Target
            </h2>
            <p className="dsf-muted">
              Mutates only DS Forge managed root frames or your active selection — never unrelated user frames.
            </p>
          </div>
          <div className="dsf-segmented" role="group" aria-label="Canvas theme switch target">
            <button
              type="button"
              className="dsf-seg-btn"
              aria-pressed={themeScope === 'managed-roots'}
              onClick={() => setThemeScope('managed-roots')}
            >
              Managed Root Frames
            </button>
            <button
              type="button"
              className="dsf-seg-btn"
              aria-pressed={themeScope === 'selection'}
              onClick={() => setThemeScope('selection')}
            >
              Current Selection
            </button>
          </div>
        </div>
      </section>

      {installedSystems.map((sys) => {
        const diffForThis =
          activeDiffReport?.systemInstanceId === sys.systemInstanceId
            ? activeDiffReport
            : null;
        const objectCount = Object.keys(sys.objects).length;

        return (
          <section
            key={sys.systemInstanceId}
            className="dsf-section"
            data-testid={`installed-system-${sys.libraryId}`}
          >
            {/* Card Header with Brand Logo & Metadata */}
            <div className="dsf-section-header" style={{ flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <LibraryLogo libraryId={sys.libraryId} size={36} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                    <h3 className="dsf-h2">{sys.namespace}</h3>
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: sys.config.brandHex,
                        border: '1px solid var(--dsf-border-strong)',
                      }}
                      title={`Brand ${sys.config.brandHex}`}
                    />
                    <span className="dsf-badge">v{sys.packageVersion}</span>
                    <span className="dsf-badge">{objectCount} objects</span>
                    <span className="dsf-badge">{sys.config.locale.toUpperCase()}</span>
                  </div>
                  <p className="dsf-muted" style={{ marginTop: 2 }}>
                    {sys.libraryDisplayName} · Generated {new Date(sys.generatedAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="dsf-code-row">
                <span className="dsf-truncate" style={{ maxWidth: 132 }}>
                  {sys.systemInstanceId}
                </span>
                <button
                  type="button"
                  className="dsf-btn dsf-btn-sm"
                  style={{ height: 22, padding: '0 6px' }}
                  onClick={() => copyId(sys.systemInstanceId)}
                  aria-label="Copy system instance ID"
                >
                  {copiedId === sys.systemInstanceId ? (
                    <IconCheck size={11} />
                  ) : (
                    <IconCopy size={11} />
                  )}
                </button>
              </div>
            </div>

            {/* Primary Lifecycle Actions */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              <button
                type="button"
                className="dsf-btn dsf-btn-subtle"
                onClick={() => onRequestDiffPreview(sys.systemInstanceId)}
                data-testid="preview-diff-btn"
              >
                <IconDiff size={13} />
                <span>Check Updates & Preview Diff</span>
              </button>
              <button
                type="button"
                className="dsf-btn"
                onClick={() => onRefreshDocs(sys.systemInstanceId)}
              >
                <IconRefresh size={13} />
                <span>Refresh Documentation</span>
              </button>
              <button
                type="button"
                className="dsf-btn"
                onClick={() => onValidate(sys.systemInstanceId)}
                data-testid="manage-validate-btn"
              >
                <IconShieldCheck size={13} />
                <span>Validate</span>
              </button>
              <button
                type="button"
                className="dsf-btn"
                onClick={() => onExportTokens(sys.systemInstanceId)}
              >
                <IconDownload size={13} />
                <span>Export Tokens</span>
              </button>
            </div>

            {/* Secondary Canvas Navigation, Mode & Danger Sub-Bar */}
            <div className="dsf-action-bar">
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                <button
                  type="button"
                  className="dsf-btn dsf-btn-sm"
                  onClick={() => onNavigate(sys.systemInstanceId, 'overview')}
                >
                  <IconCompass size={12} />
                  <span>Overview</span>
                </button>
                <button
                  type="button"
                  className="dsf-btn dsf-btn-sm"
                  onClick={() => onNavigate(sys.systemInstanceId, 'playground')}
                >
                  <span>Open Playground</span>
                </button>
                <button
                  type="button"
                  className="dsf-btn dsf-btn-sm"
                  onClick={() => onSwitchTheme(sys.systemInstanceId, 'light', themeScope)}
                >
                  <IconSun size={12} />
                  <span>Canvas Light</span>
                </button>
                <button
                  type="button"
                  className="dsf-btn dsf-btn-sm"
                  onClick={() => onSwitchTheme(sys.systemInstanceId, 'dark', themeScope)}
                >
                  <IconMoon size={12} />
                  <span>Canvas Dark</span>
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {confirmDeleteId === sys.systemInstanceId ? (
                  <>
                    <button
                      type="button"
                      className="dsf-btn dsf-btn-sm dsf-btn-danger"
                      onClick={() => {
                        onDeleteSystem(sys.systemInstanceId);
                        setConfirmDeleteId(null);
                      }}
                      data-testid="confirm-delete-system-btn"
                    >
                      Confirm Remove (Safe)
                    </button>
                    <button
                      type="button"
                      className="dsf-btn dsf-btn-sm"
                      onClick={() => setConfirmDeleteId(null)}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="dsf-btn dsf-btn-sm dsf-btn-danger"
                    onClick={() => setConfirmDeleteId(sys.systemInstanceId)}
                  >
                    <IconTrash size={12} />
                    <span>Delete System…</span>
                  </button>
                )}
              </div>
            </div>

            {/* Interactive Three-Way Diff Report & Conflict Resolver */}
            {diffForThis && (
              <div
                className="dsf-section"
                style={{ background: 'var(--dsf-bg-canvas)' }}
                data-testid="diff-report-panel"
              >
                <div className="dsf-section-header" style={{ flexWrap: 'wrap' }}>
                  <strong>
                    Three-Way Diff ({diffForThis.fromPackageVersion} → {diffForThis.toPackageVersion})
                  </strong>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    <span className="dsf-badge dsf-badge-pass">
                      Unchanged: {diffForThis.counts.unchanged}
                    </span>
                    <span className="dsf-badge">
                      Safe Update: {diffForThis.counts['safe-update']}
                    </span>
                    <span className="dsf-badge dsf-badge-beta">
                      Local Edits Preserved: {diffForThis.counts['preserve-local']}
                    </span>
                    <span className="dsf-badge">Added: {diffForThis.counts.added}</span>
                    {diffForThis.counts.conflict > 0 && (
                      <span className="dsf-badge dsf-badge-error">
                        Conflicts: {diffForThis.counts.conflict}
                      </span>
                    )}
                  </div>
                </div>

                {diffForThis.entries.filter((e) => e.action !== 'unchanged').length === 0 ? (
                  <p className="dsf-muted">
                    ✓ All managed objects match the generated baseline with zero local drift or conflicts.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                    {diffForThis.entries
                      .filter((e) => e.action !== 'unchanged')
                      .map((entry) => (
                        <div
                          key={entry.logicalId}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 8,
                            padding: '6px 8px',
                            borderRadius: 7,
                            border: '1px solid var(--dsf-border)',
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div>
                              <strong>{entry.displayName}</strong>{' '}
                              <span className="dsf-badge">{entry.action}</span>
                            </div>
                            <span className="dsf-muted">{entry.summary}</span>
                          </div>

                          {entry.action === 'conflict' && (
                            <select
                              aria-label={`Resolve conflict for ${entry.displayName}`}
                              className="dsf-select"
                              style={{ width: 145 }}
                              value={resolutions[entry.logicalId] ?? 'keep'}
                              onChange={(e) =>
                                setResolutions((prev) => ({
                                  ...prev,
                                  [entry.logicalId]: e.target.value as ConflictResolutionChoice,
                                }))
                              }
                            >
                              <option value="keep">Keep Local Edit</option>
                              <option value="replace">Replace with Package</option>
                              <option value="skip">Skip Object</option>
                            </select>
                          )}
                        </div>
                      ))}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="dsf-btn dsf-btn-primary"
                    onClick={() => onApplyUpdate(sys.systemInstanceId, resolutions)}
                    data-testid="apply-update-btn"
                  >
                    Apply Safe Update (Preserve Component & Variable IDs)
                  </button>
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
};
