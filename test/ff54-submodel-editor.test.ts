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

async function startPlugin(enabled = true) {
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
        return Number(match?.[1]) === chats.get(`0:${selectedChat}`)!.message.length - 1
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
      getItem: async () => (enabled ? { submodelEditorEnabled: true } : {}),
      setItem: async () => {},
    },
    registerButton: async () => ({ id: "ff54" }),
    unregisterUIPart: async () => {},
    getCurrentCharacterIndex: async () => 0,
    getCurrentChatIndex: async () => selectedChat,
    getCharacter: async () => ({ name: "An", chatPage: selectedChat, chats: [] }),
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
    async request(
      messages: ChatMessage[] = [
        { role: "system", content: "Card, lore và memory." },
        { role: "user", content: "Chào An.", memo: "user-a" },
      ],
    ) {
      return callbacks.beforeRequest!(messages, "model");
    },
    complete(original: string, chatIndex = selectedChat) {
      const chat = chats.get(`0:${chatIndex}`)!;
      const messageIndex = chat.message.length;
      chat.message.push({
        role: "char",
        data: original,
        chatId: `reply-${chatIndex}-${messageIndex}`,
      });
      return callbacks.output!({
        characterIndex: 0,
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
  });

  it("uses the selected submodel with complete main context and saved history", async () => {
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
    expect(references.filter((message) => message.memo !== "old-a")).toEqual(snapshot);
    expect(references.filter((message) => message.memo === "old-a")).toHaveLength(1);
    expect(references.filter((message) => message.memo === "user-a")).toHaveLength(1);
    expect(options.messages.at(-1)!.content).not.toContain(
      "Sự kiện cũ không còn trong request main.",
    );
    expect(options.messages.at(-1)!.content).not.toContain("Complete saved chat history");
    expect(plugin.chats.get("0:0")!.message.at(-1)!.data).toBe("An bước tới, nhẹ giọng chào bạn.");
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

describe("Submodel reference history", () => {
  it("restores missing turns once and keeps interleaved module prompts in place", () => {
    const old: ChatMessage = { role: "assistant", content: "Sự kiện cũ.", memo: "old" };
    const user: ChatMessage = { role: "user", content: "Tiếp đi.", memo: "user" };
    const reply: ChatMessage = { role: "assistant", content: "Phản hồi trước.", memo: "reply" };
    const end: ChatMessage = { role: "user", content: "End injection.", memo: "ff54:end" };
    const module: ChatMessage = {
      role: "system",
      content: "Module.",
      memo: "ff54:absolute:1:0:system",
    };
    const history = [old, user, reply];
    const request = [user, module, reply, end];
    expect(buildEditorReferenceMessages(request, history, history, "target")).toEqual([
      old,
      user,
      module,
      reply,
      end,
    ]);
    expect(request).toEqual([user, module, reply, end]);
  });

  it("keeps identical dialogue from distinct messages while removing duplicate message IDs", () => {
    const first: ChatMessage = { role: "user", content: "Ừ.", memo: "first" };
    const second: ChatMessage = { role: "user", content: "Ừ.", memo: "second" };
    const history = [first, second];
    expect(
      buildEditorReferenceMessages([first, first, second], history, history, "target"),
    ).toEqual(history);
  });
});
