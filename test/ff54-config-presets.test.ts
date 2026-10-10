import { readFile } from "node:fs/promises";
import { beforeAll, describe, expect, it } from "vitest";
import { createDefaultSettings, type FfPreset } from "../risuai/tomisakae-vn-rp-plugin/src/core.js";
import {
  createConfigPreset,
  deleteConfigPreset,
  normalizePresetStore,
  presetForCard,
  renameConfigPreset,
  selectCardPreset,
} from "../risuai/tomisakae-vn-rp-plugin/src/presets.js";

let source: FfPreset;
beforeAll(async () => {
  source = JSON.parse(
    await readFile("risuai/tomisakae-vn-rp-plugin/source/ff54-sillytavern-preset.json", "utf8"),
  ) as FfPreset;
});

describe("FF5.4 configuration presets", () => {
  it("migrates existing choices into Mặc định and uses it for every unassigned card", () => {
    const legacy = {
      enabled: false,
      vietnameseOutputEnabled: false,
      animeMangaLightNovelStyleEnabled: false,
      vietnameseNaturalWritingEnabled: false,
    };
    const store = normalizePresetStore(source, undefined, legacy);
    expect(store.presets).toHaveLength(1);
    expect(store.presets[0]!.name).toBe("Mặc định");
    expect(presetForCard(store, "new-card").settings).toMatchObject({
      enabled: false,
      vietnameseOutputEnabled: false,
    });
    expect(presetForCard(store, "new-card").settings).not.toHaveProperty(
      "animeMangaLightNovelStyleEnabled",
    );
    expect(presetForCard(store, "new-card").settings).not.toHaveProperty(
      "vietnameseNaturalWritingEnabled",
    );
    expect(presetForCard(store).id).toBe("default");
  });

  it("creates independent presets and remembers choices by stable card ID across reloads", () => {
    const store = normalizePresetStore(source, undefined);
    const alternate = createConfigPreset(
      store,
      "  Văn xuôi  ",
      store.presets[0]!.settings,
      "prose",
    );
    alternate.settings.vietnameseOutputEnabled = false;
    expect(store.presets[0]!.settings.vietnameseOutputEnabled).toBe(true);
    selectCardPreset(store, "card-a", alternate.id);
    expect(presetForCard(store, "card-a")).toBe(alternate);
    expect(presetForCard(store, "card-b").id).toBe("default");
    const reloaded = normalizePresetStore(source, structuredClone(store));
    expect(presetForCard(reloaded, "card-a").name).toBe("Văn xuôi");
    expect(presetForCard(reloaded, "card-a").settings.vietnameseOutputEnabled).toBe(false);
    selectCardPreset(reloaded, "card-b", "prose");
    expect(presetForCard(reloaded, "card-b")).toBe(presetForCard(reloaded, "card-a"));
  });

  it("rejects empty and duplicate names without replacing any existing configuration", () => {
    const store = normalizePresetStore(source, undefined);
    const settings = createDefaultSettings(source);
    expect(() => createConfigPreset(store, "  ", settings, "empty")).toThrow("nhập tên");
    expect(() => createConfigPreset(store, "mặc định", settings, "duplicate")).toThrow(
      "đã tồn tại",
    );
    createConfigPreset(store, "Tiểu thuyết", settings, "novel");
    expect(() => createConfigPreset(store, "TIỂU THUYẾT", settings, "other")).toThrow("đã tồn tại");
    expect(store.presets).toHaveLength(2);
  });

  it("renames custom presets and rejects reserved or duplicate names", () => {
    const store = normalizePresetStore(source, undefined);
    createConfigPreset(store, "Cinematic", store.presets[0]!.settings, "cinematic");
    expect(renameConfigPreset(store, "cinematic", "  Tự nhiên  ").name).toBe("Tự nhiên");
    expect(() => renameConfigPreset(store, "cinematic", "Mặc định")).toThrow("đã tồn tại");
    expect(() => renameConfigPreset(store, "default", "Đổi tên")).toThrow("Mặc định");
    expect(() => renameConfigPreset(store, "missing", "Tên mới")).toThrow("Không tìm thấy");
  });

  it("deletes custom presets and returns assigned cards to Mặc định", () => {
    const store = normalizePresetStore(source, undefined);
    createConfigPreset(store, "Tạm thời", store.presets[0]!.settings, "temporary");
    selectCardPreset(store, "card-a", "temporary");
    deleteConfigPreset(store, "temporary");
    expect(store.presets).toHaveLength(1);
    expect(store.cardPresets).not.toHaveProperty("card-a");
    expect(presetForCard(store, "card-a").id).toBe("default");
    expect(() => deleteConfigPreset(store, "default")).toThrow("Mặc định");
    expect(() => deleteConfigPreset(store, "missing")).toThrow("Không tìm thấy");
  });

  it("falls back to Mặc định for missing presets and restores valid saved settings", () => {
    const store = normalizePresetStore(source, {
      version: 1,
      presets: [
        { id: "default", name: "Old name", settings: { soundNotificationsEnabled: true } },
        { id: "custom", name: "Tên riêng", settings: { enabled: false } },
        { id: "custom", name: "Duplicate", settings: {} },
        { id: "broken", name: "", settings: {} },
      ],
      cardPresets: { a: "custom", b: "deleted" },
    });
    expect(store.presets).toHaveLength(2);
    expect(store.presets[0]!.name).toBe("Mặc định");
    expect(presetForCard(store, "a").settings.enabled).toBe(false);
    expect(presetForCard(store, "b").settings.soundNotificationsEnabled).toBe(true);
    expect(() => selectCardPreset(store, "a", "deleted")).toThrow("Không tìm thấy");
  });
});
