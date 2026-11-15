import { z } from 'zod';
import {
  GenerationConfigSchema,
  SUPPORTED_LOCALES,
  THEME_MODES,
  type InstalledSystemRecord,
  type RunJournal,
  type RunStage,
  type ValidationReport,
} from '@schema';
import type {
  CanonicalTokenExportBundle,
  ConflictResolutionChoice,
  ExportVerificationResult,
  ThreeWayDiffReport,
} from '@engine';

export const UiSettingsSchema = z.object({
  defaultLocale: z.enum(SUPPORTED_LOCALES),
  defaultNamespacePrefix: z.string().trim().min(1).max(32),
  windowWidth: z.number().int().min(420).max(1600),
  windowHeight: z.number().int().min(480).max(1200),
});
export type UiSettings = z.infer<typeof UiSettingsSchema>;

export const DEFAULT_UI_SETTINGS: UiSettings = {
  defaultLocale: 'en',
  defaultNamespacePrefix: 'Acme',
  windowWidth: 840,
  windowHeight: 680,
};

export const ConflictResolutionChoiceSchema = z.enum(['replace', 'keep', 'skip']);

export const UiToPluginMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('INIT_REQUEST'),
  }),
  z.object({
    type: z.literal('GENERATE_SYSTEM'),
    config: GenerationConfigSchema,
    existingSystemInstanceId: z.string().optional(),
  }),
  z.object({
    type: z.literal('CANCEL_JOB'),
    runId: z.string().optional(),
  }),
  z.object({
    type: z.literal('RESUME_INTERRUPTED_JOB'),
    runId: z.string().min(1),
  }),
  z.object({
    type: z.literal('CLEANUP_INTERRUPTED_JOB'),
    runId: z.string().min(1),
  }),
  z.object({
    type: z.literal('NAVIGATE_TO_TARGET'),
    systemInstanceId: z.string().min(1),
    target: z.enum(['overview', 'components', 'quality-report', 'playground']),
  }),
  z.object({
    type: z.literal('PREVIEW_DIFF_REQUEST'),
    systemInstanceId: z.string().min(1),
    nextConfig: GenerationConfigSchema.optional(),
  }),
  z.object({
    type: z.literal('APPLY_SYSTEM_UPDATE'),
    systemInstanceId: z.string().min(1),
    nextConfig: GenerationConfigSchema.optional(),
    conflictResolutions: z.record(ConflictResolutionChoiceSchema),
  }),
  z.object({
    type: z.literal('REFRESH_DOCUMENTATION'),
    systemInstanceId: z.string().min(1),
  }),
  z.object({
    type: z.literal('VALIDATE_SYSTEM'),
    systemInstanceId: z.string().min(1),
  }),
  z.object({
    type: z.literal('SWITCH_CANVAS_THEME'),
    systemInstanceId: z.string().min(1),
    mode: z.enum(THEME_MODES),
    scope: z.enum(['managed-roots', 'selection']),
  }),
  z.object({
    type: z.literal('EXPORT_TOKENS_REQUEST'),
    systemInstanceId: z.string().optional(),
    adHocConfig: GenerationConfigSchema.optional(),
  }),
  z.object({
    type: z.literal('DELETE_SYSTEM'),
    systemInstanceId: z.string().min(1),
  }),
  z.object({
    type: z.literal('SAVE_UI_SETTINGS'),
    settings: UiSettingsSchema,
  }),
  z.object({
    type: z.literal('RESIZE_WINDOW'),
    width: z.number().int().min(420).max(1600),
    height: z.number().int().min(480).max(1200),
  }),
]);
export type UiToPluginMessage = z.infer<typeof UiToPluginMessageSchema>;

export interface JobProgressPayload {
  runId: string;
  stage: RunStage;
  stageLabel: string;
  completedInStage: number;
  totalInStage: number;
  currentItemLabel: string;
  elapsedMs: number;
  stageTimingsMs: Partial<Record<RunStage, number>>;
}

export type PluginToUiMessage =
  | {
      type: 'INIT_STATE';
      fileName: string;
      installedSystems: InstalledSystemRecord[];
      incompleteJournals: RunJournal[];
      settings: UiSettings;
      generatorVersion: string;
    }
  | {
      type: 'JOB_PROGRESS';
      progress: JobProgressPayload;
    }
  | {
      type: 'JOB_FINISHED';
      runId: string;
      status: 'completed' | 'cancelled' | 'failed';
      systemInstanceId?: string;
      message: string;
      validationReport?: ValidationReport;
      installedSystems: InstalledSystemRecord[];
      incompleteJournals: RunJournal[];
    }
  | {
      type: 'DIFF_PREVIEW_RESULT';
      systemInstanceId: string;
      diffReport: ThreeWayDiffReport;
    }
  | {
      type: 'VALIDATION_RESULT';
      report: ValidationReport;
    }
  | {
      type: 'EXPORT_TOKENS_RESULT';
      filename: string;
      bundle: CanonicalTokenExportBundle;
      bundleJson: string;
      verification: ExportVerificationResult;
    }
  | {
      type: 'THEME_SWITCH_RESULT';
      updatedFrameCount: number;
      mode: 'light' | 'dark';
      scope: 'managed-roots' | 'selection';
      message: string;
    }
  | {
      type: 'DELETE_SYSTEM_RESULT';
      deletedCount: number;
      skippedExternalRefs: string[];
      installedSystems: InstalledSystemRecord[];
      message: string;
    }
  | {
      type: 'SETTINGS_SAVED';
      settings: UiSettings;
    }
  | {
      type: 'OPERATION_ERROR';
      code: string;
      message: string;
      recoverable: boolean;
      details?: string;
    };

export function parseUiMessage(raw: unknown):
  | { ok: true; data: UiToPluginMessage }
  | { ok: false; error: string } {
  const res = UiToPluginMessageSchema.safeParse(raw);
  if (!res.success) {
    return {
      ok: false,
      error: res.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
    };
  }
  return { ok: true, data: res.data };
}

export type ConflictResolutionMap = Record<string, ConflictResolutionChoice>;
