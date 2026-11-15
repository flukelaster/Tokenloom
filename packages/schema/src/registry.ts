import { z } from 'zod';
import {
  DENSITY_MODES,
  PAGE_NAMING_STYLES,
  RADIUS_PRESETS,
  SCOPE_PRESETS,
  SUPPORTED_LOCALES,
} from './constants';

export const GenerationConfigSchema = z.object({
  libraryId: z.string().min(1),
  namespace: z.string().trim().min(1).max(60),
  locale: z.enum(SUPPORTED_LOCALES),
  pageNaming: z.enum(PAGE_NAMING_STYLES),
  scope: z.enum(SCOPE_PRESETS),
  selectedComponentIds: z.array(z.string()),
  brandHex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  fontPresetId: z.string().min(1),
  radiusPreset: z.enum(RADIUS_PRESETS),
  density: z.enum(DENSITY_MODES),
  tokenPrefix: z.string().trim().max(24),
  strictFidelity: z.boolean(),
});
export type GenerationConfig = z.infer<typeof GenerationConfigSchema>;

export interface ManagedObjectRecord {
  logicalId: string;
  figmaId: string;
  objectKind:
    | 'page'
    | 'variable-collection'
    | 'variable'
    | 'text-style'
    | 'effect-style'
    | 'component-set'
    | 'component'
    | 'docs-section'
    | 'playground-frame'
    | 'pattern-frame';
  displayName: string;
  lastGeneratedHash: string;
  managedFields: Record<string, string>;
  deprecated?: boolean;
}

export interface InstalledSystemRecord {
  systemInstanceId: string;
  libraryId: string;
  libraryDisplayName: string;
  namespace: string;
  schemaVersion: number;
  packageVersion: string;
  generatorVersion: string;
  generatedAt: string;
  updatedAt: string;
  docsRefreshedAt: string;
  config: GenerationConfig;
  objects: Record<string, ManagedObjectRecord>;
}

export type RunStage =
  | 'preflight'
  | 'variables'
  | 'styles'
  | 'components'
  | 'documentation'
  | 'patterns-playground'
  | 'validate'
  | 'complete';

export interface RunJournal {
  runId: string;
  systemInstanceId: string;
  libraryId: string;
  namespace: string;
  startedAt: string;
  updatedAt: string;
  status: 'in_progress' | 'completed' | 'cancelled' | 'failed';
  currentStage: RunStage;
  config: GenerationConfig;
  createdCollectionIds: string[];
  createdVariableIds: string[];
  createdStyleIds: string[];
  createdNodeIds: string[];
  createdPageIds: string[];
  completedComponentIds: string[];
  errorMessage?: string;
}

export type ValidationSeverity = 'pass' | 'warning' | 'error';

export type ValidationCategory =
  | 'tokens'
  | 'bindings'
  | 'themes'
  | 'components'
  | 'docs'
  | 'pages'
  | 'idempotency'
  | 'contrast'
  | 'fonts'
  | 'license';

export interface ValidationIssue {
  id: string;
  category: ValidationCategory;
  severity: ValidationSeverity;
  title: string;
  detail: string;
  logicalId?: string;
  figmaId?: string;
}

export interface ValidationReport {
  systemInstanceId?: string;
  libraryId: string;
  namespace: string;
  timestamp: string;
  passed: boolean;
  summaryCounts: {
    pass: number;
    warning: number;
    error: number;
  };
  categoryStatus: Record<ValidationCategory, ValidationSeverity>;
  issues: ValidationIssue[];
  nonBindableExceptions: Array<{
    componentLogicalId: string;
    nodeId: string;
    field: string;
    reason: string;
  }>;
  contrastChecks: Array<{
    componentLogicalId: string;
    pairId: string;
    label: string;
    lightRatio: number | null;
    darkRatio: number | null;
    minRatio: number;
    passed: boolean;
    note?: string;
  }>;
}
