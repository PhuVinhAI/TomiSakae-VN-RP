import { readFile } from "node:fs/promises";
import { beforeAll, describe, expect, it } from "vitest";
import {
  createDefaultSettings,
  type FfPreset,
} from "../risuai/freaky-frankenstein-5.4-plugin/src/core.js";
import {
  createConfigPreset,
  normalizePresetStore,
  presetForCard,
  selectCardPreset,
} from "../risuai/freaky-frankenstein-5.4-plugin/src/presets.js";

let source: FfPreset;
beforeAll(async () => {
  source = JSON.parse(
    await readFile(
      "risuai/freaky-frankenstein-5.4-plugin/source/ff54-sillytavern-preset.json",
      "utf8",
    ),
  ) as FfPreset;
});

describe("FF5.4 configuration presets", () => {
  it("migrates existing choices into Mặc định and uses it for every unassigned card", () => {
    const legacy = {
      enabled: false,
      vietnameseOutputEnabled: false,
      submodelEditorEnabled: true,
      submodelAutoRewriteEnabled: true,
    };
    const store = normalizePresetStore(source, undefined, legacy);
    expect(store.presets).toHaveLength(1);
    expect(store.presets[0]!.name).toBe("Mặc định");
    expect(presetForCard(store, "new-card").settings).toMatchObject(legacy);
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

  it("falls back to Mặc định for missing presets and restores valid saved settings", () => {
    const store = normalizePresetStore(source, {
      version: 1,
      presets: [
        { id: "default", name: "Old name", settings: { submodelAutoRewriteEnabled: true } },
        { id: "custom", name: "Tên riêng", settings: { enabled: false } },
        { id: "custom", name: "Duplicate", settings: {} },
        { id: "broken", name: "", settings: {} },
      ],
      cardPresets: { a: "custom", b: "deleted" },
    });
    expect(store.presets).toHaveLength(2);
    expect(store.presets[0]!.name).toBe("Mặc định");
    expect(presetForCard(store, "a").settings.enabled).toBe(false);
    expect(presetForCard(store, "b").settings.submodelAutoRewriteEnabled).toBe(true);
    expect(() => selectCardPreset(store, "a", "deleted")).toThrow("Không tìm thấy");
  });
});
