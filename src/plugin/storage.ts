import {
  PLUGIN_DATA_NAMESPACE,
  type InstalledSystemRecord,
  type ManagedObjectRecord,
  type RunJournal,
} from '@schema';
import { DEFAULT_UI_SETTINGS, UiSettingsSchema, type UiSettings } from '@shared';

const CHUNK_CHAR_LIMIT = 45_000;
const KEY_PREFIX = `${PLUGIN_DATA_NAMESPACE}:`;

export interface NodeManagedPluginMeta {
  systemInstanceId: string;
  libraryId: string;
  logicalId: string;
  objectKind: ManagedObjectRecord['objectKind'];
  schemaVersion: number;
  packageVersion: string;
  generatorVersion: string;
  lastGeneratedHash: string;
}

function writeChunkedRootData(baseKey: string, jsonPayload: string): void {
  const fullPrefix = `${KEY_PREFIX}${baseKey}`;
  const prevCountStr = figma.root.getPluginData(`${fullPrefix}:count`);
  const prevCount = prevCountStr ? parseInt(prevCountStr, 10) : 0;

  const chunks: string[] = [];
  for (let i = 0; i < jsonPayload.length; i += CHUNK_CHAR_LIMIT) {
    chunks.push(jsonPayload.slice(i, i + CHUNK_CHAR_LIMIT));
  }

  figma.root.setPluginData(`${fullPrefix}:count`, String(chunks.length));
  for (let i = 0; i < chunks.length; i++) {
    figma.root.setPluginData(`${fullPrefix}:c${i}`, chunks[i]);
  }
  for (let i = chunks.length; i < prevCount; i++) {
    figma.root.setPluginData(`${fullPrefix}:c${i}`, '');
  }
}

function readChunkedRootData(baseKey: string): string | null {
  const fullPrefix = `${KEY_PREFIX}${baseKey}`;
  const countStr = figma.root.getPluginData(`${fullPrefix}:count`);
  if (!countStr) return null;
  const count = parseInt(countStr, 10);
  if (!Number.isFinite(count) || count <= 0) return null;

  let combined = '';
  for (let i = 0; i < count; i++) {
    combined += figma.root.getPluginData(`${fullPrefix}:c${i}`);
  }
  return combined || null;
}

function deleteChunkedRootData(baseKey: string): void {
  const fullPrefix = `${KEY_PREFIX}${baseKey}`;
  const countStr = figma.root.getPluginData(`${fullPrefix}:count`);
  const count = countStr ? parseInt(countStr, 10) : 0;
  for (let i = 0; i < count; i++) {
    figma.root.setPluginData(`${fullPrefix}:c${i}`, '');
  }
  figma.root.setPluginData(`${fullPrefix}:count`, '');
}

function readIdList(listKey: string): string[] {
  const raw = figma.root.getPluginData(`${KEY_PREFIX}${listKey}`);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function writeIdList(listKey: string, ids: string[]): void {
  const unique = [...new Set(ids)];
  figma.root.setPluginData(`${KEY_PREFIX}${listKey}`, JSON.stringify(unique));
}

export function listInstalledSystems(): InstalledSystemRecord[] {
  const ids = readIdList('systems');
  const records: InstalledSystemRecord[] = [];
  for (const id of ids) {
    const raw = readChunkedRootData(`sys:${id}`);
    if (!raw) continue;
    try {
      records.push(JSON.parse(raw) as InstalledSystemRecord);
    } catch {
      // Ignore malformed entry
    }
  }
  return records.sort((a, b) => a.generatedAt.localeCompare(b.generatedAt));
}

export function getInstalledSystem(systemInstanceId: string): InstalledSystemRecord | null {
  const raw = readChunkedRootData(`sys:${systemInstanceId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as InstalledSystemRecord;
  } catch {
    return null;
  }
}

export function saveInstalledSystem(record: InstalledSystemRecord): void {
  const ids = readIdList('systems');
  if (!ids.includes(record.systemInstanceId)) {
    ids.push(record.systemInstanceId);
    writeIdList('systems', ids);
  }
  writeChunkedRootData(`sys:${record.systemInstanceId}`, JSON.stringify(record));
}

export function removeInstalledSystemRecord(systemInstanceId: string): void {
  const ids = readIdList('systems').filter((id) => id !== systemInstanceId);
  writeIdList('systems', ids);
  deleteChunkedRootData(`sys:${systemInstanceId}`);
}

export function listIncompleteJournals(): RunJournal[] {
  const ids = readIdList('journals');
  const journals: RunJournal[] = [];
  for (const id of ids) {
    const raw = readChunkedRootData(`journal:${id}`);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as RunJournal;
      if (parsed.status === 'in_progress' || parsed.status === 'failed' || parsed.status === 'cancelled') {
        journals.push(parsed);
      }
    } catch {
      // ignore malformed
    }
  }
  return journals;
}

export function getRunJournal(runId: string): RunJournal | null {
  const raw = readChunkedRootData(`journal:${runId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RunJournal;
  } catch {
    return null;
  }
}

export function saveRunJournal(journal: RunJournal): void {
  const ids = readIdList('journals');
  if (!ids.includes(journal.runId)) {
    ids.push(journal.runId);
    writeIdList('journals', ids);
  }
  writeChunkedRootData(`journal:${journal.runId}`, JSON.stringify(journal));
}

export function removeRunJournal(runId: string): void {
  const ids = readIdList('journals').filter((id) => id !== runId);
  writeIdList('journals', ids);
  deleteChunkedRootData(`journal:${runId}`);
}

export function loadUiSettings(): UiSettings {
  const raw = figma.root.getPluginData(`${KEY_PREFIX}ui_settings`);
  if (!raw) return { ...DEFAULT_UI_SETTINGS };
  try {
    const parsed = UiSettingsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : { ...DEFAULT_UI_SETTINGS };
  } catch {
    return { ...DEFAULT_UI_SETTINGS };
  }
}

export function saveUiSettings(settings: UiSettings): void {
  figma.root.setPluginData(`${KEY_PREFIX}ui_settings`, JSON.stringify(settings));
}

export function setNodeManagedMeta(
  target: PluginDataMixin,
  meta: NodeManagedPluginMeta,
): void {
  try {
    target.setPluginData(`${KEY_PREFIX}meta`, JSON.stringify(meta));
  } catch {
    // Safe fallback if a host object restricts pluginData writes
  }
}

export function getNodeManagedMeta(target: PluginDataMixin): NodeManagedPluginMeta | null {
  try {
    const raw = target.getPluginData(`${KEY_PREFIX}meta`);
    if (!raw) return null;
    return JSON.parse(raw) as NodeManagedPluginMeta;
  } catch {
    return null;
  }
}
