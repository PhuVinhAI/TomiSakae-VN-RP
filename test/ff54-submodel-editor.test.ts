import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { build } from "esbuild";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { normalizeSettings, type ChatMessage, type FfPreset } from "../src/core.js";
import { loadPresetSources } from "../scripts/build-tomisakae-vn-rp-plugin.js";
import { switchPresetFamily } from "../src/presets.js";
import { pluginMemoPrefix, type PresetSources } from "../src/preset-family.js";
import { buildEditorReferenceMessages } from "../src/submodel-context.js";
import {
  CONFIG_PRESETS_STORAGE_KEY,
  createConfigPreset,
  normalizePresetStore,
  selectCardPreset,
} from "../src/presets.js";
import { restoreSolaHistoryContent, type SolaHistoryArchive } from "../src/sola-history.js";

interface SavedMessage {
  role: "user" | "char";
  data: string;
  chatId: string;
  swipes?: string[];
  swipeId?: number;
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

interface ModelOptions {
  mode: string;
  messages: ChatMessage[];
  allowPlugins: boolean;
  staticModel?: string;
}

let bundled = "";
let preset: FfPreset;
let sources: PresetSources;

beforeAll(async () => {
  const raw = await readFile("source/ff54-sillytavern-preset.json", "utf8");
  preset = JSON.parse(raw) as FfPreset;
  sources = await loadPresetSources();
  const result = await build({
    entryPoints: ["src/plugin.ts"],
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    target: "es2022",
    define: {
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
  enabled = true,
  automatic = false,
  savedPresets?: unknown,
  pauseButtonInitialization = false,
  sound = false,
  watchHistory = false,
) {
  const callbacks = {
    beforeRequest: undefined as
      ((messages: ChatMessage[], type: string) => Promise<ChatMessage[]>) | undefined,
    display: undefined as ((content: string) => Promise<string>) | undefined,
    output: undefined as ((event: OutputEvent) => Promise<void>) | undefined,
    unload: undefined as (() => Promise<void>) | undefined,
    click: undefined as ((event: { key?: string }) => Promise<void>) | undefined,
    keydown: undefined as ((event: { key?: string }) => Promise<void>) | undefined,
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
    [
      "ff54-global-settings-v1",
      enabled
        ? {
            submodelEditorEnabled: true,
            submodelAutoRewriteEnabled: automatic,
            soundNotificationsEnabled: sound,
          }
        : { submodelAutoRewriteEnabled: automatic, soundNotificationsEnabled: sound },
    ],
    [CONFIG_PRESETS_STORAGE_KEY, savedPresets],
  ]);
  let openSettings!: () => void;
  interface UiNode {
    value: string;
    checked: boolean;
    dataset: Record<string, string>;
    textContent: string;
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
      handlers: new Map(),
      addEventListener(type, handler) {
        node.handlers.set(type, handler);
      },
    };
    uiNodes.set(key, node);
    return node;
  };
  let settingsHtml = "";
  const uiDocument = {
    head: { innerHTML: "" },
    body: {
      set innerHTML(html: string) {
        settingsHtml = html;
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
        selector.includes("data-family")
          ? !!node.dataset.family
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
  const runModel = vi.fn<(options: ModelOptions) => Promise<unknown>>();
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
  let checked = false;
  let focused = false;
  let rewriteControlCount = 0;
  let requestRootInitialization!: () => void;
  const rootInitializationRequested = new Promise<void>((resolve) => {
    requestRootInitialization = resolve;
  });
  let releaseRootInitialization!: () => void;
  const rootInitializationGate = new Promise<void>((resolve) => {
    releaseRootInitialization = resolve;
  });
  let control: { html: string; attached: boolean } | undefined;
  const row = {
    querySelector: async () => ({ getParent: async () => toolbar }),
  };
  const toolbar = {
    querySelector: async () => (control?.attached ? control : null),
    prepend: async (node: { html: string; attached: boolean }) => {
      control = node;
      control.attached = true;
    },
  };
  const root = {
    querySelector: async (selector: string) => {
      if (selector === 'button[aria-labelledby="cancel"]')
        return generating.has(`${selectedCharacter}:${selectedChat}`) ? {} : null;
      if (selector === ".button-icon-send")
        return generating.has(`${selectedCharacter}:${selectedChat}`) ? null : {};
      if (selector.includes("input:checked")) return control?.attached && checked ? {} : null;
      if (selector.includes("input:focus")) return control?.attached && focused ? {} : null;
      if (selector.includes(".risu-chat")) {
        const match = selector.match(/data-chat-index="(\d+)"/);
        return Number(match?.[1]) ===
          chats.get(`${selectedCharacter}:${selectedChat}`)!.message.length - 1
          ? row
          : null;
      }
      return null;
    },
    createElement: async () => {
      rewriteControlCount += 1;
      const node = {
        html: "",
        attached: false,
        setClassName: async () => {},
        setInnerHTML: async (html: string) => {
          node.html = html;
          checked = false;
        },
        remove: async () => {
          node.attached = false;
        },
      };
      return node;
    },
    addEventListener: async (
      type: "click" | "keydown",
      callback: (event: { key?: string }) => Promise<void>,
    ) => {
      callbacks[type] = callback;
      return type;
    },
    removeEventListener: vi.fn(),
  };
  const observer = { observe: vi.fn(), disconnect: vi.fn() };
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
      if (pauseButtonInitialization) ready();
    },
    removeRisuChatListener: vi.fn(),
    onUnload: async (callback: () => Promise<void>) => {
      callbacks.unload = callback;
      if (!pauseButtonInitialization) ready();
    },
    runLLMModel: runModel,
    alert: vi.fn().mockResolvedValue(undefined),
    alertConfirm: vi.fn<(message: string) => Promise<boolean>>().mockResolvedValue(false),
    alertError: vi.fn().mockResolvedValue(undefined),
    getRootDocument: async () => {
      requestRootInitialization();
      if (pauseButtonInitialization) await rootInitializationGate;
      return root;
    },
    createMutationObserver: async () => observer,
  };
  runInNewContext(bundled, {
    Risuai: api,
    structuredClone,
    TextEncoder,
    TextDecoder,
    setTimeout,
    clearTimeout,
    ...(watchHistory ? { setInterval, clearInterval } : {}),
    crypto: { randomUUID: () => `test-${storage.size}-${Math.random()}` },
    document: uiDocument,
    AudioContext: FakeAudioContext,
    console: { warn: vi.fn() },
  });
  await initialized;

  return {
    settingsHtml: () => settingsHtml,
    async selectFamily(family: string) {
      for (const node of inputs.filter((input) => input.dataset.family))
        node.checked = node.dataset.family === family;
      await inputs.find((node) => node.dataset.family === family)!.handlers.get("change")!();
    },
    callbacks,
    sounds,
    failMain: () => generating.delete(`${selectedCharacter}:${selectedChat}`),
    chats,
    runModel,
    writes,
    api,
    root,
    observer,
    rootInitializationRequested,
    releaseRootInitialization,
    rewriteControlCount: () => rewriteControlCount,
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
    button() {
      return control;
    },
    async rewrite() {
      if (!control?.attached || control.html.includes("disabled")) return;
      checked = true;
      await callbacks.click?.({});
    },
    async otherClick() {
      await callbacks.click?.({});
    },
    async enter() {
      focused = true;
      await callbacks.keydown?.({ key: "Enter" });
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

describe("FF5.4 Submodel editor integration", () => {
  it("creates only one rewrite button when saving settings races with startup", async () => {
    const plugin = await startPlugin(true, false, undefined, true);
    await plugin.rootInitializationRequested;
    plugin.chats.get("0:0")!.message.push({
      role: "char",
      data: "Ruka chào bạn.",
      chatId: "reply-a",
    });
    await plugin.settingsUi();
    const save = plugin.ui("save").handlers.get("click");
    expect(save).toBeDefined();
    const saving = save!();
    plugin.releaseRootInitialization();
    await saving;
    expect(plugin.rewriteControlCount()).toBe(1);
    expect(plugin.observer.observe).toHaveBeenCalledTimes(1);
  });

  it("defaults existing saves to off and preserves an explicitly saved toggle", () => {
    expect(normalizeSettings(preset, {}).submodelEditorEnabled).toBe(false);
    expect(normalizeSettings(preset, { submodelEditorEnabled: true }).submodelEditorEnabled).toBe(
      true,
    );
    expect(normalizeSettings(preset, {}).submodelAutoRewriteEnabled).toBe(false);
    expect(
      normalizeSettings(preset, { submodelAutoRewriteEnabled: true }).submodelAutoRewriteEnabled,
    ).toBe(false);
    expect(
      normalizeSettings(preset, {
        submodelEditorEnabled: true,
        submodelAutoRewriteEnabled: true,
      }).submodelAutoRewriteEnabled,
    ).toBe(true);
  });

  it("uses the selected submodel with retained prompts and no restored history", async () => {
    const plugin = await startPlugin();
    const built = await plugin.request();
    const snapshot = structuredClone(built);
    // The provider may mutate its copy after the beforeRequest callback.
    built[0]!.content = "provider mutation";
    plugin.runModel.mockResolvedValue({
      type: "success",
      result: "An bước tới, nhẹ giọng chào bạn.",
    });
    await plugin.complete("An di chuyển lại gần, nói lời chào với bạn.");
    expect(plugin.runModel).not.toHaveBeenCalled();
    await plugin.rewrite();
    expect(plugin.runModel).toHaveBeenCalledTimes(1);
    const options = plugin.runModel.mock.calls[0]![0];
    expect(options.mode).toBe("submodel");
    expect(options.allowPlugins).toBe(false);
    expect(options).not.toHaveProperty("staticModel");
    expect(snapshot.filter((message) => message.memo === "ff54:vietnamese-output")).toHaveLength(1);
    expect(snapshot.map((message) => message.content).join("\n")).toContain(
      "Thời gian HH:MM SA/CH",
    );
    const editorIndex = options.messages.findIndex(
      (message) => message.memo === "ff54:submodel-editor",
    );
    const highRiskIndex = options.messages.findIndex(
      (message) => message.memo === "ff54:jailbreak",
    );
    expect(editorIndex).toBeGreaterThan(-1);
    expect(highRiskIndex).toBeGreaterThan(-1);
    expect(editorIndex).toBeLessThan(highRiskIndex);
    expect(options.messages[editorIndex]).toMatchObject({
      role: "system",
      content: expect.stringMatching(/^<vietnamese_editor>/),
      memo: "ff54:submodel-editor",
    });
    expect(options.messages[editorIndex]!.content).toContain(
      "Freely rebuild sentences and paragraphs with manga, anime, and light-novel pacing.",
    );
    expect(options.messages[editorIndex]!.content).toContain("use comic timing when appropriate");
    expect(options.messages[editorIndex]!.content).toContain(
      "Rewrite free-text descriptions, thoughts, and notes inside <internal_states> into natural Vietnamese while preserving their information and meaning.",
    );
    expect(options.messages[editorIndex]!.content).toContain(
      "Do not fill in, recalculate, or normalize data into defaults or zeros.",
    );
    expect(options.messages[editorIndex]!.content).toContain(
      "Adjust pronouns and address to identity, relationship, and viewpoint; preserve intent, respect, intimacy, idiolect, and natural hesitations.",
    );
    expect(options.messages[editorIndex]!.content).not.toContain("- Scene Flow:");
    expect(options.messages[editorIndex]!.content).not.toContain("- Display Text:");
    expect(options.messages[editorIndex]!.content).not.toContain("Lock all state data:");
    expect(options.messages[editorIndex]!.content).not.toContain("<anime_manga_light_novel_style>");
    expect(
      options.messages.filter((message) => message.memo === "ff54:anime-manga-light-novel-style"),
    ).toHaveLength(0);
    expect(
      options.messages.filter((message) => message.memo === "ff54:vietnamese-natural-writing"),
    ).toHaveLength(0);
    const references = options.messages
      .slice(0, -1)
      .filter((message) => message.memo !== "ff54:submodel-editor");
    expect(references).toEqual([
      ...snapshot,
      {
        role: "assistant",
        content: "An di chuyển lại gần, nói lời chào với bạn.",
        memo: "ff54:submodel-editor-source",
      },
    ]);
    const editorTarget = options.messages.at(-1)!;
    expect(editorTarget.role).toBe("user");
    expect(editorTarget.content).toBe(
      "Rewrite the latest assistant response according to <vietnamese_editor>, including descriptions, thoughts, and notes inside <internal_states>. Keep numeric and fixed state values unchanged; do not fill in data. Return only the complete response; do not continue RP.",
    );
    expect(editorTarget.content).toContain("do not continue RP.");
    expect(editorTarget.content).not.toContain("[OOC]");
    expect(references.filter((message) => message.memo === "old-a")).toHaveLength(0);
    expect(references.filter((message) => message.memo === "user-a")).toHaveLength(1);
    expect(options.messages.at(-1)!.content).not.toContain(
      "Sự kiện cũ không còn trong request main.",
    );
    expect(options.messages.at(-1)!.content).not.toContain("Complete saved chat history");
    expect(plugin.chats.get("0:0")!.message.at(-1)!.data).toBe("An bước tới, nhẹ giọng chào bạn.");
    expect(plugin.chats.get("0:0")!.message.at(-1)!.swipes).toEqual([
      "An di chuyển lại gần, nói lời chào với bạn.",
      "An bước tới, nhẹ giọng chào bạn.",
    ]);
    expect(plugin.chats.get("0:0")!.message.at(-1)!.swipeId).toBe(1);
    expect(plugin.api.alert).toHaveBeenCalledWith(expect.stringContaining("Đã biên tập"));
  });

  it("does not call submodel when the toggle is off", async () => {
    const plugin = await startPlugin(false);
    await plugin.request();
    await plugin.complete("An chào bạn.");
    expect(plugin.runModel).not.toHaveBeenCalled();
  });

  it("sends two prior exchanges and the latest user input without memory or older history", async () => {
    const plugin = await startPlugin();
    const history: ChatMessage[] = [
      { role: "user", content: "Lượt cũ.", memo: "u0" },
      { role: "assistant", content: "Phản hồi cũ.", memo: "a0" },
      { role: "user", content: "Lượt trước thứ nhất.", memo: "u1" },
      { role: "assistant", content: "Phản hồi trước thứ nhất.", memo: "a1" },
      { role: "user", content: "Lượt trước thứ hai.", memo: "u2" },
      { role: "assistant", content: "Phản hồi trước thứ hai.", memo: "a2" },
      { role: "user", content: "Tin nhắn hiện tại.", memo: "u3" },
    ];
    const chat = plugin.chats.get("0:0")!;
    chat.message = history.map((message) => ({
      role: message.role === "assistant" ? "char" : "user",
      data: message.content,
      chatId: message.memo!,
    }));
    const request: ChatMessage[] = [
      { role: "system", content: "Card và lore.", memo: "card" },
      { role: "user", content: "Chỉ dẫn của preset host.", memo: "host-prompt" },
      { role: "system", content: "Ký ức đầy đủ.", memo: "supaMemory" },
      {
        role: "system",
        content: "[Roleplay Summary]\n<Past Events Summary>Tóm tắt cũ.</Past Events Summary>",
      },
      ...history,
    ];
    const built = await plugin.request(request);
    const snapshot = structuredClone(built);
    plugin.runModel.mockResolvedValue({ type: "success", result: "An bước tới." });
    await plugin.complete("<Thoughts>Planning.</Thoughts>\nAn di chuyển tới.");
    await plugin.rewrite();
    const messages = plugin.runModel.mock.calls[0]![0].messages;
    expect(
      messages.filter((message) => history.some((entry) => entry.memo === message.memo)),
    ).toEqual(history.slice(2));
    expect(messages.some((message) => message.memo === "supaMemory")).toBe(false);
    expect(messages.some((message) => message.content.includes("Tóm tắt cũ."))).toBe(false);
    expect(messages.find((message) => message.memo === "host-prompt")?.content).toBe(
      "Chỉ dẫn của preset host.",
    );
    expect(messages.find((message) => message.memo === "card")?.content).toBe("Card và lore.");
    expect(messages.filter((message) => message.memo === "ff54:submodel-editor-source")).toEqual([
      { role: "assistant", content: "An di chuyển tới.", memo: "ff54:submodel-editor-source" },
    ]);
    expect(messages.at(-1)?.memo).toBe("ff54:submodel-editor-target");
    expect(built).toEqual(snapshot);
    expect(built.some((message) => message.memo === "supaMemory")).toBe(true);
    expect(chat.message[0]?.data).toBe("Lượt cũ.");
  });

  it("keeps the current reply as the assistant source when regenerating in place", async () => {
    const plugin = await startPlugin();
    const original = "An di chuyển tới.";
    const chat = plugin.chats.get("0:0")!;
    chat.message.push({ role: "char", data: original, chatId: "current-reply" });
    await plugin.request([
      { role: "system", content: "Card, lore và memory." },
      { role: "user", content: "Chào An.", memo: "user-a" },
      { role: "assistant", content: original, memo: "current-reply" },
    ]);
    await plugin.callbacks.output!({
      characterIndex: 0,
      chatIndex: 0,
      messageIndex: 2,
      chat: structuredClone(chat),
      char: {},
    });
    plugin.runModel.mockResolvedValue({ type: "success", result: "An bước tới." });
    await plugin.rewrite();
    const messages = plugin.runModel.mock.calls[0]![0].messages;
    expect(messages.slice(0, -1).some((message) => message.content.includes(original))).toBe(true);
    expect(messages.at(-1)!.content).not.toContain(original);
    expect(messages.some((message) => message.memo === "ff54:submodel-editor-source")).toBe(true);
  });

  it("sends only the response starting at its scene header and preserves the stored prefix", async () => {
    const plugin = await startPlugin();
    await plugin.request();
    const prefix =
      "<Thoughts>Main reasoning.</Thoughts>\n\nUnwrapped planning before the header.\n";
    const header = "[ 🕰️ Thời gian 14:25 CH | 🗓️ Ngày 1 | 📍 Đại học | ☀️ Nắng ráo, 20 °C ]";
    await plugin.complete(prefix + header + "\nAn di chuyển tới.");
    plugin.runModel.mockResolvedValue({
      type: "success",
      result:
        "<Thoughts>Editor reasoning.</Thoughts>\nExtra editor planning.\n" +
        header +
        "\nAn bước tới.",
    });
    await plugin.rewrite();
    const messages = plugin.runModel.mock.calls[0]![0].messages;
    const source = messages.find((message) => message.memo === "ff54:submodel-editor-source")!;
    expect(source.content).toContain(header + "\nAn di chuyển tới.");
    expect(source.content).not.toContain("Main reasoning.");
    expect(source.content).not.toContain("Unwrapped planning");
    expect(messages.at(-1)!.content).not.toContain(header);
    expect(plugin.chats.get("0:0")!.message.at(-1)!.data).toBe(prefix + header + "\nAn bước tới.");
    expect(plugin.api.alertConfirm).not.toHaveBeenCalled();
  });

  it("accepts sentence and paragraph restructuring while preserving UI syntax and facts", async () => {
    const plugin = await startPlugin();
    await plugin.request();
    const original =
      "<pink:happy>“Tôi đang cảm thấy một cảm giác nhẹ nhõm khi thấy bạn đã trở lại.”</pink:happy>\n\nAn thực hiện việc đặt 2 chiếc cốc lên bàn. Sau đó An di chuyển lại gần bạn với một tốc độ chậm.";
    const rewritten =
      "<pink:happy>“Thấy bạn về, tôi nhẹ cả người.”</pink:happy>\n\nAn đặt 2 chiếc cốc lên bàn rồi chậm rãi bước lại gần bạn.";
    await plugin.complete(original);
    plugin.runModel.mockResolvedValue({ type: "success", result: rewritten });
    await plugin.rewrite();
    expect(plugin.chats.get("0:0")!.message.at(-1)!.data).toBe(rewritten);
    expect(plugin.api.alertError).not.toHaveBeenCalled();
  });

  it("waits for completed output instead of editing streamed display chunks", async () => {
    const plugin = await startPlugin();
    await plugin.request();
    for (const chunk of ["An", "An di chuyển", "An di chuyển tới."]) {
      await plugin.callbacks.display!(chunk);
    }
    expect(plugin.runModel).not.toHaveBeenCalled();
    plugin.runModel.mockResolvedValue({ type: "success", result: "An bước tới." });
    await plugin.complete("An di chuyển tới.");
    await plugin.callbacks.output!({
      characterIndex: 0,
      chatIndex: 0,
      messageIndex: 2,
      chat: structuredClone(plugin.chats.get("0:0")!),
      char: {},
    });
    expect(plugin.runModel).not.toHaveBeenCalled();
    await plugin.rewrite();
    expect(plugin.runModel).toHaveBeenCalledTimes(1);
  });

  it.each([
    { type: "fail", result: "API error" },
    { type: "success", result: "  " },
    { type: "multiline", result: [["char", "An bước tới."]] },
  ])("keeps the main response on unsuccessful or invalid result $type", async (result) => {
    const plugin = await startPlugin();
    await plugin.request();
    plugin.runModel.mockResolvedValue(result);
    await plugin.complete("An di chuyển tới.");
    await plugin.rewrite();
    expect(plugin.chats.get("0:0")!.message.at(-1)!.data).toBe("An di chuyển tới.");
    expect(plugin.writes).not.toHaveBeenCalled();
  });

  it("adds output with changed tags or numbers as a swipe without validation or confirmation", async () => {
    const original =
      "<pink:happy>An di chuyển tới.</pink:happy>\n§Cạch!§\n<!--GFX_START--><internal_states><b>Bond: 3</b></internal_states><!--GFX_END-->";
    for (const edited of [
      original.replace("di chuyển", "bước"),
      original.replace("pink:happy", "red:happy"),
      original.replace("Bond: 3", "Bond: 4"),
    ]) {
      const plugin = await startPlugin();
      await plugin.request();
      plugin.runModel.mockResolvedValue({ type: "success", result: edited });
      await plugin.complete(original);
      await plugin.rewrite();
      const saved = plugin.chats.get("0:0")!.message.at(-1)!;
      expect(saved.data).toBe(edited);
      expect(saved.swipes).toEqual([original, edited]);
      expect(saved.swipeId).toBe(1);
      expect(plugin.api.alertConfirm).not.toHaveBeenCalled();
    }
  });

  it("keeps independent request contexts when switching chats", async () => {
    const plugin = await startPlugin();
    await plugin.request([{ role: "user", content: "Context A" }]);
    plugin.selectChat(1);
    await plugin.request([{ role: "user", content: "Context B" }]);
    plugin.runModel.mockResolvedValue({ type: "success", result: "An bước tới." });
    await plugin.complete("An di chuyển tới.", 0);
    plugin.selectChat(0);
    await plugin.callbacks.output!({
      characterIndex: 0,
      chatIndex: 0,
      messageIndex: 2,
      chat: structuredClone(plugin.chats.get("0:0")!),
      char: {},
    });
    await plugin.rewrite();
    expect(plugin.runModel.mock.calls[0]![0].messages).toContainEqual({
      role: "user",
      content: "Context A",
    });
    expect(plugin.runModel.mock.calls[0]![0].messages).not.toContainEqual({
      role: "user",
      content: "Context B",
    });
    expect(plugin.chats.get("0:1")!.message).toHaveLength(1);
  });

  it("does not overwrite a message edited while the submodel is running", async () => {
    const plugin = await startPlugin();
    await plugin.request();
    plugin.runModel.mockImplementation(async () => {
      plugin.chats.get("0:0")!.message.at(-1)!.data = "Người dùng tự sửa.";
      return { type: "success", result: "An bước tới." };
    });
    await plugin.complete("An di chuyển tới.");
    await plugin.rewrite();
    expect(plugin.chats.get("0:0")!.message.at(-1)!.data).toBe("Người dùng tự sửa.");
    expect(plugin.writes).not.toHaveBeenCalled();
  });

  it("uses cumulative submodel stream chunks without repeating text", async () => {
    const plugin = await startPlugin();
    await plugin.request();
    plugin.runModel.mockResolvedValue({
      type: "streaming",
      result: new ReadableStream({
        start(controller) {
          controller.enqueue({ "0": "An" });
          controller.enqueue({ "0": "An bước tới." });
          controller.close();
        },
      }),
    });
    await plugin.complete("An di chuyển tới.");
    await plugin.rewrite();
    expect(plugin.chats.get("0:0")!.message.at(-1)!.data).toBe("An bước tới.");
  });

  it.each(["success", "streaming"])(
    "saves the edited response without the submodel's provider reasoning (%s)",
    async (type) => {
      const plugin = await startPlugin();
      await plugin.request();
      const edited = "<pink:happy>An bước tới.</pink:happy>";
      const result = `<Thoughts>\nI should improve Vietnamese wording.\n</Thoughts>\n\n${edited}`;
      plugin.runModel.mockResolvedValue(
        type === "success"
          ? { type, result }
          : {
              type,
              result: new ReadableStream({
                start(controller) {
                  controller.enqueue({ "0": "<Thoughts>\nI should" });
                  controller.enqueue({ "0": result });
                  controller.close();
                },
              }),
            },
      );
      await plugin.complete("<pink:happy>An di chuyển tới.</pink:happy>");
      await plugin.rewrite();
      expect(plugin.chats.get("0:0")!.message.at(-1)!.data).toBe(edited);
      expect(plugin.api.alertError).not.toHaveBeenCalled();
    },
  );

  it("preserves the original reasoning prefix and edits only the response body", async () => {
    const plugin = await startPlugin();
    await plugin.request();
    const prefix = "<Thoughts>\nMain model reasoning.\n</Thoughts>\n\n";
    plugin.runModel.mockResolvedValue({
      type: "success",
      result: "<think>Editor reasoning.</think>\n\nAn bước tới.",
    });
    await plugin.complete(prefix + "An di chuyển tới.");
    await plugin.rewrite();
    expect(plugin.chats.get("0:0")!.message.at(-1)!.data).toBe(prefix + "An bước tới.");
    expect(plugin.runModel.mock.calls[0]![0].messages.at(-1)!.content).not.toContain(
      "Main model reasoning.",
    );
  });

  it("appends a new selected swipe and keeps all existing alternatives intact", async () => {
    const plugin = await startPlugin();
    await plugin.request();
    await plugin.complete("An di chuyển tới.");
    const message = plugin.chats.get("0:0")!.message.at(-1)!;
    message.swipes = ["Bản khác.", message.data];
    message.swipeId = 1;
    plugin.runModel.mockResolvedValue({ type: "success", result: "An bước tới." });
    await plugin.rewrite();
    const saved = plugin.chats.get("0:0")!.message.at(-1)!;
    expect(saved.data).toBe("An bước tới.");
    expect(saved.swipes).toEqual(["Bản khác.", "An di chuyển tới.", "An bước tới."]);
    expect(saved.swipeId).toBe(2);
    saved.swipeId = 1;
    saved.data = saved.swipes![saved.swipeId]!;
    expect(saved.data).toBe("An di chuyển tới.");
    saved.swipeId = 2;
    saved.data = saved.swipes![saved.swipeId]!;
    expect(saved.data).toBe("An bước tới.");
  });

  it.each([{ swipes: [] }, { swipes: ["Bản khác."] }])(
    "preserves the current response missing from saved swipes: $swipes",
    async ({ swipes }) => {
      const plugin = await startPlugin();
      await plugin.request();
      const original = "An di chuyển tới.";
      await plugin.complete(original);
      plugin.chats.get("0:0")!.message.at(-1)!.swipes = swipes;
      plugin.runModel.mockResolvedValue({ type: "success", result: "An bước tới." });
      await plugin.rewrite();
      const saved = plugin.chats.get("0:0")!.message.at(-1)!;
      expect(saved.swipes).toEqual([...swipes, original, "An bước tới."]);
      expect(saved.swipeId).toBe(swipes.length + 1);
    },
  );

  it("saves polished header, HUD, GFX and state text while keeping the original swipe", async () => {
    const plugin = await startPlugin();
    await plugin.request();
    const original =
      '[ 🕰️ Thời gian 14:25 CH | 🗓️ Ngày 1 | 📍 Đại học | ☀️ Sunny, 20 °C ]\n<div class="card">Cảm thấy một cảm giác nhẹ nhõm.</div>\n<!--GFX_START--><internal_states><b>DC: 12 | Roll: 14 | Delta: +2</b>co gì phải sợ.</internal_states><!--GFX_END-->';
    const edited = original
      .replace("Sunny", "Nắng ráo")
      .replace("Cảm thấy một cảm giác nhẹ nhõm.", "Cảm thấy nhẹ nhõm.")
      .replace("co gì phải sợ.", "có gì phải sợ.");
    await plugin.complete(original);
    plugin.runModel.mockResolvedValue({ type: "success", result: edited });
    await plugin.rewrite();
    const saved = plugin.chats.get("0:0")!.message.at(-1)!;
    expect(saved.swipes).toEqual([original, edited]);
    expect(saved.data).toBe(edited);
    expect(plugin.api.alertConfirm).not.toHaveBeenCalled();
  });

  it("saves a syntax-changing result as a new swipe without requesting confirmation", async () => {
    const plugin = await startPlugin();
    await plugin.request();
    await plugin.complete("<pink:happy>An chào bạn.</pink:happy>");
    plugin.runModel.mockResolvedValue({ type: "success", result: "An chào bạn." });
    await plugin.rewrite();
    expect(plugin.api.alertConfirm).not.toHaveBeenCalled();
    expect(plugin.api.alertError).not.toHaveBeenCalled();
    expect(plugin.chats.get("0:0")!.message.at(-1)!.swipes).toEqual([
      "<pink:happy>An chào bạn.</pink:happy>",
      "An chào bạn.",
    ]);
    expect(plugin.writes).toHaveBeenCalledTimes(1);
  });

  it.each(["An bước tới. Bond: 3", "<pink:happy>An bước tới.</pink:happy> Bond: 4"])(
    "adds a syntax-changing edit immediately without calling the model again: %s",
    async (edited) => {
      const plugin = await startPlugin();
      await plugin.request();
      await plugin.complete("<pink:happy>An di chuyển tới.</pink:happy> Bond: 3");
      plugin.runModel.mockResolvedValue({ type: "success", result: edited });
      await plugin.rewrite();
      expect(plugin.chats.get("0:0")!.message.at(-1)!.data).toBe(edited);
      expect(plugin.runModel).toHaveBeenCalledTimes(1);
      expect(plugin.api.alertConfirm).not.toHaveBeenCalled();
      expect(plugin.api.alertError).not.toHaveBeenCalled();
    },
  );

  it("rechecks the selected swipe and preserves a swipe switch during editing", async () => {
    const plugin = await startPlugin();
    await plugin.request();
    await plugin.complete("<pink:happy>An di chuyển tới.</pink:happy>");
    const original = plugin.chats.get("0:0")!.message.at(-1)!.data;
    const message = plugin.chats.get("0:0")!.message.at(-1)!;
    message.swipes = [original, "Bản khác."];
    message.swipeId = 0;
    plugin.runModel.mockImplementation(async () => {
      message.swipeId = 1;
      message.data = message.swipes![1]!;
      return { type: "success", result: "An bước tới." };
    });
    await plugin.rewrite();
    expect(plugin.chats.get("0:0")!.message.at(-1)!.data).toBe("Bản khác.");
    expect(plugin.writes).not.toHaveBeenCalled();
  });

  it("adds even an unchanged result as a swipe and keeps all swipes on provider failure", async () => {
    const plugin = await startPlugin();
    await plugin.request();
    await plugin.complete("An chào bạn.");
    plugin.runModel.mockResolvedValue({ type: "success", result: "An chào bạn." });
    await plugin.rewrite();
    expect(plugin.chats.get("0:0")!.message.at(-1)!.swipes).toEqual([
      "An chào bạn.",
      "An chào bạn.",
    ]);
    plugin.runModel.mockResolvedValue({ type: "fail", result: "Provider unavailable" });
    await plugin.rewrite();
    expect(plugin.api.alertError).toHaveBeenCalledWith(
      expect.stringContaining("Provider unavailable"),
    );
    expect(plugin.writes).toHaveBeenCalledTimes(1);
  });

  it("checks that PocketRisu actually saved the rewritten message", async () => {
    const plugin = await startPlugin();
    await plugin.request();
    await plugin.complete("An di chuyển tới.");
    vi.spyOn(plugin.api, "setChatToIndex").mockResolvedValue(undefined);
    plugin.runModel.mockResolvedValue({ type: "success", result: "An bước tới." });
    await plugin.rewrite();
    expect(plugin.api.alertError).toHaveBeenCalledWith(expect.stringContaining("chưa lưu được"));
  });

  it("times out safely and ignores a late result", async () => {
    vi.useFakeTimers();
    const plugin = await startPlugin();
    await plugin.request();
    let resolveModel!: (result: unknown) => void;
    plugin.runModel.mockReturnValue(
      new Promise((resolve) => {
        resolveModel = resolve;
      }),
    );
    await plugin.complete("An di chuyển tới.");
    const output = plugin.rewrite();
    await vi.advanceTimersByTimeAsync(600_000);
    await output;
    resolveModel({ type: "success", result: "An bước tới." });
    await Promise.resolve();
    expect(plugin.chats.get("0:0")!.message.at(-1)!.data).toBe("An di chuyển tới.");
    expect(plugin.writes).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("unregisters the editor hook on unload", async () => {
    const plugin = await startPlugin();
    await plugin.callbacks.unload!();
    expect(plugin.api.removeRisuChatListener).toHaveBeenCalledWith(
      "output",
      plugin.callbacks.output,
    );
    expect(plugin.observer.disconnect).toHaveBeenCalled();
    expect(plugin.root.removeEventListener).toHaveBeenCalledWith("click", "click");
    expect(plugin.button()?.attached).not.toBe(true);
  });

  it("ignores unrelated clicks and supports keyboard activation", async () => {
    const plugin = await startPlugin();
    await plugin.request();
    await plugin.complete("An di chuyển tới.");
    await plugin.otherClick();
    expect(plugin.runModel).not.toHaveBeenCalled();
    plugin.runModel.mockResolvedValue({ type: "success", result: "An bước tới." });
    await plugin.enter();
    expect(plugin.runModel).toHaveBeenCalledTimes(1);
  });

  it("turns the icon into an interrupt button while rewriting", async () => {
    const plugin = await startPlugin();
    await plugin.request();
    await plugin.complete("An di chuyển tới.");
    let resolveModel!: (result: unknown) => void;
    const started = new Promise<void>((resolveStarted) => {
      plugin.runModel.mockImplementation(() => {
        resolveStarted();
        return new Promise((resolve) => {
          resolveModel = resolve;
        });
      });
    });
    const rewriting = plugin.rewrite();
    await started;
    expect(plugin.button()?.html).not.toContain("disabled");
    expect(plugin.button()?.html).toContain("⏹");
    await plugin.rewrite();
    expect(plugin.runModel).toHaveBeenCalledTimes(1);
    resolveModel({ type: "success", result: "An bước tới." });
    await rewriting;
    expect(plugin.chats.get("0:0")!.message.at(-1)!.data).toBe("An di chuyển tới.");
    expect(plugin.writes).not.toHaveBeenCalled();
    expect(plugin.button()?.html).toContain("✍️");
  });

  it("shows an inactive icon when a saved reply has no captured request context", async () => {
    const plugin = await startPlugin();
    await plugin.complete("Phản hồi có từ trước.");
    expect(plugin.button()?.html).toContain("disabled");
    await plugin.rewrite();
    expect(plugin.runModel).not.toHaveBeenCalled();
  });
});

describe("Named presets in plugin UI and requests", () => {
  it("closes unchanged or reverted settings without an unsaved warning", async () => {
    const plugin = await startPlugin(false);
    await plugin.settingsUi();
    await plugin.uiEvent("close");
    expect(plugin.api.hideContainer).toHaveBeenCalledTimes(1);
    expect(plugin.api.alertConfirm).not.toHaveBeenCalled();

    await plugin.settingsUi();
    const original = plugin.toggle("vietnamese-output").checked;
    plugin.toggle("vietnamese-output").checked = !original;
    plugin.toggle("vietnamese-output").checked = original;
    await plugin.uiEvent("close");
    expect(plugin.api.hideContainer).toHaveBeenCalledTimes(2);
    expect(plugin.api.alertConfirm).not.toHaveBeenCalled();
    await plugin.callbacks.unload!();
  });

  it("keeps an unsaved draft when closing is canceled and closes normally after saving", async () => {
    const plugin = await startPlugin(false);
    await plugin.settingsUi();
    plugin.toggle("image-optimization").checked = true;
    await plugin.uiEvent("close");
    expect(plugin.api.alertConfirm).toHaveBeenCalledWith(
      "Có thay đổi chưa lưu. Đóng và bỏ các thay đổi này?",
    );
    expect(plugin.api.hideContainer).not.toHaveBeenCalled();
    expect(plugin.toggle("image-optimization").checked).toBe(true);
    expect(
      (await plugin.request()).some((message) => message.memo === "ff54:image-optimization"),
    ).toBe(false);

    await plugin.uiEvent("save");
    await plugin.uiEvent("close");
    expect(plugin.api.alertConfirm).toHaveBeenCalledTimes(1);
    expect(plugin.api.hideContainer).toHaveBeenCalledTimes(1);
    expect(
      (await plugin.request()).some((message) => message.memo === "ff54:image-optimization"),
    ).toBe(true);
    await plugin.callbacks.unload!();
  });

  it.each(["sound-notifications", "submodel-editor", "master", "gemma-nsfw-level"])(
    "warns before discarding changes to %s without saving them",
    async (id) => {
      const plugin = await startPlugin(false);
      await plugin.settingsUi();
      const stored = structuredClone(plugin.storage.get(CONFIG_PRESETS_STORAGE_KEY));
      if (id === "gemma-nsfw-level") plugin.ui(id).value = "3";
      else {
        const input = id === "master" ? plugin.ui(id) : plugin.toggle(id);
        input.checked = !input.checked;
      }
      plugin.api.alertConfirm.mockResolvedValueOnce(true);
      await plugin.uiEvent("close");
      expect(plugin.api.alertConfirm).toHaveBeenCalledTimes(1);
      expect(plugin.api.hideContainer).toHaveBeenCalledTimes(1);
      expect(plugin.storage.get(CONFIG_PRESETS_STORAGE_KEY)).toEqual(stored);
      await plugin.settingsUi();
      await plugin.uiEvent("close");
      expect(plugin.api.alertConfirm).toHaveBeenCalledTimes(1);
      await plugin.callbacks.unload!();
    },
  );

  it("shows only one unsaved confirmation when Close is clicked repeatedly", async () => {
    const plugin = await startPlugin(false);
    await plugin.settingsUi();
    plugin.toggle("vietnamese-output").checked = false;
    let answer!: (confirmed: boolean) => void;
    plugin.api.alertConfirm.mockImplementationOnce(
      () =>
        new Promise<boolean>((resolve) => {
          answer = resolve;
        }),
    );
    const closing = plugin.uiEvent("close");
    await plugin.uiEvent("close");
    expect(plugin.api.alertConfirm).toHaveBeenCalledTimes(1);
    answer(false);
    await closing;
    expect(plugin.api.hideContainer).not.toHaveBeenCalled();
    await plugin.callbacks.unload!();
  });

  it("saves the image module per preset and restores its toggle after reload", async () => {
    const plugin = await startPlugin(false);
    await plugin.settingsUi();
    expect(plugin.toggle("image-optimization").checked).toBe(false);
    plugin.toggle("image-optimization").checked = true;
    expect(
      (await plugin.request()).some((message) => message.memo === "ff54:image-optimization"),
    ).toBe(false);
    await plugin.uiEvent("save");
    expect(
      (await plugin.request()).filter((message) => message.memo === "ff54:image-optimization"),
    ).toHaveLength(1);
    const reloaded = await startPlugin(
      false,
      false,
      plugin.storage.get(CONFIG_PRESETS_STORAGE_KEY),
    );
    await reloaded.settingsUi();
    expect(reloaded.toggle("image-optimization").checked).toBe(true);
    reloaded.toggle("image-optimization").checked = false;
    await reloaded.uiEvent("save");
    expect(
      (await reloaded.request()).some((message) => message.memo === "ff54:image-optimization"),
    ).toBe(false);
    await plugin.callbacks.unload!();
    await reloaded.callbacks.unload!();
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
    const reloaded = await startPlugin(true, false, plugin.storage.get(CONFIG_PRESETS_STORAGE_KEY));
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
    const store = normalizePresetStore(preset, undefined, { submodelEditorEnabled: true });
    const disabled = createConfigPreset(store, "Tắt FF5.4", store.presets[0]!.settings, "off");
    disabled.settings.enabled = false;
    selectCardPreset(store, "card-b", disabled.id);
    const plugin = await startPlugin(true, false, store);
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
    const plugin = await startPlugin(true, false, store);
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

  it("uses the generating card's editor configuration when output finishes after switching cards", async () => {
    const store = normalizePresetStore(preset, undefined);
    const automatic = createConfigPreset(store, "Tự sửa", store.presets[0]!.settings, "auto");
    automatic.settings.submodelEditorEnabled = true;
    automatic.settings.submodelAutoRewriteEnabled = true;
    selectCardPreset(store, "card-a", automatic.id);
    const plugin = await startPlugin(true, false, store);
    await plugin.request();
    plugin.selectCard(1);
    await plugin.request();
    const original =
      "[ 🕰️ 14:25 | 🗓️ Ngày 1 | 📍 Đại học | Nắng ]\nAn di chuyển tới.\n<internal_states>Bond: 3</internal_states>";
    plugin.runModel.mockResolvedValue({
      type: "success",
      result: original.replace("di chuyển", "bước"),
    });
    await plugin.complete(original, 0, 0);
    expect(plugin.runModel).toHaveBeenCalledTimes(1);
    expect(plugin.chats.get("0:0")!.message.at(-1)!.data).toContain("An bước tới.");
    expect(plugin.chats.get("1:0")!.message).toHaveLength(1);
    expect(
      plugin.runModel.mock.calls[0]![0].messages.find(
        (message) => message.memo === "ff54:submodel-editor",
      )!.content,
    ).toContain("Repair existing syntax errors only as supported by active schemas.");
  });
});

describe("Automatic Submodel editing", () => {
  const header = "[ 🕰️ Thời gian 14:25 CH | 🗓️ Ngày 1 | 📍 Đại học | ☀️ Nắng ráo, 20 °C ]";
  const state = "<!--GFX_START--><internal_states><b>Bond: 3</b></internal_states><!--GFX_END-->";
  const original = `${header}\nAn di chuyển tới.\n${state}`;
  const edited = `${header}\nAn bước tới.\n${state}`;

  it.each([
    "<think>Main reasoning.</think>\n",
    "<Thoughts>Main reasoning.</Thoughts>\nUnwrapped planning.\n",
  ])(
    "saves the automatic swipe after the history watcher removes reasoning: %s",
    async (prefix) => {
      vi.useFakeTimers();
      const plugin = await startPlugin(true, true, undefined, false, false, true);
      try {
        await plugin.request();
        let resolveModel!: (value: unknown) => void;
        const started = new Promise<void>((resolveStarted) => {
          plugin.runModel.mockImplementation(() => {
            resolveStarted();
            return new Promise((resolve) => {
              resolveModel = resolve;
            });
          });
        });
        const completing = plugin.complete(prefix + original);
        await started;
        await vi.advanceTimersByTimeAsync(250);
        const cleaned = structuredClone(plugin.chats.get("0:0")!.message.at(-1)!);
        expect(cleaned.data).not.toContain("Main reasoning.");
        expect(cleaned.data).toContain(original);
        const keptPrefix = cleaned.data.slice(0, cleaned.data.indexOf(header));
        resolveModel({ type: "success", result: edited });
        await completing;
        const saved = plugin.chats.get("0:0")!.message.at(-1)!;
        expect(saved.data).toBe(keptPrefix + edited);
        expect(saved.data).not.toContain("Main reasoning.");
        expect(saved.swipes).toEqual([prefix + original, keptPrefix + edited]);
        expect(saved.swipeId).toBe(1);
        expect(saved.ff54InternalState).toBe(state);
        expect(plugin.api.alert).toHaveBeenCalledWith(
          expect.stringContaining("Đã tự động biên tập"),
        );
        expect(plugin.api.alertError).not.toHaveBeenCalled();
        expect(plugin.runModel).toHaveBeenCalledTimes(1);
      } finally {
        await plugin.callbacks.unload!();
      }
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it.each([
    ["narrative", "An di chuyển tới.", "Người dùng sửa diễn biến."],
    ["header", "Đại học", "Nhà riêng"],
    ["internal state", "Bond: 3", "Bond: 5"],
  ])("keeps actual %s edits even after automatic history cleanup", async (_kind, from, to) => {
    vi.useFakeTimers();
    const plugin = await startPlugin(true, true, undefined, false, false, true);
    try {
      await plugin.request();
      let resolveModel!: (value: unknown) => void;
      const started = new Promise<void>((resolveStarted) => {
        plugin.runModel.mockImplementation(() => {
          resolveStarted();
          return new Promise((resolve) => {
            resolveModel = resolve;
          });
        });
      });
      const completing = plugin.complete(`<think>Main reasoning.</think>\n${original}`);
      await started;
      await vi.advanceTimersByTimeAsync(250);
      const current = plugin.chats.get("0:0")!.message.at(-1)!;
      current.data = current.data.replace(from!, to!);
      const changed = current.data;
      const writes = plugin.writes.mock.calls.length;
      resolveModel({ type: "success", result: edited });
      await completing;
      expect(plugin.chats.get("0:0")!.message.at(-1)!.data).toBe(changed);
      expect(plugin.chats.get("0:0")!.message.at(-1)!.swipes).toBeUndefined();
      expect(plugin.writes).toHaveBeenCalledTimes(writes);
      expect(plugin.api.alert).toHaveBeenCalledWith(expect.stringContaining("đã thay đổi"));
    } finally {
      await plugin.callbacks.unload!();
    }
    expect(vi.getTimerCount()).toBe(0);
  });

  it("rewrites completed eligible output automatically and notifies after verified saving", async () => {
    const plugin = await startPlugin(true, true);
    await plugin.request();
    const prefix = "<Thoughts>Main reasoning.</Thoughts>\nPlanning before the header.\n";
    plugin.runModel.mockResolvedValue({ type: "success", result: edited });
    await plugin.complete(prefix + original);
    expect(plugin.runModel).toHaveBeenCalledTimes(1);
    const options = plugin.runModel.mock.calls[0]![0];
    expect(options.mode).toBe("submodel");
    expect(options.allowPlugins).toBe(false);
    expect(options).not.toHaveProperty("staticModel");
    const source = options.messages.find(
      (message) => message.memo === "ff54:submodel-editor-source",
    )!;
    expect(source.content).toContain(original);
    expect(source.content).not.toContain("Main reasoning");
    expect(options.messages.at(-1)!.content).not.toContain(original);
    expect(
      options.messages.slice(0, -1).some((message) => message.content.includes(original)),
    ).toBe(true);
    expect(plugin.chats.get("0:0")!.message.at(-1)!.data).toBe(prefix + edited);
    expect(plugin.writes).toHaveBeenCalledTimes(1);
    expect(plugin.api.alert).toHaveBeenCalledWith(expect.stringContaining("Đã tự động biên tập"));
    expect(plugin.api.alertError).not.toHaveBeenCalled();
  });

  it("keeps the existing manual behavior when automatic editing is off", async () => {
    const plugin = await startPlugin();
    await plugin.request();
    plugin.runModel.mockResolvedValue({ type: "success", result: edited });
    await plugin.complete(original);
    expect(plugin.runModel).not.toHaveBeenCalled();
    await plugin.rewrite();
    expect(plugin.chats.get("0:0")!.message.at(-1)!.data).toBe(edited);
  });

  it("does not run when the Submodel module is disabled", async () => {
    const plugin = await startPlugin(false, true);
    await plugin.request();
    await plugin.complete(original);
    expect(plugin.runModel).not.toHaveBeenCalled();
  });

  it.each([
    `An di chuyển tới.\n${state}`,
    `${header}\nAn di chuyển tới.`,
    `${header}\nAn di chuyển tới.\n<internal_states>Bond: 3`,
    `${header}\nAn di chuyển tới.\n<internal_states></internal_states>`,
    original.replace("📍 Đại học", "📍 "),
  ])("skips a response missing a complete header or state block: %s", async (response) => {
    const plugin = await startPlugin(true, true);
    await plugin.request();
    await plugin.complete(response);
    expect(plugin.runModel).not.toHaveBeenCalled();
    expect(plugin.writes).not.toHaveBeenCalled();
  });

  it("waits for streaming to finish even if a display chunk contains the whole schema", async () => {
    const plugin = await startPlugin(true, true);
    await plugin.request();
    await plugin.callbacks.display!(original);
    expect(plugin.runModel).not.toHaveBeenCalled();
    plugin.chats.get("0:0")!.isStreaming = true;
    await plugin.complete(original);
    expect(plugin.runModel).not.toHaveBeenCalled();
    plugin.chats.get("0:0")!.isStreaming = false;
    plugin.runModel.mockResolvedValue({ type: "success", result: edited });
    await plugin.callbacks.output!({
      characterIndex: 0,
      chatIndex: 0,
      messageIndex: 2,
      chat: structuredClone(plugin.chats.get("0:0")!),
      char: {},
    });
    expect(plugin.runModel).toHaveBeenCalledTimes(1);
  });

  it("prevents repeat output events and manual clicks from launching another concurrent edit", async () => {
    const plugin = await startPlugin(true, true);
    await plugin.request();
    let resolveModel!: (result: unknown) => void;
    const started = new Promise<void>((resolveStarted) => {
      plugin.runModel.mockImplementation(() => {
        resolveStarted();
        return new Promise((resolve) => {
          resolveModel = resolve;
        });
      });
    });
    const completion = plugin.complete(original);
    await started;
    expect(plugin.button()?.html).not.toContain("disabled");
    expect(plugin.button()?.html).toContain("⏹");
    const repeat = () =>
      plugin.callbacks.output!({
        characterIndex: 0,
        chatIndex: 0,
        messageIndex: 2,
        chat: structuredClone(plugin.chats.get("0:0")!),
        char: {},
      });
    await repeat();
    await plugin.rewrite();
    expect(plugin.runModel).toHaveBeenCalledTimes(1);
    resolveModel({ type: "success", result: edited });
    await completion;
    await repeat();
    expect(plugin.runModel).toHaveBeenCalledTimes(1);
    expect(plugin.button()?.html).not.toContain("disabled");
    await plugin.request();
    plugin.runModel.mockResolvedValue({ type: "success", result: edited });
    await plugin.complete(original);
    expect(plugin.runModel).toHaveBeenCalledTimes(2);
  });

  it("does not edit older messages or replies without captured main context", async () => {
    const plugin = await startPlugin(true, true);
    await plugin.complete(original);
    expect(plugin.runModel).not.toHaveBeenCalled();
    await plugin.request();
    const chat = plugin.chats.get("0:0")!;
    chat.message.push({ role: "user", data: "Tiếp đi.", chatId: "next-user" });
    await plugin.callbacks.output!({
      characterIndex: 0,
      chatIndex: 0,
      messageIndex: 2,
      chat: structuredClone(chat),
      char: {},
    });
    expect(plugin.runModel).not.toHaveBeenCalled();
  });

  it("keeps user edits and never announces a successful save when the target changed", async () => {
    const plugin = await startPlugin(true, true);
    await plugin.request();
    plugin.runModel.mockImplementation(async () => {
      plugin.chats.get("0:0")!.message.at(-1)!.data = "Người dùng tự sửa.";
      return { type: "success", result: edited };
    });
    await plugin.complete(original);
    expect(plugin.writes).not.toHaveBeenCalled();
    expect(plugin.chats.get("0:0")!.message.at(-1)!.data).toBe("Người dùng tự sửa.");
    expect(plugin.api.alert).not.toHaveBeenCalledWith(
      expect.stringContaining("Đã tự động biên tập"),
    );
  });

  it("notifies on failure and keeps the main reply", async () => {
    const plugin = await startPlugin(true, true);
    await plugin.request();
    plugin.runModel.mockResolvedValue({ type: "fail", result: "Provider unavailable" });
    await plugin.complete(original);
    expect(plugin.chats.get("0:0")!.message.at(-1)!.data).toBe(original);
    expect(plugin.writes).not.toHaveBeenCalled();
    expect(plugin.api.alertError).toHaveBeenCalledWith(
      expect.stringContaining("Provider unavailable"),
    );
    expect(plugin.api.alert).not.toHaveBeenCalled();
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
    const plugin = await startPlugin(false, false, undefined, false, true);
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

  it.each(["success", "fail"])(
    "waits for auto editing and sounds once on %s before its alert closes",
    async (type) => {
      const plugin = await startPlugin(true, true, undefined, false, true);
      await plugin.request();
      let finish!: (value: unknown) => void;
      let started!: () => void;
      const waiting = new Promise<void>((resolve) => {
        started = resolve;
      });
      plugin.runModel.mockImplementation(() => {
        started();
        return new Promise((resolve) => {
          finish = resolve;
        });
      });
      const completion = plugin.complete(original);
      await waiting;
      expect(plugin.sounds).toEqual([]);
      const alert = type === "success" ? plugin.api.alert : plugin.api.alertError;
      let close!: () => void;
      let alerted!: () => void;
      const showing = new Promise<void>((resolve) => {
        alerted = resolve;
      });
      alert.mockImplementation(() => {
        alerted();
        return new Promise<void>((resolve) => {
          close = resolve;
        });
      });
      finish({ type, result: type === "success" ? original : "Provider failed" });
      await showing;
      expect(plugin.sounds).toEqual(type === "success" ? [660, 880] : [220, 160]);
      close();
      await completion;
      expect(plugin.sounds).toHaveLength(2);
      await plugin.callbacks.unload!();
    },
  );

  it("sounds for each manual rewrite, including failure", async () => {
    const plugin = await startPlugin(true, false, undefined, false, true);
    await plugin.request();
    await plugin.complete(original);
    plugin.runModel.mockResolvedValue({ type: "success", result: original });
    await plugin.rewrite();
    plugin.runModel.mockResolvedValue({ type: "fail", result: "Unavailable" });
    await plugin.rewrite();
    expect(plugin.sounds).toEqual([660, 880, 660, 880, 220, 160]);
    await plugin.callbacks.unload!();
  });

  it("sounds on a main failure without output, including when auto editing is enabled", async () => {
    vi.useFakeTimers();
    const plugin = await startPlugin(true, true, undefined, false, true);
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
    const plugin = await startPlugin(true, false, undefined, false, true);
    await plugin.request();
    plugin.selectCard(1);
    await vi.advanceTimersByTimeAsync(1500);
    expect(plugin.sounds).toEqual([]);
    await plugin.complete(original, 0, 0);
    expect(plugin.sounds).toEqual([660, 880]);
    await plugin.callbacks.unload!();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("sounds on submodel timeout and cancellation without saving late output", async () => {
    vi.useFakeTimers();
    const plugin = await startPlugin(true, false, undefined, false, true);
    await plugin.request();
    await plugin.complete(original);
    plugin.runModel.mockReturnValue(new Promise(() => {}));
    const timed = plugin.rewrite();
    await vi.advanceTimersByTimeAsync(600_000);
    await timed;
    expect(plugin.sounds).toEqual([660, 880, 220, 160]);
    const cancelled = plugin.rewrite();
    await vi.advanceTimersByTimeAsync(1);
    await plugin.rewrite();
    await cancelled;
    expect(plugin.sounds).toEqual([660, 880, 220, 160, 220, 160]);
    expect(plugin.writes).not.toHaveBeenCalled();
    await plugin.callbacks.unload!();
  });
});

describe("Sola V2 Flame plugin integration", () => {
  it("keeps Sola auto rewrite swipes valid when the watcher removes reasoning during editing", async () => {
    vi.useFakeTimers();
    const store = normalizePresetStore(preset, undefined, {
      submodelEditorEnabled: true,
      submodelAutoRewriteEnabled: true,
    });
    store.presets[0]!.settings = switchPresetFamily(
      store.presets[0]!.settings,
      sources.sola.preset,
    );
    const plugin = await startPlugin(true, true, store, false, false, true);
    const raw =
      '<scene_header location="Hall" time="13:20" />\nShe opens the door.\n<sola_hud><date>Day: 1</date></sola_hud>';
    const original = `<thinking>Main planning.</thinking>\nTask 0: Gamestate\n\n${raw}`;
    const edited = raw.replace("She opens the door.", "Cô mở cửa.");
    try {
      await plugin.request();
      plugin.runModel.mockImplementation(async () => {
        await vi.advanceTimersByTimeAsync(250);
        return { type: "success", result: `<reasoning>Editor planning.</reasoning>\n${edited}` };
      });
      await plugin.complete(original);
      expect(plugin.runModel).toHaveBeenCalledOnce();
      expect(plugin.runModel.mock.calls[0]![0].messages.at(-2)?.content).toBe(raw);
      const saved = plugin.chats.get("0:0")!.message.at(-1)!;
      expect(saved.data).toBe(edited);
      expect(saved.swipes).toEqual([original, edited]);
      expect(saved.swipeId).toBe(1);
      expect(plugin.api.alertError).not.toHaveBeenCalled();
    } finally {
      await plugin.callbacks.unload!();
    }
  });
  it("shows Global before full-version family choices and persists switching without losing Global", async () => {
    const plugin = await startPlugin(true, false, undefined, false, true);
    await plugin.settingsUi();
    const html = plugin.settingsHtml();
    expect(html.indexOf("<h2>Global</h2>")).toBeLessThan(html.indexOf("<h2>Bộ preset nền</h2>"));
    expect(html).toContain("Freaky Frankenstein 5.4");
    expect(html).toContain("Sola V2 Flame");
    expect(html.match(/name="preset-family"/g)).toHaveLength(2);
    await plugin.selectFamily("sola");
    const saved = plugin.storage.get(CONFIG_PRESETS_STORAGE_KEY) as {
      presets: Array<{
        settings: {
          presetFamily: string;
          submodelEditorEnabled: boolean;
          soundNotificationsEnabled: boolean;
        };
      }>;
    };
    expect(saved.presets[0]!.settings.presetFamily).toBe("sola");
    expect(saved.presets[0]!.settings.submodelEditorEnabled).toBe(true);
    expect(saved.presets[0]!.settings.soundNotificationsEnabled).toBe(true);
    expect(plugin.settingsHtml()).toContain("HUD tổng hợp trạng thái");
    expect(plugin.settingsHtml()).toContain("Chỉ số cảm xúc TFDY");
    expect(plugin.settingsHtml()).toContain("Header mở cảnh");
    expect(plugin.settingsHtml()).toContain("Nhân vật của card kể ở ngôi thứ nhất");
    expect(plugin.settingsHtml()).not.toContain("[Module]");
    expect(plugin.settingsHtml()).not.toContain("Pick 1");
    expect(plugin.settingsHtml()).not.toContain("Preset gốc không có chú thích");
    expect(plugin.settingsHtml()).not.toContain("Sola Saver:");
    expect(plugin.settingsHtml()).not.toContain("Chế độ Hiện thực");
    const request = await plugin.request();
    expect(request.map((m) => m.content).join("\n")).toContain("## Vietnamese Output");
  });

  it.each(["sola"] as const)(
    "auto-rewrites %s without FF5.4 header/state requirements and adds a new swipe",
    async (family) => {
      const store = normalizePresetStore(preset, undefined, {
        submodelEditorEnabled: true,
        submodelAutoRewriteEnabled: true,
      });
      store.presets[0]!.settings = switchPresetFamily(
        store.presets[0]!.settings,
        sources[family].preset,
      );
      const plugin = await startPlugin(true, true, store);
      await plugin.request([
        { role: "system", content: "Card and lore." },
        { role: "system", content: "Summary must not reach editor.", memo: "supaMemory" },
        { role: "user", content: "Tôi mở cửa.", memo: "user-a" },
      ]);
      const raw =
        '<scene_header location="Hall" time="13:20" />\n<copper:bite>"Come in."</copper>\n<sola_hud digest="Day 1"><date>Day: 1</date></sola_hud>';
      const edited = raw.replace("Come in.", "Vào đi.");
      plugin.runModel.mockResolvedValue({ type: "success", result: edited });
      await plugin.complete(raw);
      expect(plugin.runModel).toHaveBeenCalledOnce();
      const sent = plugin.runModel.mock.calls[0]![0].messages;
      const joined = sent.map((m) => m.content).join("\n");
      expect(joined).toContain("## Vietnamese Editor");
      expect(joined).not.toContain("<vietnamese_editor>");
      expect(joined).not.toContain("manga, anime, and light-novel pacing");
      expect(joined).not.toContain("Summary must not reach editor.");
      expect(sent.at(-2)).toMatchObject({ role: "assistant", content: raw });
      expect(sent.at(-1)?.role).toBe("user");
      const editorIndex = sent.findIndex(
        (message) => message.memo === `${pluginMemoPrefix(sources[family].preset)}submodel-editor`,
      );
      const postHistoryIndex = sent.findIndex((message) => message.memo === "vn-rp:sola:jailbreak");
      expect(editorIndex).toBeGreaterThan(-1);
      expect(editorIndex + 1).toBe(postHistoryIndex);
      const saved = plugin.chats.get("0:0")!.message.at(-1)!;
      expect(saved.swipes).toEqual([raw, edited]);
      expect(saved.data).toBe(edited);
      expect(saved.swipeId).toBe(1);
      expect(plugin.api.alert).toHaveBeenCalled();
    },
  );

  it("accepts a quiet Sola turn with no repeated header or changed HUD", async () => {
    const store = normalizePresetStore(preset, undefined, {
      submodelEditorEnabled: true,
      submodelAutoRewriteEnabled: true,
    });
    store.presets[0]!.settings = switchPresetFamily(
      store.presets[0]!.settings,
      sources.sola.preset,
    );
    const plugin = await startPlugin(true, true, store);
    await plugin.request();
    plugin.runModel.mockResolvedValue({ type: "success", result: 'Cô khép cửa. "Ngồi đi."' });
    await plugin.complete('She closes the door. "Sit down."');
    expect(plugin.runModel).toHaveBeenCalledOnce();
  });

  it.each(["sola_hud", "solatag", "tempo", "cabinet", "arrow", "omen"])(
    "does not auto-rewrite an unfinished Sola %s block",
    async (tag) => {
      const store = normalizePresetStore(preset, undefined, {
        submodelEditorEnabled: true,
        submodelAutoRewriteEnabled: true,
      });
      store.presets[0]!.settings = switchPresetFamily(
        store.presets[0]!.settings,
        sources.sola.preset,
      );
      const plugin = await startPlugin(true, true, store);
      await plugin.request();
      await plugin.complete(`A scene. <${tag}>unfinished`);
      expect(plugin.runModel).not.toHaveBeenCalled();
    },
  );

  it("does not auto-rewrite unbalanced nested Sola trackers", async () => {
    const store = normalizePresetStore(preset, undefined, {
      submodelEditorEnabled: true,
      submodelAutoRewriteEnabled: true,
    });
    store.presets[0]!.settings = switchPresetFamily(
      store.presets[0]!.settings,
      sources.sola.preset,
    );
    const plugin = await startPlugin(true, true, store);
    await plugin.request();
    await plugin.complete("A scene. <sola_hud><date><date>Day: 1</date></sola_hud>");
    expect(plugin.runModel).not.toHaveBeenCalled();
  });

  it("removes old Sola state from saved history into metadata as well as the request", async () => {
    const store = normalizePresetStore(preset, undefined);
    store.presets[0]!.settings = switchPresetFamily(
      store.presets[0]!.settings,
      sources.sola.preset,
    );
    const plugin = await startPlugin(false, false, store);
    const state = '<sola_hud digest="Day 1"><date>Day: 1</date></sola_hud>';
    const messages: ChatMessage[] = [
      { role: "assistant", content: `Old scene. ${state}`, memo: "old-a" },
      { role: "user", content: "First user.", memo: "u1" },
      { role: "assistant", content: `Recent scene. ${state}`, memo: "recent-a" },
      { role: "user", content: "Second user.", memo: "u2" },
      { role: "assistant", content: `Latest scene. ${state}`, memo: "latest-a" },
      { role: "user", content: "Next user.", memo: "u3" },
    ];
    plugin.chats.get("0:0")!.message = messages.map((message, index) => ({
      role: message.role === "assistant" ? "char" : "user",
      data: message.content,
      chatId: `saved-${index}`,
    }));
    const request = await plugin.request(messages);
    expect(request.find((m) => m.memo === "old-a")?.content).not.toContain("<sola_hud");
    const saved = plugin.chats.get("0:0")!.message[0]!;
    expect(saved.data).not.toContain("<sola_hud");
    expect(saved.solaHistory?.main?.removals.length).toBeGreaterThan(0);
    expect(restoreSolaHistoryContent(saved.data, saved.solaHistory?.main)).toBe(
      `Old scene. ${state}`,
    );
  });

  it("retains the latest Sola wardrobe in the request with an extra OOC user injection", async () => {
    const store = normalizePresetStore(preset, undefined);
    store.presets[0]!.settings = switchPresetFamily(
      store.presets[0]!.settings,
      sources.sola.preset,
    );
    const plugin = await startPlugin(false, false, store);
    const wardrobe = "<wardrobe>Áo đồng phục, váy xanh.</wardrobe>";
    const inventory = "<inventory>Bút chì, tập bản thảo.</inventory>";
    const hud = `<sola_hud digest="Ngày 1">${wardrobe}${inventory}<date>Ngày: 1</date></sola_hud>`;
    const messages: ChatMessage[] = [
      { role: "system", content: "[Start a new chat]" },
      { role: "user", content: "Bắt đầu cảnh.", memo: "user-a" },
      { role: "assistant", content: `Eriri đang vẽ. ${hud}`, memo: "reply-a" },
      { role: "user", content: "Tôi lại gần cô.", memo: "user-b" },
    ];
    plugin.chats.get("0:0")!.message = messages.slice(1).map((message) => ({
      role: message.role === "assistant" ? "char" : "user",
      data: message.content,
      chatId: message.memo!,
    }));
    const request = await plugin.request([
      ...messages,
      { role: "user", content: "{{DÙNG NHIỀU IMG KHÁC NHAU, CHỈ DÙNG TONE CÓ SẴN}}" },
    ]);
    expect(request.find((m) => m.memo === "reply-a")?.content).toContain(wardrobe);
    expect(request.find((m) => m.memo === "reply-a")?.content).toContain(inventory);
    expect(plugin.chats.get("0:0")!.message[1]!.data).toContain(hud);
  });

  it("restores an already archived latest wardrobe before requests and after branching/swiping", async () => {
    vi.useFakeTimers();
    const store = normalizePresetStore(preset, undefined);
    store.presets[0]!.settings = switchPresetFamily(
      store.presets[0]!.settings,
      sources.sola.preset,
    );
    const plugin = await startPlugin(false, false, store, false, false, true);
    const prefix =
      '<scene_header location="Phòng" time="16:30" />\nEriri đang vẽ.\n<sola_hud digest="Ngày 1">';
    const tail = "<date>Ngày: 1</date></sola_hud>";
    const visible = prefix + tail;
    const wardrobe = "<wardrobe>Áo đồng phục.</wardrobe><inventory>Bút chì.</inventory>";
    const altWardrobe = "<wardrobe>Áo khoác.</wardrobe><inventory>Điện thoại.</inventory>";
    const saved: SavedMessage = {
      role: "char",
      chatId: "reply-a",
      data: visible,
      swipes: [visible, visible],
      swipeId: 0,
      solaHistory: Object.fromEntries(
        [wardrobe, altWardrobe].map((text, index) => [
          `swipe:${index}`,
          { visible, removals: [{ offset: prefix.length, text }] },
        ]),
      ),
    };
    plugin.chats.get("0:0")!.message = [
      { role: "user", data: "Bắt đầu cảnh.", chatId: "user-a" },
      saved,
      { role: "user", data: "Tôi lại gần cô.", chatId: "user-b" },
    ];
    const request = await plugin.request([
      { role: "user", content: "Bắt đầu cảnh.", memo: "user-a" },
      { role: "assistant", content: visible, memo: "reply-a" },
      { role: "user", content: "Tôi lại gần cô.", memo: "user-b" },
      { role: "user", content: "OOC dùng nhiều ảnh." },
    ]);
    expect(request.find((m) => m.memo === "reply-a")?.content).toContain(wardrobe);
    expect(plugin.chats.get("0:0")!.message[1]!.data).toBe(prefix + wardrobe + tail);

    const archived = structuredClone(saved);
    archived.swipeId = 1;
    plugin.chats.set("0:1", {
      id: "branch-chat",
      message: [
        { role: "user", data: "Bắt đầu cảnh.", chatId: "user-a" },
        archived,
        { role: "user", data: "{{specialcomment::Đã tạo nhánh}}", chatId: "branch" },
      ],
    });
    plugin.selectChat(1);
    await vi.advanceTimersByTimeAsync(250);
    expect(plugin.chats.get("0:1")!.message[1]!.data).toBe(prefix + altWardrobe + tail);
    expect(plugin.chats.get("0:0")!.message[1]!.data).toBe(prefix + wardrobe + tail);
    await plugin.callbacks.unload!();
  });
});

describe("Submodel request context", () => {
  it("removes marked memory while keeping prompt order and cloning retained messages", () => {
    const summary: ChatMessage = {
      role: "system",
      content: "Memory và summary do host chọn.",
      memo: "supaMemory",
    };
    const card: ChatMessage = { role: "system", content: "Card và lore." };
    const user: ChatMessage = { role: "user", content: "Tiếp đi.", memo: "user" };
    const reply: ChatMessage = { role: "assistant", content: "Phản hồi trước.", memo: "reply" };
    const end: ChatMessage = { role: "user", content: "End injection.", memo: "ff54:end" };
    const module: ChatMessage = {
      role: "system",
      content: "Module.",
      memo: "ff54:absolute:1:0:system",
    };
    const request = [card, summary, user, module, reply, end];
    const references = buildEditorReferenceMessages(request);
    expect(references).toEqual([card, user, module, reply, end]);
    references[0]!.content = "Provider changed its copy";
    expect(request[0]!.content).toBe("Card và lore.");
    expect(request[1]!.content).toBe("Memory và summary do host chọn.");
    expect(buildEditorReferenceMessages(request)).toEqual([card, user, module, reply, end]);
  });

  it("removes memory wrappers without deleting other text from a merged system message", () => {
    const request: ChatMessage[] = [
      { role: "system", content: "Legacy memory.", memo: "hypaMemory" },
      {
        role: "system",
        content:
          "<Previous Conversation>[Roleplay Summary]\n<Past Events Summary>Old memory.</Past Events Summary></Previous Conversation>",
      },
      {
        role: "system",
        content:
          "Card rules.\n[Roleplay Summary]\n<Past Events Summary>Memory.</Past Events Summary>\nLore rules.",
      },
      { role: "system", content: "The character has a good memory." },
      { role: "user", content: "<Past Events Summary>User text.</Past Events Summary>" },
    ];
    expect(buildEditorReferenceMessages(request)).toEqual([
      { role: "system", content: "Card rules.\n\nLore rules." },
      request[3],
      request[4],
    ]);
  });

  it("excludes the target before selecting two prior AI responses and their user inputs", () => {
    const history: ChatMessage[] = [
      { role: "user", content: "Old user.", memo: "u0" },
      { role: "assistant", content: "Old response.", memo: "a0" },
      { role: "user", content: "First user.", memo: "u1" },
      { role: "assistant", content: "Repeated response.", memo: "a1" },
      { role: "user", content: "Second user.", memo: "u2" },
      { role: "assistant", content: "Repeated response.", memo: "a2" },
      { role: "user", content: "Current user.", memo: "u3" },
      { role: "assistant", content: "Target response.", memo: "target" },
    ];
    const example: ChatMessage = {
      role: "assistant",
      content: "Card example.",
      name: "example_assistant",
    };
    const injection: ChatMessage = {
      role: "user",
      content: "Reasoning prompt.",
      memo: "ff54:absolute:0:100:user",
    };
    const request = [example, ...history, injection];
    expect(
      buildEditorReferenceMessages(
        request,
        "target",
        history.map((message) => message.memo!),
      ),
    ).toEqual([example, ...history.slice(2, -1), injection]);
    expect(request).toHaveLength(10);
  });

  it("keeps only the latest user input when no prior AI response is available", () => {
    const first: ChatMessage = { role: "user", content: "Older input.", memo: "first" };
    const second: ChatMessage = { role: "user", content: "Current input.", memo: "second" };
    expect(buildEditorReferenceMessages([first, second])).toEqual([second]);
  });
});
