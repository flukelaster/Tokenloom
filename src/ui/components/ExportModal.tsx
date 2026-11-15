import React, { useState } from 'react';
import type { ExportVerificationResult } from '@engine';
import { IconCheck, IconCopy, IconDownload } from './Icons';

interface ExportModalProps {
  filename: string;
  bundleJson: string;
  verification: ExportVerificationResult;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  filename,
  bundleJson,
  verification,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(bundleJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback copy
    }
  };

  const handleDownload = () => {
    const blob = new Blob([bundleJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="dsf-overlay" role="dialog" aria-modal="true" aria-labelledby="export-modal-title">
      <div className="dsf-modal" data-testid="export-tokens-modal">
        <div className="dsf-section-header" style={{ flexWrap: 'wrap', gap: 8 }}>
          <h2 id="export-modal-title" className="dsf-h1">
            Canonical Token JSON Export
          </h2>
          <span className={`dsf-badge ${verification.valid ? 'dsf-badge-pass' : 'dsf-badge-error'}`}>
            {verification.valid
              ? `✓ Verified (${verification.resolvedCount} Light/Dark resolutions)`
              : '✕ Verification Failed'}
          </span>
        </div>

        <p className="dsf-muted">
          Includes 3-tier DTCG token definitions, resolved Light/Dark theme maps, and upstream license provenance (<code>{filename}</code>).
        </p>

        <textarea
          readOnly
          aria-label="Exported JSON payload"
          value={bundleJson}
          style={{
            width: '100%',
            height: 220,
            padding: 10,
            borderRadius: 8,
            border: '1px solid var(--dsf-border-strong)',
            background: 'var(--dsf-bg-recessed)',
            fontFamily: 'var(--dsf-font-mono)',
            fontSize: 11,
            resize: 'vertical',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="dsf-btn" onClick={handleCopy}>
            {copied ? <IconCheck size={13} /> : <IconCopy size={13} />}
            <span>{copied ? 'Copied' : 'Copy JSON'}</span>
          </button>
          <button type="button" className="dsf-btn dsf-btn-primary" onClick={handleDownload}>
            <IconDownload size={13} />
            <span>Download {filename}</span>
          </button>
          <button type="button" className="dsf-btn" onClick={onClose} data-testid="close-export-btn">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
