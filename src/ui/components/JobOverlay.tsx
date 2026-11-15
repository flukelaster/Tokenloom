import React from 'react';
import type { ValidationReport } from '@schema';
import type { JobProgressPayload } from '@shared';
import { IconCompass, IconDownload, IconShieldCheck } from './Icons';

export interface ActiveJobState {
  runId: string;
  status: 'running' | 'completed' | 'cancelled' | 'failed';
  progress?: JobProgressPayload;
  systemInstanceId?: string;
  message?: string;
  validationReport?: ValidationReport;
}

interface JobOverlayProps {
  job: ActiveJobState;
  canResumeOrCleanup: boolean;
  onCancel: (runId: string) => void;
  onNavigate: (
    systemInstanceId: string,
    target: 'overview' | 'components' | 'quality-report' | 'playground',
  ) => void;
  onOpenValidationTab: (report: ValidationReport) => void;
  onExportTokens: (systemInstanceId: string) => void;
  onResume: (runId: string) => void;
  onCleanup: (runId: string) => void;
  onRetry: () => void;
  onDismiss: () => void;
}

const STAGE_ORDER = [
  'preflight',
  'variables',
  'components',
  'documentation',
  'patterns-playground',
  'validate',
] as const;

export const JobOverlay: React.FC<JobOverlayProps> = ({
  job,
  canResumeOrCleanup,
  onCancel,
  onNavigate,
  onOpenValidationTab,
  onExportTokens,
  onResume,
  onCleanup,
  onRetry,
  onDismiss,
}) => {
  const stageRatio =
    job.progress && job.progress.totalInStage > 0
      ? Math.min(100, Math.round((job.progress.completedInStage / job.progress.totalInStage) * 100))
      : job.status === 'completed'
        ? 100
        : 12;

  return (
    <div className="dsf-overlay" role="dialog" aria-modal="true" aria-labelledby="job-modal-title">
      <div className="dsf-modal" data-testid="job-status-modal">
        <div className="dsf-section-header">
          <h2 id="job-modal-title" className="dsf-h1">
            {job.status === 'running' && 'Generating Native Design System…'}
            {job.status === 'completed' && '✓ Design System Ready'}
            {job.status === 'cancelled' && '⏸ Generation Cancelled'}
            {job.status === 'failed' && '✕ Generation Stopped'}
          </h2>
          <span
            className={`dsf-badge ${
              job.status === 'completed'
                ? 'dsf-badge-pass'
                : job.status === 'running'
                  ? 'dsf-badge-beta'
                  : 'dsf-badge-error'
            }`}
          >
            {job.status.toUpperCase()}
          </span>
        </div>

        {/* Real Stage Item Counter + Smooth Progress Rail */}
        {job.progress && (
          <div
            className="dsf-section"
            aria-live="polite"
            style={{ background: 'var(--dsf-bg-elevated)' }}
          >
            <div className="dsf-section-header">
              <strong>{job.progress.stageLabel}</strong>
              <span className="dsf-code-row">
                {job.progress.completedInStage} / {job.progress.totalInStage} items
              </span>
            </div>

            <div className="dsf-progress-track" aria-hidden="true">
              <div className="dsf-progress-fill" style={{ width: `${stageRatio}%` }} />
            </div>

            <p className="dsf-muted" data-testid="job-current-item">
              Current: {job.progress.currentItemLabel} • Elapsed{' '}
              {(job.progress.elapsedMs / 1000).toFixed(1)}s
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {STAGE_ORDER.map((st) => {
                const isDone =
                  job.status === 'completed' || job.progress?.stageTimingsMs[st] !== undefined;
                const isCurrent = job.status === 'running' && job.progress?.stage === st;
                const timing = job.progress?.stageTimingsMs[st];
                return (
                  <span
                    key={st}
                    className={`dsf-badge ${
                      isCurrent ? 'dsf-badge-beta' : isDone ? 'dsf-badge-pass' : ''
                    }`}
                  >
                    {isDone ? '✓ ' : isCurrent ? '● ' : '○ '}
                    {st}
                    {timing !== undefined ? ` (${timing}ms)` : ''}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {job.message && <p style={{ margin: 0, fontSize: 12.5 }}>{job.message}</p>}

        {job.validationReport && (
          <div className="dsf-estimates">
            <span className="dsf-badge dsf-badge-pass">
              ✓ {job.validationReport.summaryCounts.pass}/10 Categories Passed
            </span>
            {job.validationReport.summaryCounts.warning > 0 && (
              <span className="dsf-badge dsf-badge-warning">
                ! {job.validationReport.summaryCounts.warning} Warning(s)
              </span>
            )}
            {job.validationReport.summaryCounts.error > 0 && (
              <span className="dsf-badge dsf-badge-error">
                ✕ {job.validationReport.summaryCounts.error} Error(s)
              </span>
            )}
          </div>
        )}

        {/* Action Buttons by State */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, justifyContent: 'flex-end' }}>
          {job.status === 'running' && (
            <button
              type="button"
              className="dsf-btn dsf-btn-danger"
              onClick={() => onCancel(job.runId)}
              data-testid="cancel-job-btn"
            >
              Cancel between batches
            </button>
          )}

          {job.status === 'completed' && job.systemInstanceId && (
            <>
              <button
                type="button"
                className="dsf-btn"
                onClick={() => onNavigate(job.systemInstanceId!, 'overview')}
              >
                <IconCompass size={13} />
                <span>Open overview</span>
              </button>
              <button
                type="button"
                className="dsf-btn"
                onClick={() => onNavigate(job.systemInstanceId!, 'components')}
              >
                <span>Go to components</span>
              </button>
              {job.validationReport && (
                <button
                  type="button"
                  className="dsf-btn"
                  onClick={() => {
                    onOpenValidationTab(job.validationReport!);
                    onDismiss();
                  }}
                >
                  <IconShieldCheck size={13} />
                  <span>View validation report</span>
                </button>
              )}
              <button
                type="button"
                className="dsf-btn"
                onClick={() => onExportTokens(job.systemInstanceId!)}
              >
                <IconDownload size={13} />
                <span>Export tokens</span>
              </button>
              <button
                type="button"
                className="dsf-btn dsf-btn-primary"
                onClick={onDismiss}
                data-testid="job-done-close-btn"
              >
                Done
              </button>
            </>
          )}

          {(job.status === 'cancelled' || job.status === 'failed') && (
            <>
              {canResumeOrCleanup && (
                <button
                  type="button"
                  className="dsf-btn dsf-btn-danger"
                  onClick={() => onCleanup(job.runId)}
                >
                  Clean up run artifacts
                </button>
              )}
              <button type="button" className="dsf-btn" onClick={onRetry}>
                Retry
              </button>
              {canResumeOrCleanup && (
                <button
                  type="button"
                  className="dsf-btn dsf-btn-primary"
                  onClick={() => onResume(job.runId)}
                >
                  Resume
                </button>
              )}
              <button type="button" className="dsf-btn" onClick={onDismiss}>
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
