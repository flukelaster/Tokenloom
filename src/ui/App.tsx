import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  GENERATOR_VERSION,
  type GenerationConfig,
  type InstalledSystemRecord,
  type LibraryDefinition,
  type RunJournal,
  type ValidationReport,
} from '@schema';
import type {
  ConflictResolutionChoice,
  ExportVerificationResult,
  ThreeWayDiffReport,
} from '@engine';
import { CATALOG_LIBRARIES, getCatalogSummaries, getLibraryById } from '@libraries';
import {
  DEFAULT_UI_SETTINGS,
  type PluginToUiMessage,
  type UiSettings,
} from '@shared';
import { isStandaloneBrowser, postToPlugin, subscribePluginMessages } from './bridge';
import { CreateView } from './components/CreateView';
import { ExportModal } from './components/ExportModal';
import {
  IconLayers,
  IconMoon,
  IconShieldCheck,
  IconSliders,
  IconSparkles,
  IconSun,
} from './components/Icons';
import { JobOverlay, type ActiveJobState } from './components/JobOverlay';
import { ManageView } from './components/ManageView';
import { SettingsView } from './components/SettingsView';
import { ValidateView } from './components/ValidateView';

type NavTab = 'create' | 'manage' | 'validate' | 'settings';

interface BannerState {
  tone: 'info' | 'warning' | 'error';
  title: string;
  detail?: string;
}

interface ExportModalPayload {
  filename: string;
  bundleJson: string;
  verification: ExportVerificationResult;
}

const NAV_ORDER: NavTab[] = ['create', 'manage', 'validate', 'settings'];

function buildConfigForLibrary(
  lib: LibraryDefinition,
  settings: UiSettings,
  prev?: Partial<GenerationConfig>,
): GenerationConfig {
  const prefix = settings.defaultNamespacePrefix.trim();
  const baseNamespace = lib.defaultNamespace;
  const namespace =
    prefix && !baseNamespace.toLowerCase().startsWith(prefix.toLowerCase())
      ? `${prefix} ${baseNamespace}`
      : baseNamespace;

  const locale = lib.capabilities.locales.includes(settings.defaultLocale)
    ? settings.defaultLocale
    : lib.capabilities.locales[0];

  return {
    libraryId: lib.libraryId,
    namespace,
    locale,
    pageNaming: prev?.pageNaming ?? 'numbered',
    scope: prev?.scope === 'technical-slice' || prev?.scope === 'full' ? prev.scope : 'core',
    selectedComponentIds: [],
    brandHex: lib.defaultBrandHex,
    fontPresetId: lib.defaultFontPresetId,
    radiusPreset: lib.defaultRadiusPreset,
    density: 'default',
    tokenPrefix: prev?.tokenPrefix ?? '',
    strictFidelity: prev?.strictFidelity ?? false,
  };
}

export const App: React.FC = () => {
  const catalogSummaries = useMemo(() => getCatalogSummaries(), []);
  const defaultLibrary = CATALOG_LIBRARIES[0];

  const [activeTab, setActiveTab] = useState<NavTab>('create');
  const [editorTheme, setEditorTheme] = useState<'light' | 'dark'>('light');
  const [fileName, setFileName] = useState<string>('Figma Design File');
  const [generatorVersion, setGeneratorVersion] = useState<string>(GENERATOR_VERSION);
  const [settings, setSettings] = useState<UiSettings>(DEFAULT_UI_SETTINGS);
  const [installedSystems, setInstalledSystems] = useState<InstalledSystemRecord[]>([]);
  const [incompleteJournals, setIncompleteJournals] = useState<RunJournal[]>([]);

  const [config, setConfig] = useState<GenerationConfig>(() =>
    buildConfigForLibrary(defaultLibrary, DEFAULT_UI_SETTINGS),
  );
  const [activeJob, setActiveJob] = useState<ActiveJobState | null>(null);
  const [activeDiffReport, setActiveDiffReport] = useState<ThreeWayDiffReport | null>(null);
  const [latestValidationReport, setLatestValidationReport] =
    useState<ValidationReport | null>(null);
  const [exportPayload, setExportPayload] = useState<ExportModalPayload | null>(null);
  const [banner, setBanner] = useState<BannerState | null>(null);

  const navRefs = useRef<Record<NavTab, HTMLButtonElement | null>>({
    create: null,
    manage: null,
    validate: null,
    settings: null,
  });

  const selectedLibrary = useMemo(
    () => getLibraryById(config.libraryId) ?? defaultLibrary,
    [config.libraryId, defaultLibrary],
  );

  // Sync standalone editor theme attribute on <html> without touching PreviewCanvas theme
  useEffect(() => {
    if (!isStandaloneBrowser) return;
    document.documentElement.setAttribute('data-editor-theme', editorTheme);
  }, [editorTheme]);

  // Subscribe to messages from Plugin Main thread (or Standalone Simulator)
  useEffect(() => {
    const unsubscribe = subscribePluginMessages((msg: PluginToUiMessage) => {
      switch (msg.type) {
        case 'INIT_STATE': {
          setFileName(msg.fileName);
          setInstalledSystems(msg.installedSystems);
          setIncompleteJournals(msg.incompleteJournals);
          setSettings(msg.settings);
          setGeneratorVersion(msg.generatorVersion);
          setConfig((prev) => {
            const lib = getLibraryById(prev.libraryId) ?? defaultLibrary;
            return buildConfigForLibrary(lib, msg.settings, prev);
          });
          break;
        }
        case 'JOB_PROGRESS': {
          setActiveJob((prev) => ({
            runId: msg.progress.runId,
            status: 'running',
            progress: msg.progress,
            systemInstanceId: prev?.systemInstanceId,
            validationReport: prev?.validationReport,
          }));
          break;
        }
        case 'JOB_FINISHED': {
          setInstalledSystems(msg.installedSystems);
          setIncompleteJournals(msg.incompleteJournals);
          if (msg.validationReport) {
            setLatestValidationReport(msg.validationReport);
          }
          setActiveJob((prev) =>
            prev
              ? {
                  ...prev,
                  runId: msg.runId,
                  status: msg.status,
                  systemInstanceId: msg.systemInstanceId,
                  message: msg.message,
                  validationReport: msg.validationReport,
                }
              : {
                  runId: msg.runId,
                  status: msg.status,
                  systemInstanceId: msg.systemInstanceId,
                  message: msg.message,
                  validationReport: msg.validationReport,
                },
          );
          break;
        }
        case 'DIFF_PREVIEW_RESULT': {
          setActiveDiffReport(msg.diffReport);
          break;
        }
        case 'VALIDATION_RESULT': {
          setLatestValidationReport(msg.report);
          setActiveTab('validate');
          break;
        }
        case 'EXPORT_TOKENS_RESULT': {
          setExportPayload({
            filename: msg.filename,
            bundleJson: msg.bundleJson,
            verification: msg.verification,
          });
          break;
        }
        case 'THEME_SWITCH_RESULT': {
          setBanner({
            tone: 'info',
            title: `Canvas Mode → ${msg.mode.toUpperCase()}`,
            detail: msg.message,
          });
          break;
        }
        case 'DELETE_SYSTEM_RESULT': {
          setInstalledSystems(msg.installedSystems);
          setActiveDiffReport(null);
          setBanner({
            tone: msg.skippedExternalRefs.length > 0 ? 'warning' : 'info',
            title: msg.message,
            detail:
              msg.skippedExternalRefs.length > 0
                ? `Preserved ${msg.skippedExternalRefs.length} component(s) still referenced by external user frames.`
                : `Deleted ${msg.deletedCount} managed objects cleanly.`,
          });
          break;
        }
        case 'SETTINGS_SAVED': {
          setSettings(msg.settings);
          setBanner({
            tone: 'info',
            title: 'Preferences Saved',
            detail: `Default namespace prefix "${msg.settings.defaultNamespacePrefix}" • Locale ${msg.settings.defaultLocale.toUpperCase()}`,
          });
          break;
        }
        case 'OPERATION_ERROR': {
          setActiveJob(null);
          setBanner({
            tone: 'error',
            title: `[${msg.code}] ${msg.message}`,
            detail: msg.details,
          });
          break;
        }
      }
    });

    postToPlugin({ type: 'INIT_REQUEST' });
    return unsubscribe;
  }, [defaultLibrary]);

  const handleSelectLibrary = useCallback(
    (libraryId: string) => {
      const lib = getLibraryById(libraryId);
      if (!lib) return;
      setConfig((prev) => buildConfigForLibrary(lib, settings, prev));
    },
    [settings],
  );

  const handleUpdateConfig = useCallback((patch: Partial<GenerationConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleStartGeneration = useCallback(() => {
    setBanner(null);
    const matchingExisting = installedSystems.find(
      (s) =>
        s.libraryId === config.libraryId &&
        s.namespace.trim().toLowerCase() === config.namespace.trim().toLowerCase(),
    );
    setActiveJob({
      runId: 'pending',
      status: 'running',
      message: 'Starting preflight & capability checks…',
    });
    postToPlugin({
      type: 'GENERATE_SYSTEM',
      config,
      existingSystemInstanceId: matchingExisting?.systemInstanceId,
    });
  }, [config, installedSystems]);

  const handleApplyUpdate = useCallback(
    (
      systemInstanceId: string,
      conflictResolutions: Record<string, ConflictResolutionChoice>,
    ) => {
      setBanner(null);
      setActiveJob({
        runId: 'pending_update',
        status: 'running',
        systemInstanceId,
        message: 'Applying safe three-way update…',
      });
      postToPlugin({
        type: 'APPLY_SYSTEM_UPDATE',
        systemInstanceId,
        conflictResolutions,
      });
    },
    [],
  );

  const handleRefreshDocs = useCallback((systemInstanceId: string) => {
    setBanner(null);
    setActiveJob({
      runId: 'pending_docs',
      status: 'running',
      systemInstanceId,
      message: 'Refreshing documentation frames while preserving Custom Notes…',
    });
    postToPlugin({
      type: 'REFRESH_DOCUMENTATION',
      systemInstanceId,
    });
  }, []);

  const handleNavKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const idx = NAV_ORDER.indexOf(activeTab);
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      const next = NAV_ORDER[(idx + 1) % NAV_ORDER.length];
      setActiveTab(next);
      navRefs.current[next]?.focus();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = NAV_ORDER[(idx - 1 + NAV_ORDER.length) % NAV_ORDER.length];
      setActiveTab(prev);
      navRefs.current[prev]?.focus();
    }
  };

  // Drag-resize bottom-right corner handle
  const handleResizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = window.innerWidth || settings.windowWidth;
    const startH = window.innerHeight || settings.windowHeight;

    const onMove = (ev: PointerEvent) => {
      const width = Math.max(420, Math.min(1600, Math.round(startW + (ev.clientX - startX))));
      const height = Math.max(480, Math.min(1200, Math.round(startH + (ev.clientY - startY))));
      postToPlugin({ type: 'RESIZE_WINDOW', width, height });
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <div className="dsf-shell" data-testid="app-shell">
      {/* Top Header */}
      <header className="dsf-topbar">
        <div className="dsf-brand-row">
          <span className="dsf-logo-mark" aria-hidden="true">
            <IconSparkles size={13} />
          </span>
          <h1 className="dsf-brand-title">DS Forge</h1>
          <span className="dsf-brand-file-pill" title={fileName}>
            <span className="dsf-truncate">{fileName}</span>
          </span>
        </div>

        <div className="dsf-topbar-actions">
          <button
            type="button"
            className="dsf-btn dsf-btn-sm"
            onClick={() => setActiveTab('manage')}
            data-testid="topbar-managed-pill"
          >
            <span
              className={`dsf-status-dot ${
                installedSystems.length > 0 ? 'dsf-status-dot-active' : ''
              }`}
            />
            <span>
              {installedSystems.length} Managed{' '}
              {installedSystems.length === 1 ? 'System' : 'Systems'}
            </span>
          </button>

          {isStandaloneBrowser && (
            <button
              type="button"
              className="dsf-btn dsf-btn-sm"
              aria-label="Toggle Figma Editor UI theme simulation"
              onClick={() =>
                setEditorTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
              }
              data-testid="editor-theme-toggle"
            >
              {editorTheme === 'light' ? (
                <>
                  <IconMoon size={12} />
                  <span>Editor Dark</span>
                </>
              ) : (
                <>
                  <IconSun size={12} />
                  <span>Editor Light</span>
                </>
              )}
            </button>
          )}
        </div>
      </header>

      {/* Sidebar Navigation (Collapses to Horizontal Tabs at <= 560px) */}
      <nav
        className="dsf-nav"
        aria-label="Primary plugin navigation"
        role="tablist"
        onKeyDown={handleNavKeyDown}
      >
        <button
          ref={(el) => {
            navRefs.current.create = el;
          }}
          type="button"
          role="tab"
          id="tab-create"
          aria-controls="panel-create"
          aria-selected={activeTab === 'create'}
          tabIndex={activeTab === 'create' ? 0 : -1}
          className="dsf-nav-btn"
          onClick={() => setActiveTab('create')}
          data-testid="nav-tab-create"
        >
          <span className="dsf-nav-btn-label">
            <IconSparkles size={14} />
            <span>Create</span>
          </span>
        </button>

        <button
          ref={(el) => {
            navRefs.current.manage = el;
          }}
          type="button"
          role="tab"
          id="tab-manage"
          aria-controls="panel-manage"
          aria-selected={activeTab === 'manage'}
          tabIndex={activeTab === 'manage' ? 0 : -1}
          className="dsf-nav-btn"
          onClick={() => setActiveTab('manage')}
          data-testid="nav-tab-manage"
        >
          <span className="dsf-nav-btn-label">
            <IconLayers size={14} />
            <span>Manage</span>
          </span>
          {installedSystems.length > 0 && (
            <span className="dsf-badge">{installedSystems.length}</span>
          )}
        </button>

        <button
          ref={(el) => {
            navRefs.current.validate = el;
          }}
          type="button"
          role="tab"
          id="tab-validate"
          aria-controls="panel-validate"
          aria-selected={activeTab === 'validate'}
          tabIndex={activeTab === 'validate' ? 0 : -1}
          className="dsf-nav-btn"
          onClick={() => setActiveTab('validate')}
          data-testid="nav-tab-validate"
        >
          <span className="dsf-nav-btn-label">
            <IconShieldCheck size={14} />
            <span>Validate</span>
          </span>
          {latestValidationReport && (
            <span
              className={`dsf-badge ${
                latestValidationReport.passed ? 'dsf-badge-pass' : 'dsf-badge-error'
              }`}
            >
              {latestValidationReport.passed ? '✓' : '!'}
            </span>
          )}
        </button>

        <button
          ref={(el) => {
            navRefs.current.settings = el;
          }}
          type="button"
          role="tab"
          id="tab-settings"
          aria-controls="panel-settings"
          aria-selected={activeTab === 'settings'}
          tabIndex={activeTab === 'settings' ? 0 : -1}
          className="dsf-nav-btn"
          onClick={() => setActiveTab('settings')}
          data-testid="nav-tab-settings"
        >
          <span className="dsf-nav-btn-label">
            <IconSliders size={14} />
            <span>Settings</span>
          </span>
          {incompleteJournals.length > 0 && (
            <span className="dsf-badge dsf-badge-warning">
              ! {incompleteJournals.length}
            </span>
          )}
        </button>

        <div className="dsf-nav-footer" aria-hidden="true">
          <span>v{generatorVersion}</span>
          <span>Offline</span>
        </div>
      </nav>

      {/* Main Workspace */}
      <main
        className="dsf-main"
        id={`panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
      >
        {/* Interrupted Run Recovery Banner */}
        {incompleteJournals.length > 0 && !activeJob && (
          <div
            className="dsf-alert dsf-alert-warning"
            style={{ margin: '12px 14px 0' }}
            role="region"
            aria-label="Interrupted run recovery"
            data-testid="interrupted-run-banner"
          >
            <div>
              <strong>
                Interrupted Run Detected: {incompleteJournals[0].namespace} (
                {incompleteJournals[0].libraryId})
              </strong>
              <p className="dsf-muted">
                Stopped at stage &ldquo;{incompleteJournals[0].currentStage}&rdquo; with{' '}
                {incompleteJournals[0].completedComponentIds.length} completed component(s).
              </p>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button
                type="button"
                className="dsf-btn dsf-btn-sm dsf-btn-primary"
                onClick={() => {
                  const j = incompleteJournals[0];
                  setActiveJob({
                    runId: j.runId,
                    status: 'running',
                    message: 'Resuming interrupted generation run…',
                  });
                  postToPlugin({ type: 'RESUME_INTERRUPTED_JOB', runId: j.runId });
                }}
              >
                Resume
              </button>
              <button
                type="button"
                className="dsf-btn dsf-btn-sm dsf-btn-danger"
                onClick={() =>
                  postToPlugin({
                    type: 'CLEANUP_INTERRUPTED_JOB',
                    runId: incompleteJournals[0].runId,
                  })
                }
              >
                Clean up
              </button>
            </div>
          </div>
        )}

        {/* Dismissible Operation Banner */}
        {banner && !activeJob && (
          <div
            className={`dsf-alert ${
              banner.tone === 'error'
                ? 'dsf-alert-error'
                : banner.tone === 'warning'
                  ? 'dsf-alert-warning'
                  : ''
            }`}
            style={{ margin: '12px 14px 0' }}
            role={banner.tone === 'error' ? 'alert' : 'status'}
            data-testid="status-banner"
          >
            <div>
              <strong>{banner.title}</strong>
              {banner.detail && <p className="dsf-muted">{banner.detail}</p>}
            </div>
            <button
              type="button"
              className="dsf-btn dsf-btn-sm"
              onClick={() => setBanner(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        {activeTab === 'create' && (
          <CreateView
            catalogSummaries={catalogSummaries}
            selectedLibrary={selectedLibrary}
            config={config}
            onSelectLibrary={handleSelectLibrary}
            onUpdateConfig={handleUpdateConfig}
            onGenerate={handleStartGeneration}
            onExportAdHoc={() =>
              postToPlugin({
                type: 'EXPORT_TOKENS_REQUEST',
                adHocConfig: config,
              })
            }
          />
        )}

        {activeTab === 'manage' && (
          <ManageView
            installedSystems={installedSystems}
            activeDiffReport={activeDiffReport}
            onRequestDiffPreview={(systemInstanceId) =>
              postToPlugin({ type: 'PREVIEW_DIFF_REQUEST', systemInstanceId })
            }
            onApplyUpdate={handleApplyUpdate}
            onRefreshDocs={handleRefreshDocs}
            onValidate={(systemInstanceId) =>
              postToPlugin({ type: 'VALIDATE_SYSTEM', systemInstanceId })
            }
            onSwitchTheme={(systemInstanceId, mode, scope) =>
              postToPlugin({
                type: 'SWITCH_CANVAS_THEME',
                systemInstanceId,
                mode,
                scope,
              })
            }
            onExportTokens={(systemInstanceId) =>
              postToPlugin({ type: 'EXPORT_TOKENS_REQUEST', systemInstanceId })
            }
            onDeleteSystem={(systemInstanceId) =>
              postToPlugin({ type: 'DELETE_SYSTEM', systemInstanceId })
            }
            onNavigate={(systemInstanceId, target) =>
              postToPlugin({ type: 'NAVIGATE_TO_TARGET', systemInstanceId, target })
            }
          />
        )}

        {activeTab === 'validate' && (
          <ValidateView
            installedSystems={installedSystems}
            latestReport={latestValidationReport}
            onRunValidation={(systemInstanceId) =>
              postToPlugin({ type: 'VALIDATE_SYSTEM', systemInstanceId })
            }
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            settings={settings}
            generatorVersion={generatorVersion}
            incompleteJournals={incompleteJournals}
            onSaveSettings={(next) =>
              postToPlugin({ type: 'SAVE_UI_SETTINGS', settings: next })
            }
            onResizePreset={(width, height) =>
              postToPlugin({ type: 'RESIZE_WINDOW', width, height })
            }
            onResumeJournal={(runId) => {
              setActiveJob({
                runId,
                status: 'running',
                message: 'Resuming interrupted generation run…',
              });
              postToPlugin({ type: 'RESUME_INTERRUPTED_JOB', runId });
            }}
            onCleanupJournal={(runId) =>
              postToPlugin({ type: 'CLEANUP_INTERRUPTED_JOB', runId })
            }
          />
        )}
      </main>

      {/* Running / Completed / Cancelled Job Modal */}
      {activeJob && (
        <JobOverlay
          job={activeJob}
          canResumeOrCleanup={incompleteJournals.some(
            (j) => j.runId === activeJob.runId,
          )}
          onCancel={(runId) => postToPlugin({ type: 'CANCEL_JOB', runId })}
          onNavigate={(systemInstanceId, target) =>
            postToPlugin({ type: 'NAVIGATE_TO_TARGET', systemInstanceId, target })
          }
          onOpenValidationTab={(report) => {
            setLatestValidationReport(report);
            setActiveTab('validate');
          }}
          onExportTokens={(systemInstanceId) =>
            postToPlugin({ type: 'EXPORT_TOKENS_REQUEST', systemInstanceId })
          }
          onResume={(runId) => {
            setActiveJob({
              runId,
              status: 'running',
              message: 'Resuming interrupted generation run…',
            });
            postToPlugin({ type: 'RESUME_INTERRUPTED_JOB', runId });
          }}
          onCleanup={(runId) => {
            postToPlugin({ type: 'CLEANUP_INTERRUPTED_JOB', runId });
            setActiveJob(null);
          }}
          onRetry={handleStartGeneration}
          onDismiss={() => setActiveJob(null)}
        />
      )}

      {/* Canonical JSON Token Export Modal */}
      {exportPayload && (
        <ExportModal
          filename={exportPayload.filename}
          bundleJson={exportPayload.bundleJson}
          verification={exportPayload.verification}
          onClose={() => setExportPayload(null)}
        />
      )}

      {/* Window Resize Handle */}
      <div
        className="dsf-resize-handle"
        aria-hidden="true"
        title="Drag to resize plugin window"
        onPointerDown={handleResizePointerDown}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M12 3L3 12M12 7.5L7.5 12M12 12L11.5 12"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
};
