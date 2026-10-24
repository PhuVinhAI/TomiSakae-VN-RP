import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { build } from "esbuild";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { type ChatMessage, type FfPreset } from "../src/core.js";
import { loadPresetSources } from "../scripts/build-tomisakae-vn-rp-plugin.js";
import { type PresetSources } from "../src/preset-family.js";
import {
  CONFIG_PRESETS_STORAGE_KEY,
  createConfigPreset,
  normalizePresetStore,
  selectCardPreset,
  switchPresetFamily,
} from "../src/presets.js";
import {
  restoreSolaHistoryContent,
  SOLA_HEADER_SAVER_ID,
  type SolaHistoryArchive,
} from "../src/sola-history.js";
import { cardImagePrompt, collectCardImages } from "../src/card-images.js";

interface SavedMessage {
  role: "user" | "char";
  data: string;
  chatId: string;
  swipes?: string[];
  swipeId?: number;
  isComment?: boolean;
  disabled?: boolean;
  ff54InternalState?: string;
  solaHistory?: SolaHistoryArchive;
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
let sources: PresetSources;

beforeAll(async () => {
  const raw = await readFile("source/ff54-sillytavern-preset.json", "utf8");
  preset = JSON.parse(raw) as FfPreset;
  sources = await loadPresetSources();
  const { version } = JSON.parse(await readFile("package.json", "utf8")) as { version: string };
  const result = await build({
    entryPoints: ["src/plugin.ts"],
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    target: "es2022",
    define: {
      __PLUGIN_VERSION__: JSON.stringify(version),
      __FF54_PRESET__: raw,
      __PRESET_SOURCES__: JSON.stringify(sources),
      __FF54_SOURCE_NAME__: '"test-preset"',
      __FF54_SOURCE_SHA256__: '"test-digest"',
    },
  });
  bundled = result.outputFiles[0]!.text;
});

afterEach(() => vi.useRealTimers());

async function startPlugin(
  savedPresets?: unknown,
  sound = false,
  legacySettings?: unknown,
  watchHistory = false,
  pregnancyRandom?: () => number,
) {
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
    disabled: boolean;
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
      disabled: /\bdisabled\b/.test(attributes),
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
        for (const match of html.matchAll(/<(?:button|div|output)\b[^>]*\bid="([^"]*)"/g))
          makeNode(match[1]!);
        const selected = html.match(/<option value="([^"]*)" selected/);
        makeNode("config-preset").value = selected?.[1] ?? "";
      },
    },
    getElementById: (id: string) => uiNodes.get(id),
    querySelectorAll: (selector: string) =>
      inputs.filter((node) =>
        selector.includes("[data-family]")
          ? node.dataset.family !== undefined
          : selector.includes('type="checkbox"')
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
    ...(watchHistory ? { setInterval, clearInterval } : {}),
    crypto: {
      randomUUID: () => `test-${storage.size}-${Math.random()}`,
      getRandomValues: (values: Uint32Array) => {
        values[0] = Math.floor((pregnancyRandom ?? Math.random)() * 0x100000000);
        return values;
      },
    },
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
    choice(group: string, value: string) {
      return inputs.find((node) => node.dataset.group === group && node.value === value)!;
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

describe("Named presets in plugin UI and requests", () => {
  it("uses one full Gemma prompt and removes the retired level control", async () => {
    const plugin = await startPlugin();
    try {
      await plugin.settingsUi();
      expect(plugin.ui("gemma-nsfw-level")).toBeUndefined();
      plugin.toggle("gemma-fix").checked = true;
      await plugin.toggle("gemma-fix").handlers.get("change")!();
      await plugin.uiEvent("save");
      const reloaded = await startPlugin(plugin.storage.get(CONFIG_PRESETS_STORAGE_KEY));
      try {
        await reloaded.settingsUi();
        expect(reloaded.ui("gemma-nsfw-level")).toBeUndefined();
        const request = await reloaded.request();
        const user = request.find((message) => message.memo === "user-a")!.content;
        expect(user).toContain("## Character Integrity");
        expect(user).toContain("## User Agency");
        expect(user).toContain("MUST NOT offer sex or readily accept sexual advances");
        expect(user).toContain(
          "User's desire, intent, or consent MUST NOT be assumed unless User clearly expresses it through intent, words, or concrete actions",
        );
        reloaded.toggle("gemma-fix").checked = false;
        await reloaded.toggle("gemma-fix").handlers.get("change")!();
        await reloaded.uiEvent("save");
        expect((await reloaded.request()).find((message) => message.memo === "user-a")!.content).toBe("Chào An.");
      } finally { await reloaded.callbacks.unload!(); }
    } finally { await plugin.callbacks.unload!(); }
  });

  it("clears an old saved Auto Submodel toggle when the editor is disabled", async () => {
    const plugin = await startPlugin(undefined, false, { submodelAutoRewriteEnabled: true });
    try {
      await plugin.settingsUi();
      expect(plugin.toggle("submodel-auto-rewrite").checked).toBe(false);
      expect(plugin.toggle("submodel-auto-rewrite").disabled).toBe(true);
      await plugin.uiEvent("save");
      expect(
        normalizePresetStore(preset, plugin.storage.get(CONFIG_PRESETS_STORAGE_KEY)).presets[0]!
          .settings.submodelAutoRewriteEnabled,
      ).toBe(false);
    } finally {
      await plugin.callbacks.unload!();
    }
  });

  it("reads theme changes on each request and survives unavailable theme APIs", async () => {
    const plugin = await startPlugin();
    const api = plugin.api as typeof plugin.api & { getColorScheme?: () => Promise<unknown> };
    const themeApi = vi.fn().mockResolvedValue({ scheme: { type: "light", bgcolor: "#ffffff" } });
    api.getColorScheme = themeApi;
    const palette = (messages: ChatMessage[]) =>
      messages.find((message) => message.content.includes("Must replace color in tag with:"))!
        .content;
    const light = palette(await plugin.request());
    expect(light).toContain("Must replace color in tag with: teal, royalblue");
    expect(light).not.toContain("cyan,");
    themeApi.mockResolvedValue({ scheme: { type: "dark", bgcolor: "#282a36" } });
    const dark = palette(await plugin.request());
    expect(dark).toContain("Must replace color in tag with: cyan, pink, orange");
    expect(themeApi).toHaveBeenCalledTimes(2);
    themeApi.mockRejectedValue(new Error("Unavailable"));
    const fallback = palette(await plugin.request());
    expect(fallback).toContain("Must replace color in tag with: cyan, pink, teal, orange");
    delete api.getColorScheme;
    expect(palette(await plugin.request())).toBe(fallback);
    await plugin.callbacks.unload!();
  });

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

  it("previews, persists and refreshes the current card's image keywords before each request", async () => {
    const plugin = await startPlugin();
    try {
      const assets = {
        additionalAssets: [
          ["casual.smile.1.png", "assets/a.png", "png"],
          ["casual.smile.1.png", "assets/b.png", "png"],
          ["music.mp3", "assets/c.mp3", "mp3"],
        ],
        emotionImages: [["happy", "assets/d.png"]],
      };
      const originalGetCharacter = plugin.api.getCharacter;
      plugin.api.getCharacter = async () => ({ ...(await originalGetCharacter()), ...assets });
      await plugin.settingsUi();
      const saved = structuredClone(plugin.storage.get(CONFIG_PRESETS_STORAGE_KEY));
      const toggle = plugin.toggle("card-image-catalog");
      expect(toggle.checked).toBe(false);
      toggle.checked = true;
      await toggle.handlers.get("change")!();
      const panel = plugin.ui("token-estimate-panel").innerHTML;
      expect(panel).toContain("Ảnh card: <b>3</b>");
      expect(panel).toContain("Từ khóa ảnh: <b>2</b>");
      expect(panel).toContain("Token danh sách:");
      expect(plugin.storage.get(CONFIG_PRESETS_STORAGE_KEY)).toEqual(saved);
      await plugin.uiEvent("save");
      expect(
        normalizePresetStore(preset, plugin.storage.get(CONFIG_PRESETS_STORAGE_KEY)).presets[0]!
          .settings.cardImageCatalogEnabled,
      ).toBe(true);
      const request = await plugin.request();
      const index = request.findIndex((message) => message.memo === "user-a");
      expect(request[index + 1]).toMatchObject({
        role: "user",
        content: cardImagePrompt(collectCardImages(assets)),
        memo: "ff54:card-image-catalog",
      });
      expect(plugin.chats.get("0:0")!.message.at(-1)!.data).toBe("Chào An.");
      assets.additionalAssets = [["new.outfit.webp", "assets/e.webp", "webp"]];
      assets.emotionImages = [];
      plugin.selectCard(1);
      const next = await plugin.request();
      const prompt = next.find((message) => message.memo === "ff54:card-image-catalog")!.content;
      expect(prompt).toContain("new.outfit.webp");
      expect(prompt).not.toContain("casual.smile.1.png");
      await plugin.settingsUi();
      plugin.toggle("card-image-catalog").checked = false;
      await plugin.uiEvent("save");
      expect(
        (await plugin.request()).some((message) => message.memo === "ff54:card-image-catalog"),
      ).toBe(false);
    } finally {
      await plugin.callbacks.unload!();
    }
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

describe("Internal-state history restoration", () => {
  it.each([
    ["char", true],
    ["char", undefined],
    ["user", true],
    ["user", undefined],
    ["user", false],
  ] as const)(
    "restores two real AI responses after branching, ignoring the %s marker (isComment: %s)",
    async (role, isComment) => {
      vi.useFakeTimers();
      const plugin = await startPlugin(undefined, false, undefined, true);
      try {
        const messages: SavedMessage[] = Array.from({ length: 5 }, (_, index) => [
          { role: "user" as const, data: `Lượt ${index}`, chatId: `user-${index}` },
          {
            role: "char" as const,
            data: `[ 🕰️ 14:25 | 🗓️ Ngày 1 | 📍 Đại học | Nắng ]\nPhản hồi ${index}.\n<internal_states>State ${index}</internal_states>`,
            chatId: `ai-${index}`,
          },
        ]).flat();
        plugin.chats.set("0:0", { id: "chat-a", message: messages });
        await plugin.request();
        const original = structuredClone(plugin.chats.get("0:0")!);
        expect(original.message[3]!.data).not.toContain("<internal_states>");
        expect(original.message[5]!.data).not.toContain("<internal_states>");

        // PocketRisu copies message metadata, reissues IDs, and appends a comment.
        const marker: SavedMessage = {
          role,
          data: "{{specialcomment::branchedfrom::chat-a::Original::ai-2::}}",
          chatId: "branch-marker",
          ...(isComment === undefined ? {} : { isComment }),
          disabled: true,
        };
        const branch: SavedChat = {
          id: "chat-branch",
          message: [
            ...original.message.slice(0, 6).map((entry) => ({
              ...entry,
              chatId: `branch-${entry.chatId}`,
            })),
            marker,
          ],
        };
        const requestBeforeRestore: ChatMessage[] = branch.message.map((entry) => ({
          role: entry.role === "char" ? "assistant" : "user",
          content: entry.data,
          memo: entry.chatId,
        }));
        requestBeforeRestore.push({ role: "user", content: "Tiếp tục." });
        plugin.chats.set("0:1", branch);
        plugin.selectChat(1);
        await vi.advanceTimersByTimeAsync(250);

        const restored = plugin.chats.get("0:1")!;
        expect(restored.message[1]!.data).not.toContain("<internal_states>");
        expect(restored.message[3]!.data).toContain("<internal_states>State 1</internal_states>");
        expect(restored.message[5]!.data).toContain("<internal_states>State 2</internal_states>");
        expect(restored.message[6]).toEqual(marker);
        expect(plugin.chats.get("0:0")).toEqual(original);
        for (const entry of restored.message.filter(
          (entry) => entry.role === "char" && entry.chatId !== marker.chatId,
        ))
          expect(entry.data).toContain("[ 🕰️");

        const request = await plugin.request(requestBeforeRestore);
        expect(request.some((entry) => entry.memo === marker.chatId)).toBe(false);
        const replies = request.filter(
          (entry) => entry.role === "assistant" && !entry.memo?.startsWith("ff54:"),
        );
        expect(replies).toHaveLength(3);
        expect(replies[0]!.content).not.toContain("<internal_states>");
        expect(replies[0]!.content).not.toContain("[ 🕰️");
        expect(replies[1]!.content).toContain("<internal_states>State 1</internal_states>");
        expect(replies[2]!.content).toContain("<internal_states>State 2</internal_states>");
        expect(plugin.chats.get("0:1")).toEqual(restored);
        const writes = plugin.writes.mock.calls.length;
        await vi.advanceTimersByTimeAsync(750);
        expect(plugin.writes).toHaveBeenCalledTimes(writes);
      } finally {
        await plugin.callbacks.unload!();
      }
      expect(vi.getTimerCount()).toBe(0);
    },
  );
});

describe("Sola saved-history restoration", () => {
  const header = '<scene_header location="Phòng khách" time="13:40" atmosphere="Nắng" />';
  const reply = (index: number) =>
    `${header}\nCảnh ${index}.\n<sola_hud digest="Ngày ${index}"><date>Ngày: ${index}</date><wardrobe>Áo ${index}</wardrobe><fengine>Cảm xúc ${index}</fengine></sola_hud>`;
  const history = (count: number): SavedMessage[] =>
    Array.from({ length: count }, (_, index) => [
      { role: "user" as const, data: `Lượt ${index}`, chatId: `sola-u-${index}` },
      { role: "char" as const, data: reply(index), chatId: `sola-a-${index}` },
    ]).flat();
  const requestOf = (chat: SavedChat): ChatMessage[] =>
    chat.message.map((entry) => ({
      role: entry.role === "char" ? "assistant" : "user",
      content: entry.data,
      memo: entry.chatId,
    }));
  const solaStore = () => {
    const store = normalizePresetStore(preset, undefined, undefined, sources);
    store.presets[0]!.settings = switchPresetFamily(
      store.presets[0]!.settings,
      sources.sola.preset,
    );
    return store;
  };

  it.each(["delete", "branch"] as const)(
    "cleans reasoning and restores an unfinished HUD after %s",
    async (action) => {
      vi.useFakeTimers();
      const plugin = await startPlugin(solaStore(), false, undefined, true);
      const brokenReply = (index: number) =>
        `${header}\nCảnh ${index}.\n<sola_hud digest="Ngày ${index}"><wardrobe>Áo ${index}`;
      try {
        const chat: SavedChat = {
          id: "chat-a",
          message: history(5).map((entry, index) =>
            entry.role === "char"
              ? {
                  ...entry,
                  data: `<think>Kế hoạch ${index}.</think>\n${brokenReply((index - 1) / 2)}`,
                }
              : entry,
          ),
        };
        plugin.chats.set("0:0", chat);
        const request = await plugin.request(requestOf(chat));
        const cleaned = structuredClone(plugin.chats.get("0:0")!);
        expect(cleaned.message[1]!.data.trimStart()).toBe(`${header}\nCảnh 0.\n`);
        expect(
          restoreSolaHistoryContent(
            cleaned.message[1]!.data,
            cleaned.message[1]!.solaHistory?.main,
          ).trim(),
        ).toBe(brokenReply(0));
        expect(cleaned.message.every((entry) => !entry.data.includes("<think>"))).toBe(true);
        expect(
          request
            .filter((message) => message.memo?.startsWith("sola-a-"))
            .every((message) => !message.content.includes("Kế hoạch")),
        ).toBe(true);
        const displayed = await plugin.callbacks.display!(
          `<Thoughts>Rà soát.</Thoughts>\n${reply(0)}`,
        );
        expect(displayed).toContain("💭 Suy luận");
        expect(displayed).not.toContain("<Thoughts>");
        const shortened = {
          id: action === "branch" ? "branch-a" : "chat-a",
          message: cleaned.message.slice(0, 6),
        };
        const chatIndex = action === "branch" ? 1 : 0;
        const staleRequest = requestOf(shortened);
        plugin.chats.set(`0:${chatIndex}`, shortened);
        plugin.selectChat(chatIndex);
        await vi.advanceTimersByTimeAsync(250);
        expect(plugin.chats.get(`0:${chatIndex}`)!.message[5]!.data.trim()).toBe(brokenReply(2));
        const restoredRequest = await plugin.request(staleRequest);
        expect(restoredRequest.find((message) => message.memo === "sola-a-2")?.content.trim()).toBe(
          brokenReply(2),
        );
        if (action === "branch") expect(plugin.chats.get("0:0")).toEqual(cleaned);
        const writes = plugin.writes.mock.calls.length;
        await vi.advanceTimersByTimeAsync(500);
        expect(plugin.writes).toHaveBeenCalledTimes(writes);
      } finally {
        await plugin.callbacks.unload!();
      }
    },
  );

  it("reuses an in-flight history cleanup without starting an extra cleanup pass", async () => {
    vi.useFakeTimers();
    const plugin = await startPlugin(solaStore(), false, undefined, true);
    let release!: () => void;
    const revertFinished = new Promise<void>((resolve) => {
      release = resolve;
    });
    const setChat = plugin.api.setChatToIndex;
    const setChatSpy = vi
      .spyOn(plugin.api, "setChatToIndex")
      .mockImplementation(async (character, chat, data) => {
        await revertFinished;
        await setChat(character, chat, data);
      });
    const getChatSpy = vi.spyOn(plugin.api, "getChatFromIndex");
    try {
      const chat: SavedChat = { id: "chat-a", message: history(2) };
      chat.message[1]!.data = `<think>Khôi phục.</think>\n${chat.message[1]!.data}`;
      plugin.chats.set("0:0", chat);
      plugin.selectChat(0);

      await vi.advanceTimersByTimeAsync(250);
      expect(setChatSpy).toHaveBeenCalledTimes(1);

      let settled = false;
      const pending = plugin
        .request([...requestOf(chat), { role: "user", content: "Tiếp tục." }])
        .then(() => {
          settled = true;
        });
      await Promise.resolve();
      expect(settled).toBe(false);

      const readsBeforeRelease = getChatSpy.mock.calls.length;
      release();
      await pending;
      expect(settled).toBe(true);
      // Only request synchronization and output-listener context read the chat again.
      expect(getChatSpy).toHaveBeenCalledTimes(readsBeforeRelease + 2);
      expect(plugin.chats.get("0:0")!.message[1]!.data).not.toContain("<think>");
    } finally {
      release();
      setChatSpy.mockRestore();
      getChatSpy.mockRestore();
      await plugin.callbacks.unload!();
    }
  });

  it("leaves concurrent host changes for the next cleanup instead of retrying in the request", async () => {
    const plugin = await startPlugin(solaStore());
    const chat: SavedChat = { id: "chat-a", message: history(4) };
    plugin.chats.set("0:0", chat);
    const getChat = plugin.api.getChatFromIndex;
    let reads = 0;
    const getChatSpy = vi
      .spyOn(plugin.api, "getChatFromIndex")
      .mockImplementation(async (character, index) => {
        if (++reads === 2) plugin.chats.get("0:0")!.message.at(-1)!.data += " Host edit.";
        return getChat(character, index);
      });
    try {
      await plugin.request(requestOf(chat));
      expect(plugin.writes).not.toHaveBeenCalled();
      expect(plugin.chats.get("0:0")!.message.at(-1)!.data).toContain("Host edit.");
    } finally {
      getChatSpy.mockRestore();
      await plugin.callbacks.unload!();
    }
  });

  it.each([
    ["delete", "char"],
    ["branch", "char"],
    ["branch", "user"],
  ] as const)(
    "restores stored HUDs immediately after a %s with a %s marker, including partially trimmed trackers",
    async (action, markerRole) => {
      vi.useFakeTimers();
      const plugin = await startPlugin(solaStore(), false, undefined, true);
      try {
        plugin.chats.set("0:0", { id: "chat-a", message: history(5) });
        await plugin.request(requestOf(plugin.chats.get("0:0")!));
        const original = structuredClone(plugin.chats.get("0:0")!);
        const oldest = original.message[1]!;
        expect(oldest.data).toContain(header);
        expect(oldest.data).not.toContain("<sola_hud");
        expect(oldest.solaHistory?.main?.removals.length).toBeGreaterThan(0);
        expect(restoreSolaHistoryContent(oldest.data, oldest.solaHistory?.main)).toBe(reply(0));
        const marker: SavedMessage = {
          role: markerRole,
          data: "{{specialcomment::branchedfrom::chat-a::Original::sola-a-2::}}",
          chatId: "sola-branch-marker",
          disabled: true,
        };
        const shortened: SavedChat = {
          id: action === "branch" ? "sola-branch" : "chat-a",
          message: [
            ...original.message.slice(0, 6).map((entry) => ({
              ...entry,
              chatId: action === "branch" ? `branch-${entry.chatId}` : entry.chatId,
            })),
            ...(action === "branch" ? [marker] : []),
          ],
        };
        const staleRequest = requestOf(shortened);
        const chatIndex = action === "branch" ? 1 : 0;
        plugin.chats.set(`0:${chatIndex}`, shortened);
        plugin.selectChat(chatIndex);
        await vi.advanceTimersByTimeAsync(250);
        const restored = plugin.chats.get(`0:${chatIndex}`)!;
        expect(restored.message[1]!.data).not.toContain("<sola_hud");
        expect(restored.message[3]!.data).toContain("<sola_hud");
        expect(restored.message[3]!.data).toContain("<date>Ngày: 1</date>");
        expect(restored.message[3]!.data).not.toContain("<wardrobe>");
        expect(restored.message[5]!.data).toBe(reply(2));
        expect(restored.message[5]!.data.match(/<sola_hud/g)).toHaveLength(1);
        for (const entry of restored.message.filter(
          (entry) => entry.role === "char" && entry !== restored.message[6],
        ))
          expect(entry.data).toContain(header);
        if (action === "branch") {
          expect(restored.message[6]).toEqual(marker);
          expect(plugin.chats.get("0:0")).toEqual(original);
        }
        const request = await plugin.request([
          ...staleRequest,
          { role: "user", content: "Tiếp tục." },
        ]);
        expect(request.some((entry) => entry.memo === marker.chatId)).toBe(false);
        const responses = request.filter((message) => message.memo?.includes("sola-a-"));
        expect(responses).toHaveLength(3);
        expect(responses[0]!.content).not.toContain("<scene_header");
        expect(responses[0]!.content).not.toContain("<sola_hud");
        expect(responses[1]!.content).toContain("<sola_hud");
        expect(responses[2]!.content).toBe(reply(2));
        const writes = plugin.writes.mock.calls.length;
        await vi.advanceTimersByTimeAsync(750);
        expect(plugin.writes).toHaveBeenCalledTimes(writes);
      } finally {
        await plugin.callbacks.unload!();
      }
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it("stores independent snapshots for swipes and reloads them with the saved chat", async () => {
    const store = solaStore();
    const plugin = await startPlugin(store);
    const chat = { id: "chat-a", message: history(4) };
    chat.message[1] = {
      ...chat.message[1]!,
      swipes: [reply(0), reply(20)],
      swipeId: 0,
    };
    plugin.chats.set("0:0", chat);
    await plugin.request(requestOf(chat));
    const trimmed = plugin.chats.get("0:0")!;
    expect(trimmed.message[1]!.data).not.toContain("<sola_hud");
    expect(trimmed.message[1]!.solaHistory?.["swipe:0"]).toBeDefined();
    trimmed.message[1]!.data = reply(20);
    trimmed.message[1]!.swipeId = 1;
    await plugin.request(requestOf(trimmed));
    const otherSwipe = plugin.chats.get("0:0")!.message[1]!;
    expect(otherSwipe.data).not.toContain("<sola_hud");
    expect(restoreSolaHistoryContent(otherSwipe.data, otherSwipe.solaHistory?.["swipe:1"])).toBe(
      reply(20),
    );
    expect(
      restoreSolaHistoryContent(
        otherSwipe.solaHistory!["swipe:0"]!.visible,
        otherSwipe.solaHistory?.["swipe:0"],
      ),
    ).toBe(reply(0));

    const reloaded = await startPlugin(store);
    const saved = structuredClone(plugin.chats.get("0:0")!);
    saved.message = saved.message.slice(0, 2);
    reloaded.chats.set("0:0", saved);
    const request = await reloaded.request(requestOf(saved));
    expect(reloaded.chats.get("0:0")!.message[1]!.data).toBe(reply(20));
    expect(request.find((message) => message.memo === "sola-a-0")?.content).toBe(reply(20));
    const reverted = reloaded.chats.get("0:0")!;
    reverted.message[1]!.swipeId = 0;
    reverted.message[1]!.data = reverted.message[1]!.solaHistory!["swipe:0"]!.visible;
    await reloaded.request(requestOf(reverted));
    expect(reloaded.chats.get("0:0")!.message[1]!.data).toBe(reply(0));
  });

  it("applies normal tracker expiry to rerolled responses outside the retained window", async () => {
    const store = solaStore();
    store.presets[0]!.settings.solaNsfwTrackerEnabled = true;
    store.presets[0]!.settings.solaSexTrackerEnabled = true;
    const plugin = await startPlugin(store);
    const nsfw = "<nsfw_nsfl_tracker>NSFW tracker</nsfw_nsfl_tracker>";
    const sex = "<sex_tracker>Sex tracker</sex_tracker>";
    const original = `${reply(0)}\n${nsfw}\n${sex}`;
    const alternate = `${reply(0)} bản swipe mới.\n${nsfw}\n${sex}`;
    const chat = { id: "chat-a", message: history(4) };
    chat.message[1] = {
      ...chat.message[1]!,
      data: original,
      swipes: [original, alternate],
      swipeId: 0,
    };
    plugin.chats.set("0:0", chat);

    await plugin.request(requestOf(chat));
    const cleaned = plugin.chats.get("0:0")!;
    expect(cleaned.message[1]!.data).not.toContain("<nsfw_nsfl_tracker>");
    expect(cleaned.message[1]!.data).not.toContain("<sex_tracker>");
    expect(cleaned.message[1]!.solaHistory?.["swipe:0"]).toBeDefined();

    cleaned.message[1]!.data = alternate;
    cleaned.message[1]!.swipeId = 1;
    const rerolledRequest = await plugin.request(requestOf(cleaned));
    const rerolledResponse = rerolledRequest.find((message) => message.memo === "sola-a-0");
    expect(rerolledResponse?.content).not.toContain("<nsfw_nsfl_tracker>");
    expect(rerolledResponse?.content).not.toContain("<sex_tracker>");
    expect(rerolledResponse?.content).toContain("bản swipe mới.");
    expect(
      rerolledRequest.some((message) => message.memo?.includes(":nsfw-pattern-ban-")),
    ).toBe(false);
  });

  it.each(["delete", "branch"] as const)(
    "injects the active swipe's restored tracker ban before the next user after %s",
    async (action) => {
      const store = solaStore();
      store.presets[0]!.settings.solaNsfwTrackerEnabled = true;
      const plugin = await startPlugin(store);
      const record = (pattern: string) =>
        `<nsfw_nsfl_tracker>Description patterns: ${pattern}\nPacing: opening to interruption</nsfw_nsfl_tracker>`;
      const original = `${reply(0)}\n${record("mẫu ban đầu")}`;
      const alternate = `${reply(0)} bản swipe mới.\n${record("mẫu swipe đang chọn")}`;
      const chat: SavedChat = { id: "chat-a", message: history(4) };
      chat.message[1] = {
        ...chat.message[1]!,
        data: original,
        swipes: [original, alternate],
        swipeId: 0,
      };
      plugin.chats.set("0:0", chat);
      await plugin.request(requestOf(chat));
      const cleaned = plugin.chats.get("0:0")!;
      cleaned.message[1]!.data = alternate;
      cleaned.message[1]!.swipeId = 1;
      await plugin.request(requestOf(cleaned));
      const saved = plugin.chats.get("0:0")!;
      expect(saved.message[1]!.data).not.toContain("<nsfw_nsfl_tracker>");

      const shortened: SavedChat = {
        id: action === "branch" ? "chat-branch" : saved.id,
        message: structuredClone(saved.message.slice(0, 2)),
      };
      const staleRequest = requestOf(shortened);
      const chatIndex = action === "branch" ? 1 : 0;
      plugin.chats.set(`0:${chatIndex}`, shortened);
      plugin.selectChat(chatIndex);
      const request = await plugin.request([...staleRequest, { role: "user", content: "Tiếp." }]);
      const banUsers = request.filter((message) =>
        message.memo?.endsWith(":nsfw-pattern-ban-user"),
      );
      const bans = request.filter((message) =>
        message.memo?.endsWith(":nsfw-pattern-ban-assistant"),
      );
      expect(banUsers).toHaveLength(1);
      expect(bans).toHaveLength(1);
      expect(bans[0]!.role).toBe("assistant");
      expect(bans[0]!.content).toContain("mẫu swipe đang chọn");
      expect(bans[0]!.content).not.toContain("mẫu ban đầu");
      const nextUserIndex = request.findIndex(
        (message) => message.role === "user" && message.content === "Tiếp.",
      );
      expect(request[nextUserIndex - 2]).toBe(banUsers[0]);
      expect(request[nextUserIndex - 1]).toBe(bans[0]);
      expect(request.find((message) => message.memo === "sola-a-0")?.content).not.toContain(
        "<nsfw_nsfl_tracker>",
      );
      expect(plugin.chats.get(`0:${chatIndex}`)!.message[1]!.data).toContain(
        "<nsfw_nsfl_tracker>",
      );
      if (action === "branch") expect(plugin.chats.get("0:0")).toEqual(saved);
    },
  );

  it("preserves host changes to narration when syncing restored trackers into a request", async () => {
    const plugin = await startPlugin(solaStore());
    const chat = { id: "chat-a", message: history(4) };
    plugin.chats.set("0:0", chat);
    const request = requestOf(chat);
    request[1]!.content = request[1]!.content.replace("Cảnh 0.", "Diễn biến đã được host sửa.");
    const built = await plugin.request(request);
    expect(built.find((message) => message.memo === "sola-a-0")?.content).toContain(
      "Diễn biến đã được host sửa.",
    );
  });

  it("restores a disabled saver while preserving headers in history and obeying its request toggle", async () => {
    const store = solaStore();
    const plugin = await startPlugin(store);
    plugin.chats.set("0:0", { id: "chat-a", message: history(4) });
    await plugin.request(requestOf(plugin.chats.get("0:0")!));
    await plugin.settingsUi();
    for (const script of sources.sola.preset.extensions!.regex_scripts!.filter(
      (script) => script.promptOnly,
    ))
      plugin.toggle(script.id).checked = false;
    plugin.toggle(SOLA_HEADER_SAVER_ID).checked = false;
    await plugin.uiEvent("save");
    const request = await plugin.request(requestOf(plugin.chats.get("0:0")!));
    expect(plugin.chats.get("0:0")!.message[1]!.data).toBe(reply(0));
    expect(request.find((message) => message.memo === "sola-a-0")?.content).toBe(reply(0));
  });
});

describe("Sola silent reproductive state", () => {
  const storeWithTracker = () => {
    const store = normalizePresetStore(preset, undefined, undefined, sources);
    store.presets[0]!.settings = switchPresetFamily(
      store.presets[0]!.settings,
      sources.sola.preset,
    );
    store.presets[0]!.settings.solaSexTrackerEnabled = true;
    return store;
  };
  const pregnancy = (chance: string, status = "") =>
    `<pregnancy chance="${chance}%" status="${status}" />`;
  const reply = (chance: string, status = "", name = "Nana") =>
    `Diễn biến.\n<sex_tracker>\n[${name}]:\nKhả năng và trạng thái mang thai: ${pregnancy(chance, status)}\n</sex_tracker>`;
  const history = (content: string): SavedChat => ({
    id: "chat-a",
    message: [
      { role: "char", chatId: "state", data: content },
      { role: "user", chatId: "next", data: "Tiếp tục." },
    ],
  });
  const requestOf = (chat: SavedChat): ChatMessage[] =>
    chat.message.map((entry) => ({
      role: entry.role === "char" ? "assistant" : "user",
      content: entry.data,
      memo: entry.chatId,
    }));
  const outputOf = (chat: SavedChat, chatIndex = 0, characterIndex = 0): OutputEvent => ({
    characterIndex,
    chatIndex,
    messageIndex: chat.message.length - 1,
    chat: structuredClone(chat),
    char: {},
  });

  it("uses the new response's independent probabilities, saves only that response and sends the saved result next turn", async () => {
    const random = vi.fn().mockReturnValueOnce(0.1).mockReturnValueOnce(0.8);
    const plugin = await startPlugin(storeWithTracker(), false, undefined, false, random);
    const chat = history(reply("100.00"));
    plugin.chats.set("0:0", chat);
    const built = await plugin.request(requestOf(chat));
    expect(random).not.toHaveBeenCalled();
    expect(built.find((message) => message.memo === "state")!.content).toContain(
      pregnancy("100.00"),
    );
    const content = `<sex_tracker>\n[Nana]:\nPregnancy likelihood/status: ${pregnancy("25.00")}\n[Mina]:\nPregnancy likelihood/status: ${pregnancy("70.00")}\n</sex_tracker>`;
    await plugin.complete(content);
    const saved = plugin.chats.get("0:0")!;
    expect(saved.message[0]!.data).toBe(chat.message[0]!.data);
    expect(saved.message[2]!.data).toContain(pregnancy("25.00", "9.99%|HIT|1/5"));
    expect(saved.message[2]!.data).toContain(pregnancy("70.00", "79.99%|MISS|0/5"));
    expect(random).toHaveBeenCalledTimes(2);
    const next = await plugin.request(requestOf(saved));
    expect(next.find((message) => message.memo === saved.message[2]!.chatId)!.content).toBe(
      saved.message[2]!.data,
    );
    expect(random).toHaveBeenCalledTimes(2);
    expect(next.map((message) => message.content).join("\n")).not.toMatch(
      /Reproductive roll|system roll|Roll hệ thống|system-provided/i,
    );
  });

  it("uses contraception-adjusted probability after the current scene, never the earlier exposure probability", async () => {
    const random = vi.fn(() => 0.5);
    const plugin = await startPlugin(storeWithTracker(), false, undefined, false, random);
    const chat = history(reply("95.00"));
    chat.message[1]!.data = "Nhân vật dùng thuốc tránh thai theo tình huống.";
    plugin.chats.set("0:0", chat);
    await plugin.request(requestOf(chat));
    expect(random).not.toHaveBeenCalled();
    const reduced = reply("1.50").replace(
      "</sex_tracker>",
      "Biện pháp và hành động bảo vệ: Thuốc tránh thai; hiệu lực và thời điểm đã được tính vào xác suất.\n</sex_tracker>",
    );
    await plugin.complete(reduced);
    expect(plugin.chats.get("0:0")!.message[2]!.data).toBe(
      reduced.replace('status=""', 'status="50.00%|MISS|0/5"'),
    );
    expect(plugin.chats.get("0:0")!.message[0]!.data).toBe(reply("95.00"));
    expect(random).toHaveBeenCalledTimes(1);
  });

  it("counts five hits once per completed turn and preserves progress across duplicates and reloads", async () => {
    const store = storeWithTracker();
    const random = vi.fn(() => 0.1).mockReturnValueOnce(0.9);
    const plugin = await startPlugin(store, false, undefined, false, random);
    plugin.chats.set("0:0", history(reply("50.00")));
    await plugin.request(requestOf(plugin.chats.get("0:0")!));
    await plugin.complete(reply("50.00"));
    const miss = outputOf(plugin.chats.get("0:0")!);
    await Promise.all([plugin.callbacks.output!(miss), plugin.callbacks.output!(miss)]);
    expect(random).toHaveBeenCalledTimes(1);
    expect(plugin.chats.get("0:0")!.message[2]!.data).toBe(reply("50.00", "89.99%|MISS|0/5"));
    await plugin.request(requestOf(plugin.chats.get("0:0")!));
    await plugin.complete(reply("50.00", "89.99%|MISS|0/5"));
    const firstHit = structuredClone(plugin.chats.get("0:0")!);
    await plugin.callbacks.output!(outputOf(firstHit));
    expect(firstHit.message[3]!.data).toBe(reply("50.00", "9.99%|HIT|1/5"));
    expect(random).toHaveBeenCalledTimes(2);

    const reloadedRandom = vi.fn(() => 0);
    const reloaded = await startPlugin(store, false, undefined, false, reloadedRandom);
    reloaded.chats.set("0:0", firstHit);
    await reloaded.callbacks.output!(outputOf(firstHit));
    expect(reloadedRandom).not.toHaveBeenCalled();
    for (const count of [1, 2, 3, 4]) {
      const request = await reloaded.request(requestOf(reloaded.chats.get("0:0")!));
      expect(request.some((message) => message.content.includes(`|HIT|${count}/5`))).toBe(true);
      await reloaded.complete(reply("50.00", `${count}/5`));
      const saved = reloaded.chats.get("0:0")!;
      const state = count === 4 ? "CONCEIVED" : "HIT";
      expect(saved.message.at(-1)!.data).toBe(reply("50.00", `0.00%|${state}|${count + 1}/5`));
      await Promise.all([
        reloaded.callbacks.output!(outputOf(saved)),
        reloaded.callbacks.output!(outputOf(saved)),
      ]);
      expect(reloadedRandom).toHaveBeenCalledTimes(count);
    }
    await reloaded.request(requestOf(reloaded.chats.get("0:0")!));
    const progressed = reply("50.00", "0.00%|CONCEIVED|5/5").replace(
      "</sex_tracker>",
      "Giai đoạn thai kỳ: Tam cá nguyệt hai, tuần 16.\n</sex_tracker>",
    );
    await reloaded.complete(progressed);
    expect(reloaded.chats.get("0:0")!.message.at(-1)!.data).toBe(progressed);
    expect(reloadedRandom).toHaveBeenCalledTimes(4);
  });

  it("honors cleared results, zero probability, missing trackers and independently updated probabilities", async () => {
    const random = vi.fn(() => 0);
    const plugin = await startPlugin(storeWithTracker(), false, undefined, false, random);
    plugin.chats.set("0:0", history(reply("50.00", "Đã thụ thai")));
    for (const content of [reply("0.00"), "Diễn biến không có tracker.", reply("12.34")]) {
      await plugin.request(requestOf(plugin.chats.get("0:0")!));
      await plugin.complete(content);
    }
    expect(random).toHaveBeenCalledTimes(1);
    expect(plugin.chats.get("0:0")!.message.at(-1)!.data).toBe(reply("12.34", "0.00%|HIT|1/5"));
  });

  it.each([false, true])(
    "continues compact HIT statuses instead of restarting the counter (%s)",
    async (stateFirst) => {
      const random = vi.fn(() => 0.1);
      const plugin = await startPlugin(storeWithTracker(), false, undefined, false, random);
      const status = (count: number) => (stateFirst ? `HIT|${count}/5` : `${count}/5|HIT`);
      plugin.chats.set("0:0", history(reply("50.00", status(1))));
      for (const count of [1, 2, 3, 4]) {
        await plugin.request(requestOf(plugin.chats.get("0:0")!));
        await plugin.complete(reply("50.00", status(count)));
        const state = count === 4 ? "CONCEIVED" : "HIT";
        expect(plugin.chats.get("0:0")!.message.at(-1)!.data).toBe(
          reply("50.00", `9.99%|${state}|${count + 1}/5`),
        );
      }
      expect(random).toHaveBeenCalledTimes(4);
    },
  );

  it("retains accumulated hits when the AI clears status on every new turn", async () => {
    const random = vi.fn(() => 0.1).mockReturnValueOnce(0.9);
    const plugin = await startPlugin(storeWithTracker(), false, undefined, false, random);
    plugin.chats.set("0:0", history(reply("50.00", "10.00%|HIT|1/5")));
    const statuses = [
      "89.99%|MISS|1/5",
      "9.99%|HIT|2/5",
      "9.99%|HIT|3/5",
      "9.99%|HIT|4/5",
      "9.99%|CONCEIVED|5/5",
    ];
    for (const status of statuses) {
      await plugin.request(requestOf(plugin.chats.get("0:0")!));
      await plugin.complete(reply("50.00", " "));
      const saved = plugin.chats.get("0:0")!;
      expect(saved.message.at(-1)!.data).toBe(reply("50.00", status));
      await plugin.callbacks.output!(outputOf(saved));
    }
    expect(random).toHaveBeenCalledTimes(5);
    await plugin.request(requestOf(plugin.chats.get("0:0")!));
    await plugin.complete(reply("50.00"));
    expect(plugin.chats.get("0:0")!.message.at(-1)!.data).toBe(
      reply("50.00", "9.99%|CONCEIVED|5/5"),
    );
    expect(random).toHaveBeenCalledTimes(5);
    await plugin.request(requestOf(plugin.chats.get("0:0")!));
    await plugin.complete(reply("0.00"));
    await plugin.request(requestOf(plugin.chats.get("0:0")!));
    await plugin.complete(reply("50.00"));
    expect(plugin.chats.get("0:0")!.message.at(-1)!.data).toBe(reply("50.00", "9.99%|HIT|1/5"));
    expect(random).toHaveBeenCalledTimes(6);
  });

  it("starts each rerolled swipe from the preceding turn instead of the replaced result", async () => {
    const random = vi.fn(() => 0);
    const plugin = await startPlugin(storeWithTracker(), false, undefined, false, random);
    const chat = history(reply("50.00", "10.00%|HIT|1/5"));
    const original = reply("50.00", "20.00%|HIT|2/5");
    chat.message.push({
      role: "char", chatId: "rerolled", data: original, swipeId: 0, swipes: [original],
    });
    plugin.chats.set("0:0", chat);
    for (const swipeId of [1, 2]) {
      await plugin.request(requestOf(plugin.chats.get("0:0")!));
      const active = plugin.chats.get("0:0")!;
      const target = active.message.at(-1)!;
      target.data = reply("50.00");
      target.swipeId = swipeId;
      target.swipes!.push(target.data);
      await plugin.callbacks.output!(outputOf(active));
      const saved = plugin.chats.get("0:0")!.message.at(-1)!;
      expect(saved.data).toBe(reply("50.00", "0.00%|HIT|2/5"));
      expect(saved.swipes?.[swipeId]).toBe(saved.data);
      expect(saved.swipes?.[0]).toBe(original);
    }
    expect(random).toHaveBeenCalledTimes(2);
  });

  it.each(["delete", "branch"] as const)(
    "does not roll restored history after %s; resolves only the newly generated swipe",
    async (action) => {
      const random = vi.fn(() => 0);
      const plugin = await startPlugin(storeWithTracker(), false, undefined, false, random);
      const chat = history(reply("100.00"));
      chat.message[0]!.swipes = [reply("100.00"), reply("75.00")];
      chat.message[0]!.swipeId = 0;
      chat.message.push({ role: "char", data: "Mới hơn.", chatId: "newer" });
      plugin.chats.set("0:0", chat);
      await plugin.request(requestOf(chat));
      const saved = structuredClone(plugin.chats.get("0:0")!);
      expect(saved.message[0]!.data).not.toContain("<sex_tracker>");
      const shortened = structuredClone(saved);
      shortened.message = shortened.message.slice(0, 2);
      shortened.message[0]!.swipeId = 1;
      shortened.message[0]!.data = reply("75.00");
      if (action === "branch") shortened.id = "branch-a";
      const chatIndex = action === "branch" ? 1 : 0;
      plugin.chats.set(`0:${chatIndex}`, shortened);
      plugin.selectChat(chatIndex);
      await plugin.request(requestOf(shortened));
      expect(random).not.toHaveBeenCalled();
      const active = plugin.chats.get(`0:${chatIndex}`)!;
      active.message.pop(); // reroll the selected reply as a fresh alternative
      const target = active.message[0]!;
      target.data = reply("20.00");
      target.swipes!.push(target.data);
      target.swipeId = 2;
      await plugin.callbacks.output!(outputOf(active, chatIndex));
      const updated = plugin.chats.get(`0:${chatIndex}`)!.message[0]!;
      expect(updated.data).toBe(reply("20.00", "0.00%|HIT|1/5"));
      expect(updated.swipes?.[2]).toBe(updated.data);
      expect(updated.swipes?.slice(0, 2)).toEqual([reply("100.00"), reply("75.00")]);
      expect(random).toHaveBeenCalledTimes(1);
      if (action === "branch") expect(plugin.chats.get("0:0")).toEqual(saved);
    },
  );

  it("awaits the completed response's save before the next request and reuses samples on a concurrent host edit", async () => {
    const random = vi.fn(() => 0.2);
    const plugin = await startPlugin(storeWithTracker(), false, undefined, false, random);
    const chat = history(reply("50.00"));
    plugin.chats.set("0:0", chat);
    await plugin.request(requestOf(chat));
    const getChat = plugin.api.getChatFromIndex;
    const getSpy = vi
      .spyOn(plugin.api, "getChatFromIndex")
      .mockImplementation(async (character, index) => {
        if (
          random.mock.calls.length === 1 &&
          !plugin.chats.get("0:0")!.message[1]!.data.endsWith("!")
        )
          plugin.chats.get("0:0")!.message[1]!.data += "!";
        return getChat(character, index);
      });
    let release!: () => void;
    const pendingWrite = new Promise<void>((resolve) => {
      release = resolve;
    });
    const setChat = plugin.api.setChatToIndex;
    const setSpy = vi
      .spyOn(plugin.api, "setChatToIndex")
      .mockImplementation(async (character, index, data) => {
        await pendingWrite;
        await setChat(character, index, data);
      });
    const completed = plugin.complete(reply("50.00"));
    await vi.waitFor(() => expect(setSpy).toHaveBeenCalledTimes(1));
    let settled = false;
    const pending = plugin.request(requestOf(plugin.chats.get("0:0")!)).then((result) => {
      settled = true;
      return result;
    });
    await Promise.resolve();
    expect(settled).toBe(false);
    release();
    const [, built] = await Promise.all([completed, pending]);
    expect(random).toHaveBeenCalledTimes(1);
    expect(plugin.chats.get("0:0")!.message[1]!.data).toBe("Tiếp tục.!");
    const newest = plugin.chats.get("0:0")!.message[2]!;
    expect(built.find((message) => message.memo === newest.chatId)!.content).toContain(
      pregnancy("50.00", "19.99%|HIT|1/5"),
    );
    getSpy.mockRestore();
    setSpy.mockRestore();
  });

  it("serializes simultaneous completion events even when the attempt fails", async () => {
    const random = vi.fn(() => 0.99);
    const plugin = await startPlugin(storeWithTracker(), false, undefined, false, random);
    await plugin.request();
    const chat = plugin.chats.get("0:0")!;
    chat.message.push({ role: "char", data: reply("50.00"), chatId: "completed" });
    const event = outputOf(chat);
    await Promise.all([plugin.callbacks.output!(event), plugin.callbacks.output!(event)]);
    expect(random).toHaveBeenCalledTimes(1);
    expect(plugin.chats.get("0:0")!.message.at(-1)!.data).toBe(reply("50.00", "98.99%|MISS|0/5"));
  });

  it("ignores streaming, partial/stale outputs, history polling, display and auxiliary requests", async () => {
    vi.useFakeTimers();
    const random = vi.fn(() => 0);
    const plugin = await startPlugin(storeWithTracker(), false, undefined, true, random);
    try {
      const chat = history(reply("100.00"));
      plugin.chats.set("0:0", chat);
      await vi.advanceTimersByTimeAsync(750);
      await plugin.callbacks.display!(chat.message[0]!.data);
      await plugin.callbacks.beforeRequest!(requestOf(chat), "submodel");
      await plugin.request(requestOf(chat));
      plugin.chats.get("0:0")!.isStreaming = true;
      await plugin.complete(reply("100.00").replace("</sex_tracker>", ""));
      const active = plugin.chats.get("0:0")!;
      active.isStreaming = false;
      await plugin.callbacks.output!(outputOf(active));
      expect(random).not.toHaveBeenCalled();
      const stale = outputOf(active);
      active.message.at(-1)!.data = reply("0.00");
      await plugin.callbacks.output!(stale);
      expect(random).not.toHaveBeenCalled();
      active.message.at(-1)!.data = reply("100.00");
      await plugin.callbacks.output!(outputOf(active));
      expect(random).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(500);
      expect(random).toHaveBeenCalledTimes(1);
    } finally {
      await plugin.callbacks.unload!();
    }
  });

  it("keeps output attached to its originating chat after navigation", async () => {
    const random = vi.fn(() => 0);
    const plugin = await startPlugin(storeWithTracker(), false, undefined, false, random);
    await plugin.request();
    plugin.selectChat(1);
    const other = structuredClone(plugin.chats.get("0:1")!);
    await plugin.complete(reply("100.00"), 0, 0);
    expect(plugin.chats.get("0:0")!.message.at(-1)!.data).toBe(reply("100.00", "0.00%|HIT|1/5"));
    expect(plugin.chats.get("0:1")).toEqual(other);
    expect(random).toHaveBeenCalledTimes(1);
  });

  it("ignores tracker examples inside provider reasoning and resolves only the actual response", async () => {
    const random = vi.fn(() => 0);
    const plugin = await startPlugin(storeWithTracker(), false, undefined, false, random);
    await plugin.request();
    const reasoning = `<think>${reply("100.00", "", "Example")}</think>\n`;
    await plugin.complete(reasoning + reply("25.00"));
    const saved = plugin.chats.get("0:0")!.message.at(-1)!.data;
    expect(saved).toBe(reasoning + reply("25.00", "0.00%|HIT|1/5"));
    expect(random).toHaveBeenCalledTimes(1);
  });

  it("still resolves the actual tracker when history cleanup removes provider reasoning before completion", async () => {
    vi.useFakeTimers();
    const random = vi.fn(() => 0);
    const plugin = await startPlugin(storeWithTracker(), false, undefined, true, random);
    try {
      await plugin.request();
      const chat = plugin.chats.get("0:0")!;
      chat.message.push({
        role: "char",
        data: `<think>Plan.</think>\n${reply("25.00")}`,
        chatId: "completed",
      });
      const event = outputOf(chat);
      await vi.advanceTimersByTimeAsync(250);
      expect(plugin.chats.get("0:0")!.message.at(-1)!.data).not.toContain("<think>");
      await plugin.callbacks.output!(event);
      expect(plugin.chats.get("0:0")!.message.at(-1)!.data).toContain(
        pregnancy("25.00", "0.00%|HIT|1/5"),
      );
      expect(random).toHaveBeenCalledTimes(1);
    } finally {
      await plugin.callbacks.unload!();
    }
  });

  it("ignores a late completion of the previous reply after the next request has started", async () => {
    const random = vi.fn(() => 0);
    const plugin = await startPlugin(storeWithTracker(), false, undefined, false, random);
    const chat = history(reply("100.00"));
    chat.message.pop();
    plugin.chats.set("0:0", chat);
    await plugin.request(requestOf(chat));
    await plugin.callbacks.output!(outputOf(plugin.chats.get("0:0")!));
    expect(random).not.toHaveBeenCalled();
    expect(plugin.chats.get("0:0")!.message[0]!.data).toBe(reply("100.00"));
    await plugin.complete(reply("25.00"));
    expect(random).toHaveBeenCalledTimes(1);
    expect(plugin.chats.get("0:0")!.message[1]!.data).toBe(reply("25.00", "0.00%|HIT|1/5"));
  });

  it("does not roll again when automatic or manual Submodel editing creates another swipe", async () => {
    const store = storeWithTracker();
    store.presets[0]!.settings.submodelEditorEnabled = true;
    store.presets[0]!.settings.submodelAutoRewriteEnabled = true;
    const random = vi.fn(() => 0.1);
    const plugin = await startPlugin(store, false, undefined, false, random);
    plugin.runModel.mockResolvedValue({
      type: "success",
      result: reply("50.00", "9.99%|HIT|1/5"),
    });
    await plugin.request();
    await plugin.complete(reply("50.00"));
    expect(plugin.runModel).toHaveBeenCalledTimes(1);
    expect(plugin.runModel.mock.calls[0]![0].messages.at(-2).content).toContain(
      'status="9.99%|HIT|1/5"',
    );
    expect(plugin.chats.get("0:0")!.message.at(-1)!.data).toBe(reply("50.00", "9.99%|HIT|1/5"));
    await plugin.callbacks.output!(outputOf(plugin.chats.get("0:0")!));
    expect(random).toHaveBeenCalledTimes(1);
    expect(plugin.runModel).toHaveBeenCalledTimes(1);
  });

  it.each(["disabled", "ff54"])("does not resolve when the tracker is %s", async (mode) => {
    const store = storeWithTracker();
    if (mode === "disabled") store.presets[0]!.settings.solaSexTrackerEnabled = false;
    else
      store.presets[0]!.settings = switchPresetFamily(
        store.presets[0]!.settings,
        sources.ff54.preset,
      );
    const random = vi.fn(() => 0);
    const plugin = await startPlugin(store, false, undefined, false, random);
    await plugin.request();
    await plugin.complete(reply("100.00"));
    expect(random).not.toHaveBeenCalled();
    expect(plugin.chats.get("0:0")!.message.at(-1)!.data).not.toContain("|CONCEIVED");
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
