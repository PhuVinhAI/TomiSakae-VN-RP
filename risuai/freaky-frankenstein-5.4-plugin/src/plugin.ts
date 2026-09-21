import {
  applyRegexScripts,
  buildRequestMessages,
  createDefaultSettings,
  expandHostMacros,
  normalizeSettings,
  PLACEMENT_AI_OUTPUT,
  type ChatMessage,
  type FfGlobalSettings,
  type FfPreset,
} from "./core.js";

declare const Risuai: {
  registerButton(
    options: {
      name: string;
      icon: string;
      iconType: "html" | "img" | "none";
      location?: "action" | "chat" | "hamburger";
      id?: string;
    },
    callback: () => void,
  ): Promise<{ id: string }>;
  unregisterUIPart(id: string): Promise<void>;
  showContainer(mode: "fullscreen"): Promise<void>;
  hideContainer(): Promise<void>;
  getCharacter(): Promise<HostCharacter | null>;
  getDatabase(includeOnly?: string[] | "all"): Promise<HostDatabase | null>;
  addRisuReplacer(
    type: "beforeRequest",
    callback: (messages: ChatMessage[], type: string) => Promise<ChatMessage[]>,
  ): Promise<void>;
  removeRisuReplacer(
    type: "beforeRequest",
    callback: (messages: ChatMessage[], type: string) => Promise<ChatMessage[]>,
  ): Promise<void>;
  addRisuScriptHandler(
    type: "display",
    callback: (content: string) => Promise<string>,
  ): Promise<void>;
  removeRisuScriptHandler(
    type: "display",
    callback: (content: string) => Promise<string>,
  ): Promise<void>;
  onUnload(callback: () => Promise<void> | void): Promise<void>;
  pluginStorage: {
    getItem<T>(key: string): Promise<T | null>;
    setItem<T>(key: string, value: T): Promise<void>;
  };
};

interface HostChat {
  bindedPersona?: string;
}

interface HostCharacter {
  name?: string;
  nickname?: string;
  chatPage?: number;
  chats?: HostChat[];
}

interface HostPersona {
  id?: string;
  name?: string;
}

interface HostDatabase {
  maxContext?: number;
  maxResponse?: number;
  personas?: HostPersona[];
  selectedPersona?: number;
}

declare const __FF54_PRESET__: FfPreset;
declare const __FF54_SOURCE_NAME__: string;
declare const __FF54_SOURCE_SHA256__: string;

const STORAGE_KEY = "ff54-global-settings-v1";
const BUTTON_ID = "ff54-global-config";
const preset = __FF54_PRESET__;
let settings: FfGlobalSettings = createDefaultSettings(preset);

function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function orderEntries() {
  return preset.prompt_order[0]?.order ?? [];
}

function promptById() {
  return new Map(preset.prompts.map((prompt) => [prompt.identifier, prompt]));
}

async function saveSettings(): Promise<void> {
  await Risuai.pluginStorage.setItem(STORAGE_KEY, settings);
}

function checkbox(
  kind: "prompt" | "regex",
  id: string,
  checked: boolean,
  label: string,
  detail: string,
): string {
  return `<label class="toggle-row">
    <input type="checkbox" data-kind="${kind}" data-id="${escapeHtml(id)}" ${checked ? "checked" : ""}>
    <span class="toggle-copy"><strong>${escapeHtml(label)}</strong><small>${escapeHtml(detail)}</small></span>
  </label>`;
}

async function showSettings(): Promise<void> {
  const prompts = promptById();
  const promptRows = orderEntries()
    .map((entry) => {
      const prompt = prompts.get(entry.identifier);
      return checkbox(
        "prompt",
        entry.identifier,
        settings.promptEnabled[entry.identifier] === true,
        prompt?.name || entry.identifier,
        `${entry.identifier} · source ${entry.enabled === false ? "OFF" : "ON"}`,
      );
    })
    .join("");
  const regexRows = (preset.extensions?.regex_scripts ?? [])
    .map((script) =>
      checkbox(
        "regex",
        script.id,
        settings.regexEnabled[script.id] === true,
        script.scriptName || script.id,
        `${script.id} · source ${script.disabled ? "OFF" : "ON"}`,
      ),
    )
    .join("");

  document.head.innerHTML = `<meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    :root{color-scheme:dark;font-family:Inter,system-ui,sans-serif;background:#111318;color:#f4f4f5}
    *{box-sizing:border-box}body{margin:0;background:#111318;color:#f4f4f5}.shell{max-width:980px;margin:auto;padding:22px}
    header{position:sticky;top:0;z-index:2;background:rgba(17,19,24,.94);backdrop-filter:blur(12px);padding:10px 0 18px;border-bottom:1px solid #30333b}
    h1{font-size:1.6rem;margin:0 0 6px}.sub{color:#a5a7ae;font-size:.86rem;word-break:break-all}.bar{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}
    button{border:1px solid #414552;background:#242730;color:#fff;border-radius:9px;padding:10px 14px;cursor:pointer;font-weight:650}button.primary{background:#7c3aed;border-color:#8b5cf6}
    .master{display:flex;align-items:center;gap:12px;padding:14px;border:1px solid #4c3a75;background:#211b31;border-radius:12px;margin:18px 0}.master input{width:21px;height:21px}
    details{border:1px solid #30333b;border-radius:12px;margin:12px 0;background:#181a20;overflow:hidden}summary{cursor:pointer;padding:15px 16px;font-weight:750;background:#20232b}
    .list{padding:8px 14px 14px}.toggle-row{display:flex;gap:12px;align-items:flex-start;padding:11px 4px;border-bottom:1px solid #292c34}.toggle-row:last-child{border-bottom:0}.toggle-row input{margin-top:3px;width:18px;height:18px}.toggle-copy{display:flex;flex-direction:column;min-width:0}.toggle-copy strong{font-size:.96rem}.toggle-copy small{color:#8d9098;font-size:.73rem;word-break:break-all;margin-top:3px}
    .note{color:#c8cad0;line-height:1.5;font-size:.9rem}.status{min-height:1.2em;color:#a7f3d0;font-size:.85rem;margin-top:10px}
  </style>`;
  document.body.innerHTML = `<main class="shell">
    <header><h1>FF5.4</h1><div class="sub">Global configuration · ${escapeHtml(__FF54_SOURCE_NAME__)} · SHA-256 ${escapeHtml(__FF54_SOURCE_SHA256__)}</div>
      <div class="bar"><button id="close">Close</button><button id="reset">Reset source defaults</button><button class="primary" id="save">Save globally</button></div><div class="status" id="status"></div>
    </header>
    <label class="master"><input id="master" type="checkbox" ${settings.enabled ? "checked" : ""}><span><strong>Enable FF5.4 globally</strong><br><span class="note">One shared setting for every card and chat. Only the currently active generation is transformed.</span></span></label>
    <details open><summary>Prompt modules (${orderEntries().length})</summary><div class="list">${promptRows}</div></details>
    <details><summary>Regex scripts (${preset.extensions?.regex_scripts?.length ?? 0})</summary><div class="list">${regexRows}</div></details>
  </main>`;

  const status = document.getElementById("status")!;
  const readUi = () => {
    settings.enabled = (document.getElementById("master") as HTMLInputElement).checked;
    for (const node of document.querySelectorAll<HTMLInputElement>("input[data-kind]")) {
      const id = node.dataset.id!;
      if (node.dataset.kind === "prompt") settings.promptEnabled[id] = node.checked;
      else settings.regexEnabled[id] = node.checked;
    }
  };
  document.getElementById("close")!.addEventListener("click", () => void Risuai.hideContainer());
  document.getElementById("save")!.addEventListener("click", async () => {
    readUi();
    await saveSettings();
    status.textContent = "Saved. The global configuration now applies to every card and chat.";
  });
  document.getElementById("reset")!.addEventListener("click", async () => {
    settings = createDefaultSettings(preset);
    await saveSettings();
    await showSettings();
    document.getElementById("status")!.textContent = "Restored all source toggle defaults.";
  });
  await Risuai.showContainer("fullscreen");
}

function mainGeneration(type: string): boolean {
  return type === "model";
}

async function getHostMacroContext(): Promise<{
  characterName: string;
  maxContext?: number;
  maxResponse?: number;
  userName: string;
}> {
  const [character, database] = await Promise.all([
    Risuai.getCharacter(),
    Risuai.getDatabase(["personas", "selectedPersona", "maxContext", "maxResponse"]),
  ]);
  const characterName = character?.nickname || character?.name || "Character";
  const activeChat = character?.chats?.[character.chatPage ?? 0];
  const boundPersona = activeChat?.bindedPersona
    ? database?.personas?.find((persona) => persona.id === activeChat.bindedPersona)
    : undefined;
  const selectedPersona = database?.personas?.[database.selectedPersona ?? 0];
  const userName = boundPersona?.name || selectedPersona?.name || "User";
  return {
    characterName,
    maxContext: database?.maxContext,
    maxResponse: database?.maxResponse,
    userName,
  };
}

const beforeRequest = async (messages: ChatMessage[], type: string): Promise<ChatMessage[]> => {
  if (!settings.enabled || !mainGeneration(type)) return messages;
  const macroContext = await getHostMacroContext();
  return buildRequestMessages(messages, preset, settings, async (content) =>
    expandHostMacros(content, macroContext),
  );
};

const displayOutput = async (content: string): Promise<string> => {
  if (!settings.enabled) return content;
  return applyRegexScripts(content, preset, settings, {
    placement: PLACEMENT_AI_OUTPUT,
    markdown: true,
    depth: 0,
  });
};

void (async () => {
  settings = normalizeSettings(preset, await Risuai.pluginStorage.getItem(STORAGE_KEY));
  const button = await Risuai.registerButton(
    { name: "FF5.4", icon: "⚡", iconType: "html", location: "chat", id: BUTTON_ID },
    () => void showSettings(),
  );
  await Risuai.addRisuReplacer("beforeRequest", beforeRequest);
  await Risuai.addRisuScriptHandler("display", displayOutput);
  await Risuai.onUnload(async () => {
    await Risuai.removeRisuReplacer("beforeRequest", beforeRequest);
    await Risuai.removeRisuScriptHandler("display", displayOutput);
    await Risuai.unregisterUIPart(button.id);
  });
})();
