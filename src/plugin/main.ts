import { GENERATOR_VERSION } from '@schema';
import { parseUiMessage, type PluginToUiMessage } from '@shared';
import { PluginOrchestrator } from './job-runner';
import {
  listIncompleteJournals,
  listInstalledSystems,
  loadUiSettings,
  saveUiSettings,
} from './storage';

export function bootPluginMain(): PluginOrchestrator {
  const initialSettings = loadUiSettings();

  figma.showUI(__html__, {
    width: initialSettings.windowWidth,
    height: initialSettings.windowHeight,
    themeColors: true,
    title: 'DS Forge — Design System Generator',
  });

  const sendToUi = (msg: PluginToUiMessage) => {
    figma.ui.postMessage(msg);
  };

  const orchestrator = new PluginOrchestrator(sendToUi);

  figma.ui.onmessage = async (rawMessage: unknown) => {
    const parsed = parseUiMessage(rawMessage);
    if (!parsed.ok) {
      sendToUi({
        type: 'OPERATION_ERROR',
        code: 'INVALID_BRIDGE_MESSAGE',
        message: `Payload validation error: ${parsed.error}`,
        recoverable: true,
      });
      return;
    }

    const msg = parsed.data;

    switch (msg.type) {
      case 'INIT_REQUEST': {
        sendToUi({
          type: 'INIT_STATE',
          fileName: figma.root.name || 'Untitled',
          installedSystems: listInstalledSystems(),
          incompleteJournals: listIncompleteJournals(),
          settings: loadUiSettings(),
          generatorVersion: GENERATOR_VERSION,
        });
        break;
      }

      case 'GENERATE_SYSTEM': {
        await orchestrator.executeGenerationOrUpdate({
          config: msg.config,
          existingSystemInstanceId: msg.existingSystemInstanceId,
        });
        break;
      }

      case 'CANCEL_JOB': {
        orchestrator.requestCancel(msg.runId);
        break;
      }

      case 'RESUME_INTERRUPTED_JOB': {
        await orchestrator.resumeInterruptedRun(msg.runId);
        break;
      }

      case 'CLEANUP_INTERRUPTED_JOB': {
        await orchestrator.cleanupInterruptedRun(msg.runId);
        break;
      }

      case 'NAVIGATE_TO_TARGET': {
        await orchestrator.navigateToTarget(msg.systemInstanceId, msg.target);
        break;
      }

      case 'PREVIEW_DIFF_REQUEST': {
        await orchestrator.computeDiffPreview(msg.systemInstanceId, msg.nextConfig);
        break;
      }

      case 'APPLY_SYSTEM_UPDATE': {
        const existing = listInstalledSystems().find(
          (s) => s.systemInstanceId === msg.systemInstanceId,
        );
        if (existing) {
          await orchestrator.executeGenerationOrUpdate({
            config: msg.nextConfig ?? existing.config,
            existingSystemInstanceId: msg.systemInstanceId,
            conflictResolutions: msg.conflictResolutions,
          });
        }
        break;
      }

      case 'REFRESH_DOCUMENTATION': {
        await orchestrator.refreshDocumentationOnly(msg.systemInstanceId);
        break;
      }

      case 'VALIDATE_SYSTEM': {
        await orchestrator.runLiveValidation(msg.systemInstanceId);
        break;
      }

      case 'SWITCH_CANVAS_THEME': {
        await orchestrator.switchCanvasTheme(msg.systemInstanceId, msg.mode, msg.scope);
        break;
      }

      case 'EXPORT_TOKENS_REQUEST': {
        orchestrator.exportTokens(msg.systemInstanceId, msg.adHocConfig);
        break;
      }

      case 'DELETE_SYSTEM': {
        await orchestrator.deleteInstalledSystem(msg.systemInstanceId);
        break;
      }

      case 'SAVE_UI_SETTINGS': {
        saveUiSettings(msg.settings);
        figma.ui.resize(msg.settings.windowWidth, msg.settings.windowHeight);
        sendToUi({
          type: 'SETTINGS_SAVED',
          settings: msg.settings,
        });
        break;
      }

      case 'RESIZE_WINDOW': {
        figma.ui.resize(msg.width, msg.height);
        break;
      }
    }
  };

  return orchestrator;
}

// Auto-boot when running inside Figma's plugin runtime
if (typeof figma !== 'undefined' && typeof __html__ !== 'undefined') {
  bootPluginMain();
}
