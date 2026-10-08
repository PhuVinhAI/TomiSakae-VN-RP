import { normalizeSettings, type FfGlobalSettings, type FfPreset } from "./core.js";

export const DEFAULT_CONFIG_PRESET_ID = "default";
export const CONFIG_PRESETS_STORAGE_KEY = "ff54-config-presets-v1";

export interface ConfigPreset {
  id: string;
  name: string;
  settings: FfGlobalSettings;
}

export interface ConfigPresetStore {
  version: 1;
  presets: ConfigPreset[];
  cardPresets: Record<string, string>;
}

export function normalizePresetStore(
  source: FfPreset,
  value: unknown,
  legacySettings?: unknown,
): ConfigPresetStore {
  const store: ConfigPresetStore = {
    version: 1,
    presets: [
      {
        id: DEFAULT_CONFIG_PRESET_ID,
        name: "Mặc định",
        settings: normalizeSettings(source, legacySettings),
      },
    ],
    cardPresets: {},
  };
  if (!value || typeof value !== "object" || Array.isArray(value)) return store;
  const record = value as Record<string, unknown>;
  if (record.version !== 1 || !Array.isArray(record.presets)) return store;
  const seen = new Set<string>();
  for (const item of record.presets) {
    if (!item || typeof item !== "object") continue;
    const entry = item as Record<string, unknown>;
    if (typeof entry.id !== "string" || !entry.id || seen.has(entry.id)) continue;
    if (typeof entry.name !== "string" || !entry.name.trim()) continue;
    const profile = {
      id: entry.id,
      name: entry.id === DEFAULT_CONFIG_PRESET_ID ? "Mặc định" : entry.name.trim(),
      settings: normalizeSettings(source, entry.settings),
    };
    seen.add(entry.id);
    if (entry.id === DEFAULT_CONFIG_PRESET_ID) store.presets[0] = profile;
    else store.presets.push(profile);
  }
  if (
    record.cardPresets &&
    typeof record.cardPresets === "object" &&
    !Array.isArray(record.cardPresets)
  ) {
    for (const [cardId, presetId] of Object.entries(record.cardPresets)) {
      if (
        cardId &&
        typeof presetId === "string" &&
        store.presets.some((entry) => entry.id === presetId)
      ) {
        Object.defineProperty(store.cardPresets, cardId, {
          value: presetId,
          enumerable: true,
          writable: true,
          configurable: true,
        });
      }
    }
  }
  return store;
}

export function presetForCard(store: ConfigPresetStore, cardId?: string): ConfigPreset {
  const selected =
    cardId && Object.hasOwn(store.cardPresets, cardId)
      ? store.cardPresets[cardId]
      : DEFAULT_CONFIG_PRESET_ID;
  return store.presets.find((entry) => entry.id === selected) ?? store.presets[0]!;
}

export function selectCardPreset(store: ConfigPresetStore, cardId: string, presetId: string): void {
  if (!cardId || !store.presets.some((entry) => entry.id === presetId)) {
    throw new Error("Không tìm thấy card hoặc preset đã chọn.");
  }
  Object.defineProperty(store.cardPresets, cardId, {
    value: presetId,
    enumerable: true,
    writable: true,
    configurable: true,
  });
}

export function createConfigPreset(
  store: ConfigPresetStore,
  name: string,
  settings: FfGlobalSettings,
  id = `preset-${crypto.randomUUID()}`,
): ConfigPreset {
  const cleanName = name.trim();
  if (!cleanName) throw new Error("Hãy nhập tên preset mới.");
  if (
    store.presets.some(
      (entry) => entry.name.toLocaleLowerCase("vi") === cleanName.toLocaleLowerCase("vi"),
    )
  ) {
    throw new Error("Tên preset đã tồn tại. Hãy chọn tên khác.");
  }
  if (!id || store.presets.some((entry) => entry.id === id))
    throw new Error("ID preset đã tồn tại.");
  const profile = { id, name: cleanName, settings: structuredClone(settings) };
  store.presets.push(profile);
  return profile;
}
