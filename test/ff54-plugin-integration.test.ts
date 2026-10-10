import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { build } from "esbuild";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { type ChatMessage, type FfPreset } from "../risuai/tomisakae-vn-rp-plugin/src/core.js";
import {
  CONFIG_PRESETS_STORAGE_KEY,
  createConfigPreset,
  normalizePresetStore,
  selectCardPreset,
} from "../risuai/tomisakae-vn-rp-plugin/src/presets.js";

interface SavedMessage {
  role: "user" | "char";
  data: string;
  chatId: string;
  swipes?: string[];
  swipeId?: number;
}

interface SavedChat {
  id: string;
  message: SavedMessage[];
  isStreaming?: boolean;
}

interface OutputEvent {
  characterIndex: number;
  chatIndex: number;
  messageIndex: number;
  chat: SavedChat;
  char: Record<string, unknown>;
}

let bundled = "";
let preset: FfPreset;

beforeAll(async () => {
  const raw = await readFile(
    "risuai/tomisakae-vn-rp-plugin/source/ff54-sillytavern-preset.json",
    "utf8",
  );
  preset = JSON.parse(raw) as FfPreset;
  const result = await build({
    entryPoints: ["risuai/tomisakae-vn-rp-plugin/src/plugin.ts"],
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    target: "es2022",
    define: {
      __FF54_PRESET__: raw,
      __FF54_SOURCE_NAME__: '"test-preset"',
      __FF54_SOURCE_SHA256__: '"test-digest"',
    },
  });
  bundled = result.outputFiles[0]!.text;
});

afterEach(() => vi.useRealTimers());

async function startPlugin(savedPresets?: unknown, sound = false, legacySettings?: unknown) {
  const callbacks = {
    beforeRequest: undefined as
      ((messages: ChatMessage[], type: string) => Promise<ChatMessage[]>) | undefined,
    display: undefined as ((content: string) => Promise<string>) | undefined,
    output: undefined as ((event: OutputEvent) => Promise<void>) | undefined,
    unload: undefined as (() => Promise<void>) | undefined,
  };
  const chats = new Map<string, SavedChat>([
    [
      "0:0",
      {
        id: "chat-a",
        message: [
          { role: "char", data: "Sự kiện cũ không còn trong request main.", chatId: "old-a" },
          { role: "user", data: "Chào An.", chatId: "user-a" },
        ],
      },
    ],
    ["0:1", { id: "chat-b", message: [{ role: "user", data: "Chào Bình.", chatId: "user-b" }] }],
  ]);
  let selectedChat = 0;
  let selectedCharacter = 0;
  const cardIds = new Map([
    [0, "card-a"],
    [1, "card-b"],
  ]);
  const storage = new Map<string, unknown>([
    ["ff54-global-settings-v1", legacySettings ?? { soundNotificationsEnabled: sound }],
    [CONFIG_PRESETS_STORAGE_KEY, savedPresets],
  ]);
  let openSettings!: () => void;
  interface UiNode {
    value: string;
    checked: boolean;
    dataset: Record<string, string>;
    textContent: string;
    innerHTML: string;
    handlers: Map<string, () => void | Promise<void>>;
    addEventListener(type: string, handler: () => void | Promise<void>): void;
  }
  const uiNodes = new Map<string, UiNode>();
  const inputs: UiNode[] = [];
  const makeNode = (key: string, attributes = "") => {
    const node: UiNode = {
      value: attributes.match(/value="([^"]*)"/)?.[1] ?? "",
      checked: /\bchecked\b/.test(attributes),
      dataset: Object.fromEntries(
        [...attributes.matchAll(/data-(\w+)="([^"]*)"/g)].map((match) => [match[1]!, match[2]!]),
      ),
      textContent: "",
      innerHTML: "",
      handlers: new Map(),
      addEventListener(type, handler) {
        node.handlers.set(type, handler);
      },
    };
    uiNodes.set(key, node);
    return node;
  };
  const uiDocument = {
    head: { innerHTML: "" },
    body: {
      set innerHTML(html: string) {
        uiNodes.clear();
        inputs.length = 0;
        for (const match of html.matchAll(/<input\b([^>]*)>/g)) {
          const attributes = match[1]!;
          const id = attributes.match(/\bid="([^"]*)"/)?.[1] ?? `input-${inputs.length}`;
          inputs.push(makeNode(id, attributes));
        }
        for (const match of html.matchAll(/<(?:button|div)\b[^>]*\bid="([^"]*)"/g))
          makeNode(match[1]!);
        const selected = html.match(/<option value="([^"]*)" selected/);
        makeNode("config-preset").value = selected?.[1] ?? "";
      },
    },
    getElementById: (id: string) => uiNodes.get(id),
    querySelectorAll: (selector: string) =>
      inputs.filter((node) =>
        selector.includes('type="checkbox"')
          ? !!node.dataset.kind && node.dataset.kind !== "choice"
          : node.dataset.kind === "choice",
      ),
    querySelector: (selector: string) => {
      const id = selector.match(/data-id="([^"]*)"/)?.[1];
      if (id) return inputs.find((node) => node.dataset.id === id) ?? null;
      const group = selector.match(/data-group="([^"]*)"/)?.[1];
      return (
        inputs.find(
          (node) => node.dataset.kind === "choice" && node.dataset.group === group && node.checked,
        ) ?? null
      );
    },
  };
  let ready!: () => void;
  const initialized = new Promise<void>((resolve) => {
    ready = resolve;
  });
  const runModel = vi.fn();
  const sounds: number[] = [];
  class FakeAudioContext {
    state = "running";
    currentTime = 0;
    destination = {};
    resume = async () => {};
    close = async () => {};
    createOscillator() {
      return {
        type: "sine",
        frequency: { setValueAtTime: (value: number) => sounds.push(value) },
        connect() {},
        start() {},
        stop() {},
      };
    }
    createGain() {
      return {
        gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
        connect() {},
      };
    }
  }
  const generating = new Set<string>();
  const writes = vi.fn();
  const root = {
    querySelector: async (selector: string) => {
      if (selector === 'button[aria-labelledby="cancel"]')
        return generating.has(`${selectedCharacter}:${selectedChat}`) ? {} : null;
      if (selector === ".button-icon-send")
        return generating.has(`${selectedCharacter}:${selectedChat}`) ? null : {};
      return null;
    },
  };
  const api = {
    pluginStorage: {
      getItem: async (key: string) => structuredClone(storage.get(key)),
      setItem: async (key: string, value: unknown) => {
        storage.set(key, structuredClone(value));
      },
    },
    registerButton: async (_options: unknown, callback: () => void) => {
      openSettings = callback;
      return { id: "ff54" };
    },
    unregisterUIPart: async () => {},
    showContainer: vi.fn().mockResolvedValue(undefined),
    hideContainer: vi.fn().mockResolvedValue(undefined),
    getCurrentCharacterIndex: async () => selectedCharacter,
    getCurrentChatIndex: async () => selectedChat,
    getCharacter: async () => ({
      chaId: cardIds.get(selectedCharacter),
      name: "An",
      chatPage: selectedChat,
      chats: [],
    }),
    getDatabase: async () => ({ personas: [], selectedPersona: 0 }),
    getChatFromIndex: async (character: number, chat: number) =>
      structuredClone(chats.get(`${character}:${chat}`)),
    setChatToIndex: async (character: number, chat: number, data: SavedChat) => {
      chats.set(`${character}:${chat}`, structuredClone(data));
      writes(character, chat, data);
    },
    addRisuReplacer: async (type: string, callback: unknown) => {
      if (type === "beforeRequest")
        callbacks.beforeRequest = callback as typeof callbacks.beforeRequest;
    },
    removeRisuReplacer: vi.fn(),
    addRisuScriptHandler: async (_type: string, callback: typeof callbacks.display) => {
      callbacks.display = callback;
    },
    removeRisuScriptHandler: vi.fn(),
    addRisuChatListener: async (_type: string, callback: typeof callbacks.output) => {
      callbacks.output = callback;
    },
    removeRisuChatListener: vi.fn(),
    onUnload: async (callback: () => Promise<void>) => {
      callbacks.unload = callback;
      ready();
    },
    runLLMModel: runModel,
    alert: vi.fn().mockResolvedValue(undefined),
    alertError: vi.fn().mockResolvedValue(undefined),
    getRootDocument: vi.fn(async () => root),
    createMutationObserver: vi.fn(),
  };
  runInNewContext(bundled, {
    Risuai: api,
    structuredClone,
    TextEncoder,
    TextDecoder,
    setTimeout,
    clearTimeout,
    crypto: { randomUUID: () => `test-${storage.size}-${Math.random()}` },
    document: uiDocument,
    AudioContext: FakeAudioContext,
    console: { warn: vi.fn() },
  });
  await initialized;

  return {
    callbacks,
    sounds,
    failMain: () => generating.delete(`${selectedCharacter}:${selectedChat}`),
    chats,
    runModel,
    writes,
    api,
    storage,
    async settingsUi() {
      const shown = new Promise<void>((resolve) => {
        api.showContainer.mockImplementation(async () => {
          resolve();
        });
      });
      openSettings();
      await shown;
    },
    ui(id: string) {
      return uiNodes.get(id)!;
    },
    toggle(id: string) {
      return inputs.find((node) => node.dataset.id === id)!;
    },
    async uiEvent(id: string, type = "click") {
      await uiNodes.get(id)!.handlers.get(type)!();
    },
    selectChat(index: number) {
      selectedChat = index;
    },
    selectCard(index: number, id?: string) {
      selectedCharacter = index;
      selectedChat = 0;
      if (id) cardIds.set(index, id);
      if (!chats.has(`${index}:0`))
        chats.set(`${index}:0`, {
          id: `chat-card-${index}`,
          message: [{ role: "user", data: "Chào.", chatId: `user-card-${index}` }],
        });
    },
    async request(
      messages: ChatMessage[] = [
        { role: "system", content: "Card, lore và memory." },
        { role: "user", content: "Chào An.", memo: "user-a" },
      ],
    ) {
      generating.add(`${selectedCharacter}:${selectedChat}`);
      return callbacks.beforeRequest!(messages, "model");
    },
    complete(original: string, chatIndex = selectedChat, characterIndex = selectedCharacter) {
      generating.delete(`${characterIndex}:${chatIndex}`);
      const chat = chats.get(`${characterIndex}:${chatIndex}`)!;
      const messageIndex = chat.message.length;
      chat.message.push({
        role: "char",
        data: original,
        chatId: `reply-${chatIndex}-${messageIndex}`,
      });
      return callbacks.output!({
        characterIndex,
        chatIndex,
        messageIndex,
        chat: structuredClone(chat),
        char: {},
      });
    },
  };
}

describe("Removed Submodel editing", () => {
  it.each(["legacy", "presets"])(
    "discards old %s settings and leaves completed responses and swipes untouched",
    async (format) => {
      const obsolete = {
        submodelEditorEnabled: true,
        submodelAutoRewriteEnabled: true,
      };
      const saved =
        format === "presets"
          ? {
              version: 1,
              presets: [{ id: "default", name: "Mặc định", settings: obsolete }],
              cardPresets: {},
            }
          : undefined;
      const plugin = await startPlugin(saved, false, format === "legacy" ? obsolete : undefined);
      const normalized = plugin.storage.get(CONFIG_PRESETS_STORAGE_KEY) as {
        presets: Array<{ settings: Record<string, unknown> }>;
      };
      expect(normalized.presets[0]!.settings).not.toHaveProperty("submodelEditorEnabled");
      expect(normalized.presets[0]!.settings).not.toHaveProperty("submodelAutoRewriteEnabled");
      await plugin.settingsUi();
      expect(plugin.toggle("submodel-editor")).toBeUndefined();
      expect(plugin.toggle("submodel-auto-rewrite")).toBeUndefined();
      const request = await plugin.request();
      expect(request.some((message) => message.content.includes("<vietnamese_editor>"))).toBe(
        false,
      );
      const original =
        "[ 🕰️ 14:25 | 🗓️ Ngày 1 | 📍 Đại học | Nắng ]\nAn bước tới.\n<internal_states>Bond: 3</internal_states>";
      await plugin.complete(original);
      const chat = plugin.chats.get("0:0")!;
      const target = chat.message.at(-1)!;
      target.swipes = ["Bản gốc khác.", original];
      target.swipeId = 1;
      const snapshot = structuredClone(chat);
      await plugin.callbacks.output!({
        characterIndex: 0,
        chatIndex: 0,
        messageIndex: chat.message.length - 1,
        chat: structuredClone(chat),
        char: {},
      });
      expect(plugin.chats.get("0:0")).toEqual(snapshot);
      expect(plugin.writes).not.toHaveBeenCalled();
      expect(plugin.runModel).not.toHaveBeenCalled();
      expect(plugin.api.createMutationObserver).not.toHaveBeenCalled();
      expect(plugin.api.getRootDocument).not.toHaveBeenCalled();
      await plugin.callbacks.unload!();
    },
  );
});

describe("Named presets in plugin UI and requests", () => {
  it("previews added prompt tokens immediately from UI drafts without making a request or saving", async () => {
    const plugin = await startPlugin();
    await plugin.settingsUi();
    const saved = structuredClone(plugin.storage.get(CONFIG_PRESETS_STORAGE_KEY));
    const original = plugin.ui("token-estimate-panel").innerHTML;
    expect(original).toContain("Token prompt chèn thêm");
    expect(original).toContain("o200k_base");
    expect(original).toContain("🇻🇳 Đầu ra tiếng Việt");
    const vietnamese = plugin.toggle("vietnamese-output");
    vietnamese.checked = false;
    await vietnamese.handlers.get("change")!();
    expect(plugin.ui("token-estimate-panel").innerHTML).not.toContain("🇻🇳 Đầu ra tiếng Việt");
    expect(plugin.ui("token-estimate-panel").innerHTML).not.toBe(original);
    expect(plugin.storage.get(CONFIG_PRESETS_STORAGE_KEY)).toEqual(saved);
    expect(plugin.runModel).not.toHaveBeenCalled();
    expect(plugin.writes).not.toHaveBeenCalled();
    plugin.ui("master").checked = false;
    await plugin.uiEvent("master", "change");
    expect(plugin.ui("token-estimate-panel").innerHTML).toContain('class="token-total">≈ 0');
    expect(plugin.ui("token-estimate-panel").innerHTML).toContain("Plugin đang tắt");
    await plugin.callbacks.unload!();
  });

  it("creates and saves a named preset without changing Mặc định, then remembers it after reload", async () => {
    const plugin = await startPlugin();
    await plugin.settingsUi();
    expect(plugin.ui("config-preset").value).toBe("default");
    plugin.ui("preset-name").value = "Văn xuôi";
    plugin.toggle("vietnamese-output").checked = false;
    await plugin.uiEvent("create-preset");
    const saved = normalizePresetStore(preset, plugin.storage.get(CONFIG_PRESETS_STORAGE_KEY));
    expect(saved.presets).toHaveLength(2);
    const created = saved.presets.find((entry) => entry.name === "Văn xuôi")!;
    expect(saved.cardPresets["card-a"]).toBe(created.id);
    expect(created.settings.vietnameseOutputEnabled).toBe(false);
    expect(saved.presets[0]!.settings.vietnameseOutputEnabled).toBe(true);
    expect(plugin.ui("config-preset").value).toBe(created.id);
    expect(
      (await plugin.request()).some((message) => message.memo === "ff54:vietnamese-output"),
    ).toBe(false);
    plugin.toggle("vietnamese-output").checked = true;
    await plugin.uiEvent("save");
    expect(plugin.ui("status").textContent).toContain("Đã lưu preset");
    const reloaded = await startPlugin(plugin.storage.get(CONFIG_PRESETS_STORAGE_KEY));
    await reloaded.settingsUi();
    expect(reloaded.ui("config-preset").value).toBe(created.id);
    expect(
      (await reloaded.request()).some((message) => message.memo === "ff54:vietnamese-output"),
    ).toBe(true);
    reloaded.selectCard(1);
    await reloaded.settingsUi();
    expect(reloaded.ui("config-preset").value).toBe("default");
  });

  it("renames and deletes a custom preset from the settings UI", async () => {
    const plugin = await startPlugin();
    await plugin.settingsUi();
    plugin.ui("preset-name").value = "Tạm thời";
    await plugin.uiEvent("create-preset");
    const created = normalizePresetStore(
      preset,
      plugin.storage.get(CONFIG_PRESETS_STORAGE_KEY),
    ).presets.find((entry) => entry.name === "Tạm thời")!;
    plugin.ui("rename-preset-name").value = "Bản đã đổi tên";
    await plugin.uiEvent("rename-preset");
    expect(
      normalizePresetStore(preset, plugin.storage.get(CONFIG_PRESETS_STORAGE_KEY)).presets.find(
        (entry) => entry.id === created.id,
      )?.name,
    ).toBe("Bản đã đổi tên");
    await plugin.uiEvent("delete-preset");
    const saved = normalizePresetStore(preset, plugin.storage.get(CONFIG_PRESETS_STORAGE_KEY));
    expect(saved.presets).toHaveLength(1);
    expect(saved.cardPresets).not.toHaveProperty("card-a");
    expect(plugin.ui("config-preset").value).toBe("default");
  });

  it("applies the chosen preset per card to requests and display without modifying card data", async () => {
    const store = normalizePresetStore(preset, undefined);
    const disabled = createConfigPreset(store, "Tắt FF5.4", store.presets[0]!.settings, "off");
    disabled.settings.enabled = false;
    selectCardPreset(store, "card-b", disabled.id);
    const plugin = await startPlugin(store);
    expect((await plugin.request()).some((message) => message.memo === "ff54:main")).toBe(true);
    plugin.selectCard(1);
    await plugin.settingsUi();
    expect(plugin.ui("config-preset").value).toBe("off");
    const raw = [{ role: "user" as const, content: "Tiếp đi." }];
    expect(await plugin.request(raw)).toEqual(raw);
    const header = "[ 🕰️ 14:25 | 🗓️ Ngày 1 | 📍 Đại học | Nắng ]";
    expect(await plugin.callbacks.display!(header)).toBe(header);
    plugin.ui("config-preset").value = "default";
    await plugin.uiEvent("config-preset", "change");
    expect(plugin.storage.get(CONFIG_PRESETS_STORAGE_KEY)).toMatchObject({
      cardPresets: { "card-b": "default" },
    });
    expect((await plugin.request(raw)).some((message) => message.memo === "ff54:main")).toBe(true);
    expect(await plugin.callbacks.display!(header)).toContain('data-ff54="scene-header"');
    expect(plugin.writes).not.toHaveBeenCalled();
  });

  it("shares saved preset edits across assigned cards and keeps UI drafts unapplied until save", async () => {
    const store = normalizePresetStore(preset, undefined);
    const shared = createConfigPreset(store, "Chung", store.presets[0]!.settings, "shared");
    selectCardPreset(store, "card-a", shared.id);
    selectCardPreset(store, "card-b", shared.id);
    const plugin = await startPlugin(store);
    await plugin.settingsUi();
    plugin.toggle("vietnamese-output").checked = false;
    expect(
      (await plugin.request()).some((message) => message.memo === "ff54:vietnamese-output"),
    ).toBe(true);
    await plugin.uiEvent("save");
    plugin.selectCard(1);
    expect(
      (await plugin.request()).some((message) => message.memo === "ff54:vietnamese-output"),
    ).toBe(false);
    await plugin.settingsUi();
    expect(plugin.ui("config-preset").value).toBe("shared");
    await plugin.uiEvent("reset");
    expect(
      (await plugin.request()).some((message) => message.memo === "ff54:vietnamese-output"),
    ).toBe(true);
    expect(
      normalizePresetStore(preset, plugin.storage.get(CONFIG_PRESETS_STORAGE_KEY)).presets,
    ).toHaveLength(2);
  });
});

describe("FF5.4 completion sounds", () => {
  const original =
    "[ 🕰️ 14:25 | 🗓️ Ngày 1 | 📍 Đại học | Nắng ]\nAn bước tới.\n<internal_states>Bond: 3</internal_states>";

  it("is silent by default and persists the sound toggle per preset", async () => {
    const plugin = await startPlugin();
    await plugin.request();
    await plugin.complete(original);
    expect(plugin.sounds).toEqual([]);
    await plugin.settingsUi();
    plugin.toggle("sound-notifications").checked = true;
    await plugin.uiEvent("save");
    const saved = normalizePresetStore(preset, plugin.storage.get(CONFIG_PRESETS_STORAGE_KEY));
    expect(saved.presets[0]!.settings.soundNotificationsEnabled).toBe(true);
    await plugin.callbacks.unload!();
  });

  it("sounds once only on completed output, not streamed display or duplicate output", async () => {
    const plugin = await startPlugin(undefined, true);
    await plugin.request();
    await plugin.callbacks.display!(original);
    expect(plugin.sounds).toEqual([]);
    plugin.chats.get("0:0")!.isStreaming = true;
    await plugin.complete(original);
    expect(plugin.sounds).toEqual([]);
    plugin.chats.get("0:0")!.isStreaming = false;
    await plugin.callbacks.output!({
      characterIndex: 0,
      chatIndex: 0,
      messageIndex: 2,
      chat: structuredClone(plugin.chats.get("0:0")!),
      char: {},
    });
    await plugin.callbacks.output!({
      characterIndex: 0,
      chatIndex: 0,
      messageIndex: 2,
      chat: structuredClone(plugin.chats.get("0:0")!),
      char: {},
    });
    expect(plugin.sounds).toEqual([660, 880]);
    await plugin.callbacks.unload!();
  });

  it("sounds on a main failure without output", async () => {
    vi.useFakeTimers();
    const plugin = await startPlugin(undefined, true);
    await plugin.request();
    await vi.advanceTimersByTimeAsync(1500);
    expect(plugin.sounds).toEqual([]);
    plugin.failMain();
    await vi.advanceTimersByTimeAsync(750);
    expect(plugin.sounds).toEqual([220, 160]);
    expect(plugin.runModel).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1500);
    expect(plugin.sounds).toHaveLength(2);
    await plugin.callbacks.unload!();
  });

  it("does not mistake navigation to an idle card for a failed request", async () => {
    vi.useFakeTimers();
    const plugin = await startPlugin(undefined, true);
    await plugin.request();
    plugin.selectCard(1);
    await vi.advanceTimersByTimeAsync(1500);
    expect(plugin.sounds).toEqual([]);
    await plugin.complete(original, 0, 0);
    expect(plugin.sounds).toEqual([660, 880]);
    await plugin.callbacks.unload!();
    expect(vi.getTimerCount()).toBe(0);
  });
});
