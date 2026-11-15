import { FIGMA_CAPABILITY_MATRIX, type BindableRecipeField } from './capability-matrix';
import { LibraryDefinitionSchema, type LibraryDefinition } from './library';
import type { RecipeNodeSpec } from './recipes';

export interface PackageAuditIssue {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  path?: string;
}

export interface PackageAuditResult {
  libraryId: string;
  readiness: string;
  validForCatalog: boolean;
  readyGatePassed: boolean;
  issues: PackageAuditIssue[];
  stats: {
    tokenCount: number;
    helperComponentCount: number;
    userFacingComponentCount: number;
    patternCount: number;
    textStyleCount: number;
    effectStyleCount: number;
  };
}

function collectNodeMap(node: RecipeNodeSpec, out: Map<string, RecipeNodeSpec>): PackageAuditIssue[] {
  const issues: PackageAuditIssue[] = [];
  if (out.has(node.id)) {
    issues.push({
      severity: 'error',
      code: 'DUPLICATE_RECIPE_NODE_ID',
      message: `Duplicate recipe node id "${node.id}"`,
    });
  }
  out.set(node.id, node);
  for (const child of node.children ?? []) {
    issues.push(...collectNodeMap(child, out));
  }
  return issues;
}

export function validateLibraryDefinition(raw: unknown): PackageAuditResult {
  const parsed = LibraryDefinitionSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      libraryId: typeof (raw as { libraryId?: unknown })?.libraryId === 'string'
        ? ((raw as { libraryId: string }).libraryId)
        : 'unknown',
      readiness: 'invalid',
      validForCatalog: false,
      readyGatePassed: false,
      issues: parsed.error.issues.map((iss) => ({
        severity: 'error',
        code: 'SCHEMA_VALIDATION_ERROR',
        message: iss.message,
        path: iss.path.join('.'),
      })),
      stats: {
        tokenCount: 0,
        helperComponentCount: 0,
        userFacingComponentCount: 0,
        patternCount: 0,
        textStyleCount: 0,
        effectStyleCount: 0,
      },
    };
  }

  const pkg: LibraryDefinition = parsed.data;
  const issues: PackageAuditIssue[] = [];

  // 1. License & Provenance checks (Section 3 & 13)
  if (
    pkg.source.pinnedRef.includes('<') ||
    pkg.source.pinnedRef.toLowerCase() === 'main' ||
    pkg.source.pinnedRef.toLowerCase() === 'master' ||
    pkg.source.pinnedRef.toLowerCase() === 'latest'
  ) {
    issues.push({
      severity: 'error',
      code: 'UNPINNED_SOURCE_REF',
      message: `Source ref "${pkg.source.pinnedRef}" must be a pinned tag or commit SHA, not a moving branch.`,
      path: 'source.pinnedRef',
    });
  }

  if (pkg.source.spdxLicense === 'Apache-2.0') {
    if (!pkg.source.noticeText || pkg.source.noticeText.trim().length < 10) {
      issues.push({
        severity: 'error',
        code: 'APACHE_MISSING_NOTICE',
        message: 'Apache-2.0 libraries must include NOTICE text provenance.',
        path: 'source.noticeText',
      });
    }
    if (!pkg.source.modifications || pkg.source.modifications.length === 0) {
      issues.push({
        severity: 'error',
        code: 'APACHE_MISSING_MODIFICATIONS',
        message: 'Apache-2.0 libraries must document derivative/recipe modifications.',
        path: 'source.modifications',
      });
    }
  }

  // 2. Token graph integrity (Section 6)
  const tokenById = new Map<string, (typeof pkg.tokens)[number]>();
  const collectionNames = new Set<string>();

  for (const token of pkg.tokens) {
    if (tokenById.has(token.logicalId)) {
      issues.push({
        severity: 'error',
        code: 'DUPLICATE_TOKEN_ID',
        message: `Duplicate token logicalId "${token.logicalId}".`,
      });
    }
    tokenById.set(token.logicalId, token);

    const collectionKey = `${token.collection}::${token.name}`;
    if (!/^[a-zA-Z0-9_-]+(\/[a-zA-Z0-9_-]+)*$/.test(token.name)) {
      issues.push({
        severity: 'error',
        code: 'INVALID_FIGMA_VARIABLE_NAME',
        message: `Variable name "${token.name}" (${token.logicalId}) contains characters disallowed by Figma createVariable (use only a-z, 0-9, -, _, and / group separators).`,
      });
    }
    if (collectionNames.has(collectionKey)) {
      issues.push({
        severity: 'error',
        code: 'DUPLICATE_TOKEN_NAME',
        message: `Duplicate variable name "${token.name}" in collection "${token.collection}".`,
      });
    }
    collectionNames.add(collectionKey);

    // Mode completeness
    if (token.collection === 'primitives' || token.collection === 'component') {
      if (!token.valuesByMode.Base) {
        issues.push({
          severity: 'error',
          code: 'MISSING_BASE_MODE_VALUE',
          message: `Token "${token.logicalId}" in "${token.collection}" must define a Base mode value.`,
        });
      }
    } else if (token.collection === 'semantic') {
      if (!token.valuesByMode.Light || !token.valuesByMode.Dark) {
        issues.push({
          severity: 'error',
          code: 'MISSING_SEMANTIC_MODE_VALUE',
          message: `Semantic token "${token.logicalId}" must define both Light and Dark mode values.`,
        });
      }
    }
  }

  // Alias target existence, type matching, tier layering, and cycle detection
  for (const token of pkg.tokens) {
    const modeEntries = Object.entries(token.valuesByMode).filter(
      (entry): entry is [string, NonNullable<(typeof token.valuesByMode)['Base']>] =>
        Boolean(entry[1]),
    );
    for (const [modeName, val] of modeEntries) {
      if (val.kind === 'alias') {
        const target = tokenById.get(val.targetLogicalId);
        if (!target) {
          issues.push({
            severity: 'error',
            code: 'DANGLING_TOKEN_ALIAS',
            message: `Token "${token.logicalId}" (${modeName}) aliases missing token "${val.targetLogicalId}".`,
          });
          continue;
        }
        if (target.type !== token.type) {
          issues.push({
            severity: 'error',
            code: 'ALIAS_TYPE_MISMATCH',
            message: `Token "${token.logicalId}" (${token.type}) aliases "${target.logicalId}" (${target.type}).`,
          });
        }
        if (token.collection === 'primitives' && target.collection !== 'primitives') {
          issues.push({
            severity: 'error',
            code: 'INVALID_COLLECTION_ALIAS_DIRECTION',
            message: `Primitives token "${token.logicalId}" must not alias higher-tier "${target.collection}" token "${target.logicalId}".`,
          });
        }
      }
    }
  }

  // Detect alias cycles across modes
  for (const modeContext of ['Light', 'Dark'] as const) {
    for (const token of pkg.tokens) {
      const visited = new Set<string>();
      let cursor: (typeof pkg.tokens)[number] | undefined = token;
      while (cursor) {
        if (visited.has(cursor.logicalId)) {
          issues.push({
            severity: 'error',
            code: 'TOKEN_ALIAS_CYCLE',
            message: `Alias cycle detected starting at "${token.logicalId}" in ${modeContext} resolution.`,
          });
          break;
        }
        visited.add(cursor.logicalId);
        const modeVal =
          cursor.collection === 'semantic'
            ? cursor.valuesByMode[modeContext]
            : cursor.valuesByMode.Base;
        if (modeVal && modeVal.kind === 'alias') {
          cursor = tokenById.get(modeVal.targetLogicalId);
        } else {
          cursor = undefined;
        }
      }
    }
  }

  // 3. Styles validation
  const textStyleIds = new Set(pkg.textStyles.map((s) => s.logicalId));
  const effectStyleIds = new Set(pkg.effectStyles.map((s) => s.logicalId));

  for (const ts of pkg.textStyles) {
    for (const [, boundTokenId] of Object.entries(ts.boundVariables ?? {})) {
      if (boundTokenId && !tokenById.has(boundTokenId)) {
        issues.push({
          severity: 'error',
          code: 'MISSING_TEXT_STYLE_TOKEN',
          message: `Text style "${ts.logicalId}" binds missing token "${boundTokenId}".`,
        });
      }
    }
  }

  for (const es of pkg.effectStyles) {
    for (const sh of es.shadows) {
      if (sh.colorTokenLogicalId && !tokenById.has(sh.colorTokenLogicalId)) {
        issues.push({
          severity: 'error',
          code: 'MISSING_EFFECT_STYLE_TOKEN',
          message: `Effect style "${es.logicalId}" binds missing token "${sh.colorTokenLogicalId}".`,
        });
      }
    }
  }

  // 4. Component recipes, bindings, properties, dependencies, and docs
  const componentById = new Map(pkg.components.map((c) => [c.logicalId, c]));
  const helperCount = pkg.components.filter((c) => c.tier === 'helper').length;
  const userFacingComponents = pkg.components.filter((c) => c.tier !== 'helper');

  for (const comp of pkg.components) {
    const nodeMap = new Map<string, RecipeNodeSpec>();
    issues.push(...collectNodeMap(comp.baseNode, nodeMap));

    const propByKey = new Map(comp.properties.map((p) => [p.logicalKey, p]));

    for (const prop of comp.properties) {
      if (prop.type === 'INSTANCE_SWAP') {
        if (typeof prop.defaultValue !== 'string' || !componentById.has(prop.defaultValue)) {
          issues.push({
            severity: 'error',
            code: 'INVALID_INSTANCE_SWAP_DEFAULT',
            message: `Component "${comp.logicalId}" property "${prop.logicalKey}" default "${String(prop.defaultValue)}" does not match a known component logicalId.`,
          });
        }
      }
    }

    const validateBindings = (bindings: Record<string, string | undefined> | undefined, ctx: string) => {
      if (!bindings) return;
      for (const [field, tokenLogicalId] of Object.entries(bindings)) {
        if (!tokenLogicalId) continue;
        const cap = FIGMA_CAPABILITY_MATRIX[field as BindableRecipeField];
        if (!cap || !cap.bindable) {
          issues.push({
            severity: 'error',
            code: 'UNSUPPORTED_BINDING_FIELD',
            message: `${ctx} attempts to bind unsupported field "${field}".`,
          });
          continue;
        }
        const tok = tokenById.get(tokenLogicalId);
        if (!tok) {
          issues.push({
            severity: 'error',
            code: 'MISSING_BOUND_TOKEN',
            message: `${ctx} binds field "${field}" to missing token "${tokenLogicalId}".`,
          });
          continue;
        }
        if (!cap.supportedTypes.includes(tok.type)) {
          issues.push({
            severity: 'error',
            code: 'BINDING_TYPE_MISMATCH',
            message: `${ctx} binds "${field}" (expects ${cap.supportedTypes.join('/')}) to "${tokenLogicalId}" (${tok.type}).`,
          });
        }
      }
    };

    for (const [nodeId, node] of nodeMap.entries()) {
      validateBindings(node.bindings, `Component "${comp.logicalId}" node "${nodeId}"`);
      if (node.textStyleLogicalId && !textStyleIds.has(node.textStyleLogicalId)) {
        issues.push({
          severity: 'error',
          code: 'MISSING_NODE_TEXT_STYLE',
          message: `Component "${comp.logicalId}" node "${nodeId}" references missing textStyle "${node.textStyleLogicalId}".`,
        });
      }
      if (node.effectStyleLogicalId && !effectStyleIds.has(node.effectStyleLogicalId)) {
        issues.push({
          severity: 'error',
          code: 'MISSING_NODE_EFFECT_STYLE',
          message: `Component "${comp.logicalId}" node "${nodeId}" references missing effectStyle "${node.effectStyleLogicalId}".`,
        });
      }
      if (node.kind === 'component-instance') {
        if (!node.componentLogicalId || !componentById.has(node.componentLogicalId)) {
          issues.push({
            severity: 'error',
            code: 'MISSING_NESTED_COMPONENT',
            message: `Component "${comp.logicalId}" node "${nodeId}" instantiates unknown component "${node.componentLogicalId ?? ''}".`,
          });
        } else if (!comp.dependencies.includes(node.componentLogicalId)) {
          issues.push({
            severity: 'error',
            code: 'UNDECLARED_COMPONENT_DEPENDENCY',
            message: `Component "${comp.logicalId}" instantiates "${node.componentLogicalId}" without listing it in dependencies.`,
          });
        }
      }
      if (node.kind === 'icon-vector') {
        const documented = comp.nonBindableExceptions.some(
          (ex) => ex.nodeId === nodeId && ex.field === 'svgVectorGeometry',
        );
        if (!documented) {
          issues.push({
            severity: 'error',
            code: 'UNDOCUMENTED_NON_BINDABLE_VECTOR',
            message: `Component "${comp.logicalId}" icon-vector node "${nodeId}" must declare an explicit svgVectorGeometry nonBindableException.`,
          });
        }
      }
      if (node.propertyRef) {
        for (const [, propKey] of Object.entries(node.propertyRef)) {
          if (propKey && !propByKey.has(propKey)) {
            issues.push({
              severity: 'error',
              code: 'UNKNOWN_COMPONENT_PROPERTY_REF',
              message: `Component "${comp.logicalId}" node "${nodeId}" references undeclared property "${propKey}".`,
            });
          }
        }
      }
    }

    for (const rule of comp.variantOverrides) {
      for (const [targetNodeId, patch] of Object.entries(rule.nodePatches)) {
        if (!nodeMap.has(targetNodeId)) {
          issues.push({
            severity: 'error',
            code: 'OVERRIDE_UNKNOWN_NODE',
            message: `Component "${comp.logicalId}" variant override references missing node "${targetNodeId}".`,
          });
        }
        validateBindings(patch.bindings, `Component "${comp.logicalId}" override "${targetNodeId}"`);
      }
    }

    for (const pair of comp.contrastPairs) {
      if (!tokenById.has(pair.foregroundTokenId) || !tokenById.has(pair.backgroundTokenId)) {
        issues.push({
          severity: 'error',
          code: 'INVALID_CONTRAST_PAIR_TOKEN',
          message: `Component "${comp.logicalId}" contrast pair "${pair.id}" references missing token.`,
        });
      }
    }

    if (comp.tier !== 'helper') {
      if (!comp.documentation) {
        issues.push({
          severity: 'error',
          code: 'MISSING_COMPONENT_DOCUMENTATION',
          message: `User-facing component "${comp.logicalId}" must include complete documentation metadata.`,
        });
      } else {
        for (const part of comp.documentation.anatomy) {
          if (!nodeMap.has(part.nodeId)) {
            issues.push({
              severity: 'error',
              code: 'ANATOMY_UNKNOWN_NODE',
              message: `Component "${comp.logicalId}" anatomy references unknown nodeId "${part.nodeId}".`,
            });
          }
        }
      }
    }
  }

  // Component dependency cycle check
  for (const comp of pkg.components) {
    const stack = new Set<string>();
    const dfs = (id: string): boolean => {
      if (stack.has(id)) return true;
      stack.add(id);
      const node = componentById.get(id);
      for (const dep of node?.dependencies ?? []) {
        if (!componentById.has(dep)) {
          issues.push({
            severity: 'error',
            code: 'MISSING_DEPENDENCY_TARGET',
            message: `Component "${id}" depends on unknown component "${dep}".`,
          });
          continue;
        }
        if (dfs(dep)) return true;
      }
      stack.delete(id);
      return false;
    };
    if (dfs(comp.logicalId)) {
      issues.push({
        severity: 'error',
        code: 'COMPONENT_DEPENDENCY_CYCLE',
        message: `Component dependency cycle detected involving "${comp.logicalId}".`,
      });
    }
  }

  // 5. Readiness gate enforcement (Section 2 & 3)
  if (pkg.readiness === 'ready' || pkg.readiness === 'beta') {
    if (pkg.tokens.length === 0 || userFacingComponents.length === 0) {
      issues.push({
        severity: 'error',
        code: 'EMPTY_EXECUTABLE_PACKAGE',
        message: `Package marked "${pkg.readiness}" must contain tokens and user-facing component recipes.`,
      });
    }
  }

  const hasErrors = issues.some((i) => i.severity === 'error');
  const readyGatePassed =
    !hasErrors &&
    (pkg.readiness === 'ready' || pkg.readiness === 'beta') &&
    userFacingComponents.length > 0 &&
    pkg.tokens.length > 0;

  return {
    libraryId: pkg.libraryId,
    readiness: pkg.readiness,
    validForCatalog: !hasErrors,
    readyGatePassed,
    issues,
    stats: {
      tokenCount: pkg.tokens.length,
      helperComponentCount: helperCount,
      userFacingComponentCount: userFacingComponents.length,
      patternCount: pkg.patterns.length,
      textStyleCount: pkg.textStyles.length,
      effectStyleCount: pkg.effectStyles.length,
    },
  };
}
