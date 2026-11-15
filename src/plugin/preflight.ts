import {
  SCHEMA_VERSION,
  validateLibraryDefinition,
  type InstalledSystemRecord,
  type LibraryDefinition,
} from '@schema';
import type { CompiledExecutionPlan } from '@engine';
import { listInstalledSystems } from './storage';

export interface PreflightCheckResult {
  ok: boolean;
  errorCode?:
    | 'PACKAGE_GATE_FAILED'
    | 'NAMESPACE_COLLISION'
    | 'SCHEMA_INCOMPATIBLE'
    | 'MODE_LIMIT_EXCEEDED';
  errorMessage?: string;
  matchedExistingSystem?: InstalledSystemRecord;
  warnings: string[];
}

/**
 * Probes whether the current Figma file/plan allows creating 2 Variable modes (Light & Dark)
 * without leaving any residual test collection behind on failure or success (Section 10 step 5 & Section 11).
 */
export async function probeVariableModeCapability(
  semanticCollectionName: string,
): Promise<{ supported: boolean; reason?: string }> {
  const existingCollections = await figma.variables.getLocalVariableCollectionsAsync();
  const existingSemantic = existingCollections.find((c) => c.name === semanticCollectionName);
  if (existingSemantic && existingSemantic.modes.length >= 2) {
    return { supported: true };
  }

  let probeCollection: VariableCollection | null = null;
  try {
    probeCollection = figma.variables.createVariableCollection('__ds_forge_mode_probe__');
    probeCollection.addMode('DarkProbe');
    return { supported: true };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return {
      supported: false,
      reason: `This Figma file cannot create multiple Variable modes (Light + Dark). Figma Starter/Free plans restrict collections to 1 mode. Move the file to a Professional/Organization/Education team space and re-run. (${detail})`,
    };
  } finally {
    if (probeCollection) {
      try {
        probeCollection.remove();
      } catch {
        // Ensure cleanup never throws
      }
    }
  }
}

export async function runPreflightChecks(
  library: LibraryDefinition,
  plan: CompiledExecutionPlan,
  explicitExistingInstanceId?: string,
): Promise<PreflightCheckResult> {
  const warnings = [...plan.preflightWarnings, ...plan.estimates.budgetWarnings];

  // 1. Package quality & license gate
  const audit = validateLibraryDefinition(library);
  if (!audit.readyGatePassed) {
    return {
      ok: false,
      errorCode: 'PACKAGE_GATE_FAILED',
      errorMessage: `Library "${library.displayName}" has not passed the Ready Quality Gate (${audit.issues.map((i) => i.message).join('; ') || `readiness=${library.readiness}`}).`,
      warnings,
    };
  }

  // 2. Installed system lookup & namespace collision check
  const installed = listInstalledSystems();
  let matchedExisting: InstalledSystemRecord | undefined;

  if (explicitExistingInstanceId) {
    matchedExisting = installed.find((s) => s.systemInstanceId === explicitExistingInstanceId);
  } else {
    matchedExisting = installed.find(
      (s) =>
        s.namespace.toLowerCase() === plan.config.namespace.toLowerCase() &&
        s.libraryId === library.libraryId,
    );
  }

  const collidingOtherSystem = installed.find(
    (s) =>
      s.namespace.toLowerCase() === plan.config.namespace.toLowerCase() &&
      s.systemInstanceId !== matchedExisting?.systemInstanceId,
  );
  if (collidingOtherSystem) {
    return {
      ok: false,
      errorCode: 'NAMESPACE_COLLISION',
      errorMessage: `Namespace "${plan.config.namespace}" is already used by an installed "${collidingOtherSystem.libraryDisplayName}" instance in this file. Choose a distinct Namespace so tokens and pages stay isolated.`,
      warnings,
    };
  }

  if (matchedExisting && matchedExisting.schemaVersion > SCHEMA_VERSION) {
    return {
      ok: false,
      errorCode: 'SCHEMA_INCOMPATIBLE',
      errorMessage: `Installed system "${matchedExisting.namespace}" uses newer schema v${matchedExisting.schemaVersion} (plugin supports v${SCHEMA_VERSION}). Update DS Forge before modifying.`,
      warnings,
    };
  }

  // 3. Multi-mode (Light + Dark) capability probe before mutating canvas
  if (library.capabilities.themes.length > 1) {
    const modeProbe = await probeVariableModeCapability(plan.collections.semanticName);
    if (!modeProbe.supported) {
      return {
        ok: false,
        errorCode: 'MODE_LIMIT_EXCEEDED',
        errorMessage: modeProbe.reason,
        warnings,
      };
    }
  }

  return {
    ok: true,
    matchedExistingSystem: matchedExisting,
    warnings,
  };
}
