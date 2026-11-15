import React, { useState } from 'react';
import { SCHEMA_VERSION, type RunJournal, type SupportedLocale } from '@schema';
import type { UiSettings } from '@shared';
import { IconCheck, IconCopy } from './Icons';

interface SettingsViewProps {
  settings: UiSettings;
  generatorVersion: string;
  incompleteJournals: RunJournal[];
  onSaveSettings: (next: UiSettings) => void;
  onResizePreset: (w: number, h: number) => void;
  onResumeJournal: (runId: string) => void;
  onCleanupJournal: (runId: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  generatorVersion,
  incompleteJournals,
  onSaveSettings,
  onResizePreset,
  onResumeJournal,
  onCleanupJournal,
}) => {
  const [draft, setDraft] = useState<UiSettings>(settings);
  const [copiedDiag, setCopiedDiag] = useState(false);

  const diagnosticSummary = JSON.stringify(
    {
      plugin: 'DS Forge',
      generatorVersion,
      schemaVersion: SCHEMA_VERSION,
      defaultLocale: draft.defaultLocale,
      window: `${draft.windowWidth}x${draft.windowHeight}`,
      incompleteRuns: incompleteJournals.length,
    },
    null,
    2,
  );

  const handleCopyDiagnostic = async () => {
    try {
      await navigator.clipboard.writeText(diagnosticSummary);
      setCopiedDiag(true);
      setTimeout(() => setCopiedDiag(false), 1600);
    } catch {
      // ignore
    }
  };

  return (
    <div className="dsf-scroll">
      <section className="dsf-section" aria-labelledby="prefs-heading">
        <h2 id="prefs-heading" className="dsf-h2">
          Plugin Preferences & Defaults
        </h2>

        <div className="dsf-field-row">
          <div className="dsf-field">
            <label className="dsf-label" htmlFor="default-prefix-input">
              Default Organization / Namespace Prefix
            </label>
            <input
              id="default-prefix-input"
              type="text"
              className="dsf-input"
              value={draft.defaultNamespacePrefix}
              onChange={(e) =>
                setDraft((p) => ({ ...p, defaultNamespacePrefix: e.target.value }))
              }
            />
          </div>

          <div className="dsf-field">
            <label className="dsf-label" htmlFor="default-locale-select">
              Default Documentation Language
            </label>
            <select
              id="default-locale-select"
              className="dsf-select"
              value={draft.defaultLocale}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  defaultLocale: e.target.value as SupportedLocale,
                }))
              }
            >
              <option value="en">English (EN)</option>
              <option value="th">ภาษาไทย (TH)</option>
            </select>
          </div>
        </div>

        <div className="dsf-field">
          <span className="dsf-label">Window Size Presets</span>
          <div className="dsf-segmented" style={{ flexWrap: 'wrap' }}>
            {[
              [840, 680, 'Standard (840 × 680)'],
              [980, 740, 'Wide (980 × 740)'],
              [480, 680, 'Compact (480 × 680)'],
            ].map(([w, h, label]) => (
              <button
                key={String(label)}
                type="button"
                className="dsf-seg-btn"
                aria-pressed={draft.windowWidth === w && draft.windowHeight === h}
                onClick={() => {
                  const width = Number(w);
                  const height = Number(h);
                  setDraft((p) => ({ ...p, windowWidth: width, windowHeight: height }));
                  onResizePreset(width, height);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="dsf-btn dsf-btn-primary"
            onClick={() => onSaveSettings(draft)}
          >
            Save Defaults
          </button>
        </div>
      </section>

      <section className="dsf-section">
        <h3 className="dsf-h2">Interrupted Run Journals ({incompleteJournals.length})</h3>
        {incompleteJournals.length === 0 ? (
          <p className="dsf-muted">
            No incomplete or interrupted generation runs recorded in this file.
          </p>
        ) : (
          incompleteJournals.map((j) => (
            <div key={j.runId} className="dsf-alert dsf-alert-warning">
              <div>
                <strong>
                  {j.namespace} ({j.libraryId}) — {j.status} at stage &ldquo;{j.currentStage}&rdquo;
                </strong>
                <p className="dsf-muted">
                  Started {new Date(j.startedAt).toLocaleString()} •{' '}
                  {j.completedComponentIds.length} component(s) completed
                </p>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className="dsf-btn dsf-btn-sm dsf-btn-primary"
                  onClick={() => onResumeJournal(j.runId)}
                >
                  Resume
                </button>
                <button
                  type="button"
                  className="dsf-btn dsf-btn-sm dsf-btn-danger"
                  onClick={() => onCleanupJournal(j.runId)}
                >
                  Clean up
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="dsf-section">
        <div className="dsf-section-header" style={{ flexWrap: 'wrap' }}>
          <div>
            <h3 className="dsf-h2">Diagnostics & Offline Sandbox</h3>
            <p className="dsf-muted">
              Zero external network calls (`networkAccess: none`). All libraries and SVGs run 100% offline inside Figma.
            </p>
          </div>
          <button type="button" className="dsf-btn dsf-btn-sm" onClick={handleCopyDiagnostic}>
            {copiedDiag ? <IconCheck size={12} /> : <IconCopy size={12} />}
            <span>{copiedDiag ? 'Copied' : 'Copy Summary'}</span>
          </button>
        </div>
        <pre
          style={{
            margin: 0,
            padding: 10,
            borderRadius: 8,
            background: 'var(--dsf-bg-recessed)',
            border: '1px solid var(--dsf-border)',
            fontFamily: 'var(--dsf-font-mono)',
            fontSize: 11,
          }}
        >
          {diagnosticSummary}
        </pre>
      </section>
    </div>
  );
};
