import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { build } from "esbuild";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  normalizeSettings,
  type ChatMessage,
  type FfPreset,
} from "../risuai/freaky-frankenstein-5.4-plugin/src/core.js";
import { buildEditorReferenceMessages } from "../risuai/freaky-frankenstein-5.4-plugin/src/submodel-context.js";
import {
  CONFIG_PRESETS_STORAGE_KEY,
  createConfigPreset,
  normalizePresetStore,
  selectCardPreset,
} from "../risuai/freaky-frankenstein-5.4-plugin/src/presets.js";

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

interface ModelOptions {
  mode: string;
  messages: ChatMessage[];
  allowPlugins: boolean;
  staticModel?: string;
}

let bundled = "";
let preset: FfPreset;

beforeAll(async () => {
  const raw = await readFile(
    "risuai/freaky-frankenstein-5.4-plugin/source/ff54-sillytavern-preset.json",
    "utf8",
  );
  preset = JSON.parse(raw) as FfPreset;
  const result = await build({
    entryPoints: ["risuai/freaky-frankenstein-5.4-plugin/src/plugin.ts"],
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

async function startPlugin(enabled = true, automatic = false, savedPresets?: unknown) {
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
        ? { submodelEditorEnabled: true, submodelAutoRewriteEnabled: automatic }
        : { submodelAutoRewriteEnabled: automatic },
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
  const writes = vi.fn();
  let checked = false;
  let focused = false;
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
    addRisuReplacer: async (_type: string, callback: typeof callbacks.beforeRequest) => {
      callbacks.beforeRequest = callback;
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
    alertConfirm: vi.fn<(message: string) => Promise<boolean>>().mockResolvedValue(false),
    alertError: vi.fn().mockResolvedValue(undefined),
    getRootDocument: async () => root,
    createMutationObserver: async () => observer,
  };
  runInNewContext(bundled, {
    Risuai: api,
    structuredClone,
    setTimeout,
    clearTimeout,
    crypto: { randomUUID: () => `test-${storage.size}-${Math.random()}` },
    document: uiDocument,
    console: { warn: vi.fn() },
  });
  await initialized;

  return {
    callbacks,
    chats,
    runModel,
    writes,
    api,
    root,
    observer,
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
      return callbacks.beforeRequest!(messages, "model");
    },
    complete(original: string, chatIndex = selectedChat, characterIndex = selectedCharacter) {
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
  it("defaults existing saves to off and preserves an explicitly saved toggle", () => {
    expect(normalizeSettings(preset, {}).submodelEditorEnabled).toBe(false);
    expect(normalizeSettings(preset, { submodelEditorEnabled: true }).submodelEditorEnabled).toBe(
      true,
    );
    expect(normalizeSettings(preset, {}).submodelAutoRewriteEnabled).toBe(false);
    expect(
      normalizeSettings(preset, { submodelAutoRewriteEnabled: true }).submodelAutoRewriteEnabled,
    ).toBe(true);
  });

  it("uses the selected submodel with the exact captured main request and no restored history", async () => {
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
    const references = options.messages.slice(0, -2);
    expect(references).toEqual(snapshot);
    expect(references.filter((message) => message.memo === "old-a")).toHaveLength(0);
    expect(references.filter((message) => message.memo === "user-a")).toHaveLength(1);
    expect(options.messages.at(-1)!.content).not.toContain(
      "Sự kiện cũ không còn trong request main.",
    );
    expect(options.messages.at(-1)!.content).not.toContain("Complete saved chat history");
    expect(plugin.chats.get("0:0")!.message.at(-1)!.data).toBe("An bước tới, nhẹ giọng chào bạn.");
    expect(plugin.api.alert).toHaveBeenCalledWith(expect.stringContaining("Đã biên tập"));
  });

  it("does not call submodel when the toggle is off", async () => {
    const plugin = await startPlugin(false);
    await plugin.request();
    await plugin.complete("An chào bạn.");
    expect(plugin.runModel).not.toHaveBeenCalled();
  });

  it("excludes the current reply from a captured main request when regenerating in place", async () => {
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
    expect(messages.slice(0, -1).some((message) => message.content.includes(original))).toBe(false);
    expect(messages.at(-1)!.content).toContain(original);
    expect(messages.some((message) => message.memo === "current-reply")).toBe(false);
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
    const target = plugin.runModel.mock.calls[0]![0].messages.at(-1)!.content;
    expect(target).toContain(header + "\nAn di chuyển tới.");
    expect(target).not.toContain("Main reasoning.");
    expect(target).not.toContain("Unwrapped planning");
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
    { type: "success", result: "```text\nAn bước tới.\n```" },
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

  it("preserves markup and rejects changed tags or numeric state", async () => {
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
      expect(plugin.chats.get("0:0")!.message.at(-1)!.data).toBe(
        edited === original.replace("di chuyển", "bước") ? edited : original,
      );
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

  it("updates the selected swipe and keeps other alternatives intact", async () => {
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
    expect(saved.swipes).toEqual(["Bản khác.", "An bước tới."]);
    expect(saved.swipeId).toBe(1);
  });

  it("offers to save a syntax-changing edit and keeps the original when declined", async () => {
    const plugin = await startPlugin();
    await plugin.request();
    await plugin.complete("<pink:happy>An chào bạn.</pink:happy>");
    plugin.runModel.mockResolvedValue({ type: "success", result: "An chào bạn." });
    await plugin.rewrite();
    expect(plugin.api.alertConfirm).toHaveBeenCalledWith(expect.stringContaining("vẫn lưu"));
    expect(plugin.api.alertError).not.toHaveBeenCalled();
    expect(plugin.chats.get("0:0")!.message.at(-1)!.data).toBe(
      "<pink:happy>An chào bạn.</pink:happy>",
    );
    expect(plugin.writes).not.toHaveBeenCalled();
  });

  it.each(["An bước tới. Bond: 3", "<pink:happy>An bước tới.</pink:happy> Bond: 4"])(
    "saves an approved syntax-changing edit without calling the model again: %s",
    async (edited) => {
      const plugin = await startPlugin();
      await plugin.request();
      await plugin.complete("<pink:happy>An di chuyển tới.</pink:happy> Bond: 3");
      plugin.api.alertConfirm.mockResolvedValue(true);
      plugin.runModel.mockResolvedValue({ type: "success", result: edited });
      await plugin.rewrite();
      expect(plugin.chats.get("0:0")!.message.at(-1)!.data).toBe(edited);
      expect(plugin.runModel).toHaveBeenCalledTimes(1);
      expect(plugin.api.alertError).not.toHaveBeenCalled();
    },
  );

  it("rechecks the message after approving an edit and preserves intervening user changes", async () => {
    const plugin = await startPlugin();
    await plugin.request();
    await plugin.complete("<pink:happy>An di chuyển tới.</pink:happy>");
    plugin.runModel.mockResolvedValue({ type: "success", result: "An bước tới." });
    plugin.api.alertConfirm.mockImplementation(async () => {
      plugin.chats.get("0:0")!.message.at(-1)!.data = "Người dùng tự sửa khi đang xác nhận.";
      return true;
    });
    await plugin.rewrite();
    expect(plugin.chats.get("0:0")!.message.at(-1)!.data).toBe(
      "Người dùng tự sửa khi đang xác nhận.",
    );
    expect(plugin.writes).not.toHaveBeenCalled();
  });

  it("reports an unchanged response and provider errors", async () => {
    const plugin = await startPlugin();
    await plugin.request();
    await plugin.complete("An chào bạn.");
    plugin.runModel.mockResolvedValue({ type: "success", result: "An chào bạn." });
    await plugin.rewrite();
    expect(plugin.api.alert).toHaveBeenCalledWith(expect.stringContaining("không thay đổi"));
    plugin.runModel.mockResolvedValue({ type: "fail", result: "Provider unavailable" });
    await plugin.rewrite();
    expect(plugin.api.alertError).toHaveBeenCalledWith(
      expect.stringContaining("Provider unavailable"),
    );
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
    await vi.advanceTimersByTimeAsync(90_000);
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

  it("disables the icon and prevents repeat clicks while rewriting", async () => {
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
    expect(plugin.button()?.html).toContain("disabled");
    expect(plugin.button()?.html).toContain("⏳");
    await plugin.rewrite();
    expect(plugin.runModel).toHaveBeenCalledTimes(1);
    resolveModel({ type: "success", result: "An bước tới." });
    await rewriting;
    expect(plugin.button()?.html).not.toContain("disabled");
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
    expect(plugin.runModel.mock.calls[0]![0].messages.at(-2)!.content).toContain(
      "Repair only existing malformed markup",
    );
  });
});

describe("Automatic Submodel editing", () => {
  const header = "[ 🕰️ Thời gian 14:25 CH | 🗓️ Ngày 1 | 📍 Đại học | ☀️ Nắng ráo, 20 °C ]";
  const state = "<!--GFX_START--><internal_states><b>Bond: 3</b></internal_states><!--GFX_END-->";
  const original = `${header}\nAn di chuyển tới.\n${state}`;
  const edited = `${header}\nAn bước tới.\n${state}`;

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
    expect(options.messages.at(-1)!.content).toContain(original);
    expect(options.messages.at(-1)!.content).not.toContain("Main reasoning");
    expect(
      options.messages.slice(0, -1).some((message) => message.content.includes(original)),
    ).toBe(false);
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
    expect(plugin.button()?.html).toContain("disabled");
    expect(plugin.button()?.html).toContain("⏳");
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

describe("Submodel request context", () => {
  it("clones the already-cut request without restoring missing history", () => {
    const summary: ChatMessage = {
      role: "system",
      content: "Memory và summary do host chọn.",
      memo: "summary",
    };
    const user: ChatMessage = { role: "user", content: "Tiếp đi.", memo: "user" };
    const reply: ChatMessage = { role: "assistant", content: "Phản hồi trước.", memo: "reply" };
    const end: ChatMessage = { role: "user", content: "End injection.", memo: "ff54:end" };
    const module: ChatMessage = {
      role: "system",
      content: "Module.",
      memo: "ff54:absolute:1:0:system",
    };
    const request = [summary, user, module, reply, end];
    const references = buildEditorReferenceMessages(request, "target");
    expect(references).toEqual(request);
    references[0]!.content = "Provider changed its copy";
    expect(request[0]!.content).toBe("Memory và summary do host chọn.");
    expect(buildEditorReferenceMessages(request, "reply")).toEqual([summary, user, module, end]);
  });

  it("preserves the original request order and duplicate messages", () => {
    const first: ChatMessage = { role: "user", content: "Ừ.", memo: "first" };
    const second: ChatMessage = { role: "user", content: "Ừ.", memo: "second" };
    expect(buildEditorReferenceMessages([first, first, second], undefined)).toEqual([
      first,
      first,
      second,
    ]);
  });
});
