import {
  adaptDisplayMarkupForRisuAI,
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
import {
  allExclusivePromptIds,
  allSectionPromptIds,
  EXCLUSIVE_PROMPT_GROUPS,
  HOST_MARKER_IDS,
  normalizeExclusivePromptGroups,
  PROMPT_SECTIONS,
  promptUiCopy,
  regexUiName,
  SOURCE_SEPARATOR_IDS,
  type ExclusivePromptGroup,
} from "./ui-vi.js";

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
  kind: "plugin" | "prompt" | "regex",
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

function sourceState(enabled: boolean): string {
  return enabled ? "Mặc định bật" : "Mặc định tắt";
}

function selectedGroupPrompt(group: ExclusivePromptGroup): string {
  const enabled = group.memberIds.filter((identifier) => settings.promptEnabled[identifier]);
  if (enabled.length <= 1) return enabled[0] ?? "";
  const defaults = new Map(
    orderEntries().map((entry) => [entry.identifier, entry.enabled !== false]),
  );
  return enabled.find((identifier) => defaults.get(identifier)) ?? enabled.at(-1) ?? "";
}

function exclusiveGroup(
  group: ExclusivePromptGroup,
  prompts: Map<string, FfPreset["prompts"][number]>,
): string {
  const selected = selectedGroupPrompt(group);
  const offOption = `<option value="" data-detail="${escapeHtml(group.offDescription)}" ${selected ? "" : "selected"}>${escapeHtml(group.offLabel)}</option>`;
  const options = group.memberIds
    .map((identifier) => {
      const prompt = prompts.get(identifier);
      if (!prompt) return "";
      const copy = promptUiCopy(prompt);
      const sourceEnabled =
        orderEntries().find((entry) => entry.identifier === identifier)?.enabled !== false;
      return `<option value="${escapeHtml(identifier)}" data-detail="${escapeHtml(copy.description)}" ${selected === identifier ? "selected" : ""}>${escapeHtml(copy.name)} · ${sourceState(sourceEnabled)}</option>`;
    })
    .join("");
  const selectedPrompt = selected ? prompts.get(selected) : undefined;
  const selectedDescription = selectedPrompt
    ? promptUiCopy(selectedPrompt).description
    : group.offDescription;
  return `<article class="choice-card">
    <label for="choice-${escapeHtml(group.id)}"><strong>${escapeHtml(group.label)}</strong><span>${escapeHtml(group.description)}</span></label>
    <select id="choice-${escapeHtml(group.id)}" data-kind="choice" data-group="${escapeHtml(group.id)}">${offOption}${options}</select>
    <p class="choice-detail" data-choice-detail="${escapeHtml(group.id)}">${escapeHtml(selectedDescription)}</p>
  </article>`;
}

const REGEX_GROUPS = [
  {
    label: "Ngữ cảnh gửi model",
    ids: [
      "639d32b7-1eae-413a-9e11-98e41eb033a8",
      "3fbb6c80-ab8f-4a21-8221-62c9f8546306",
      "99f0756c-bfba-486f-916f-34e3cfb59e21",
      "c6296c37-0daf-4ca0-a953-e9a99e1f3973",
      "14a69f3b-da50-4179-9522-33d2b9b9c160",
    ],
  },
  {
    label: "Sửa và ẩn nội dung khi hiển thị",
    ids: [
      "303311d2-4cd1-41aa-b77f-b7a83ade99ef",
      "bae307db-8f0d-46df-be61-967a3756ac19",
      "a81268ec-1839-4bd1-9a55-b2065fe49a97",
      "f66b4d6b-8dee-45b6-b6ff-41ec26902888",
      "ef99245c-ffe5-434c-b08c-fe68aa95e2c3",
    ],
  },
  {
    label: "Lời thoại",
    ids: [
      "762be9ae-c455-49a3-ad22-f53f3e25cd72",
      "399b2f87-35e2-427c-ae2e-cf1559f9af2f",
      "b32b68fe-45d5-4f98-82c1-2792efc4e6c2",
      "bf6fb7cc-d66b-4baa-954f-1b25f48aeba0",
      "558f7f1a-3879-4142-b084-0a29708f5c4c",
    ],
  },
  {
    label: "Giao diện trạng thái",
    ids: [
      "d891fcd6-bb78-4689-9333-7d7403ab3046",
      "de2df883-b2f1-4bf9-87ff-b9e1aedfdfa9",
      "16e58a66-8a08-4e40-9858-85c4751c603a",
      "8a90620b-0f21-48e5-bbbd-219349581e06",
      "e26f86f8-9f1e-453b-93e5-63968bfd42fd",
      "201bea14-6779-40a1-8629-caf4a5dff61f",
      "6b738a23-221b-41f3-985e-30ad3dc3de97",
      "22c9dbcc-889e-4656-98e0-8bf4144e68c2",
      "cd20d4a1-95c9-406b-a30e-4cfb2ccf24df",
      "b8809bf1-91ff-48af-bec2-10e006f81593",
    ],
  },
] as const;

async function showSettings(): Promise<void> {
  const prompts = promptById();
  const groupedPromptIds = new Set([
    ...allExclusivePromptIds(),
    ...allSectionPromptIds(),
    ...SOURCE_SEPARATOR_IDS,
    ...HOST_MARKER_IDS,
  ]);
  const ungroupedPromptIds = orderEntries()
    .map((entry) => entry.identifier)
    .filter((identifier) => !groupedPromptIds.has(identifier));
  const choiceGroups = EXCLUSIVE_PROMPT_GROUPS.map((group) => exclusiveGroup(group, prompts)).join(
    "",
  );
  const sections = [
    ...PROMPT_SECTIONS,
    ...(ungroupedPromptIds.length > 0
      ? [
          {
            id: "other",
            label: "Module khác",
            description: "Module mới từ preset nguồn chưa có nhóm riêng trong giao diện.",
            promptIds: ungroupedPromptIds,
            open: false,
          },
        ]
      : []),
  ];
  const promptSections = sections
    .map((section) => {
      const rows = section.promptIds
        .map((identifier) => {
          const prompt = prompts.get(identifier);
          if (!prompt) return "";
          const entry = orderEntries().find((candidate) => candidate.identifier === identifier);
          const copy = promptUiCopy(prompt);
          return checkbox(
            "prompt",
            identifier,
            settings.promptEnabled[identifier] === true,
            copy.name,
            `${copy.description} · ${sourceState(entry?.enabled !== false)}`,
          );
        })
        .join("");
      return `<details ${section.open ? "open" : ""}><summary><span>${escapeHtml(section.label)}</span><small>${escapeHtml(section.description)}</small></summary><div class="list">${rows}</div></details>`;
    })
    .join("");
  const regexMap = new Map(
    (preset.extensions?.regex_scripts ?? []).map((script) => [script.id, script]),
  );
  const regexGroups = REGEX_GROUPS.map((group) => {
    const rows = group.ids
      .map((identifier) => {
        const script = regexMap.get(identifier);
        if (!script) return "";
        return checkbox(
          "regex",
          identifier,
          settings.regexEnabled[identifier] === true,
          regexUiName(script),
          `${sourceState(!script.disabled)} · Quy tắc kỹ thuật của preset gốc`,
        );
      })
      .join("");
    return `<section class="mini-group"><h3>${escapeHtml(group.label)}</h3>${rows}</section>`;
  }).join("");

  document.head.innerHTML = `<meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    :root{color-scheme:dark;font-family:Inter,system-ui,sans-serif;background:#111318;color:#f4f4f5}
    *{box-sizing:border-box}body{margin:0;background:#111318;color:#f4f4f5}.shell{max-width:980px;margin:auto;padding:18px}
    header{position:sticky;top:0;z-index:2;background:rgba(17,19,24,.96);backdrop-filter:blur(12px);padding:8px 0 14px;border-bottom:1px solid #30333b}
    h1{font-size:1.45rem;margin:0 0 5px}.sub{color:#a5a7ae;font-size:.78rem;overflow-wrap:anywhere}.bar{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
    button{min-height:42px;border:1px solid #414552;background:#242730;color:#fff;border-radius:9px;padding:9px 13px;cursor:pointer;font-weight:650}button.primary{background:#7c3aed;border-color:#8b5cf6}
    .master{display:flex;align-items:flex-start;gap:12px;padding:13px;border:1px solid #4c3a75;background:#211b31;border-radius:12px;margin:14px 0}.master input{flex:0 0 auto;width:21px;height:21px;margin-top:2px}
    .section-title{font-size:1.08rem;margin:20px 2px 8px}.section-note{color:#a5a7ae;font-size:.84rem;line-height:1.45;margin:0 2px 10px}
    .choice-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.choice-card{border:1px solid #30333b;background:#181a20;border-radius:12px;padding:13px;min-width:0}.choice-card label{display:flex;flex-direction:column;gap:4px}.choice-card label span,.choice-detail{color:#a5a7ae;font-size:.78rem;line-height:1.42}.choice-card select{width:100%;min-height:44px;margin-top:10px;border:1px solid #454957;border-radius:9px;background:#242730;color:#fff;padding:8px 36px 8px 10px;font:inherit}.choice-detail{margin:9px 1px 0;color:#c4c6cc}
    details{border:1px solid #30333b;border-radius:12px;margin:10px 0;background:#181a20;overflow:hidden}summary{cursor:pointer;padding:13px 14px;font-weight:750;background:#20232b;display:flex;flex-direction:column;gap:3px}summary small{color:#999ca4;font-size:.74rem;font-weight:450;line-height:1.35}
    .list{padding:5px 12px 10px}.toggle-row{display:flex;gap:11px;align-items:flex-start;padding:10px 3px;border-bottom:1px solid #292c34;min-height:48px}.toggle-row:last-child{border-bottom:0}.toggle-row input{flex:0 0 auto;margin-top:3px;width:19px;height:19px}.toggle-copy{display:flex;flex-direction:column;min-width:0}.toggle-copy strong{font-size:.91rem;line-height:1.3}.toggle-copy small{color:#9a9da5;font-size:.75rem;line-height:1.4;margin-top:3px}
    .mini-group{border-bottom:1px solid #30333b;padding:5px 12px 8px}.mini-group:last-child{border-bottom:0}.mini-group h3{font-size:.86rem;color:#c4b5fd;margin:9px 3px 3px}.note{color:#c8cad0;line-height:1.45;font-size:.84rem}.status{min-height:1.2em;color:#a7f3d0;font-size:.82rem;margin-top:8px}
    @media(max-width:640px){.shell{padding:10px}header{padding-top:4px}.choice-grid{grid-template-columns:1fr}.bar{display:grid;grid-template-columns:1fr 1fr}.bar button{width:100%}.bar .primary{grid-column:1/-1;grid-row:1}.master{margin:10px 0}.section-title{margin-top:16px}details{border-radius:10px}summary{padding:12px}.list{padding:4px 9px 8px}.toggle-row{padding:10px 2px}.choice-card{padding:12px}.choice-card select{font-size:16px}}
  </style>`;
  document.body.innerHTML = `<main class="shell">
    <header><h1>Cấu hình FF5.4</h1><div class="sub">Cấu hình chung cho mọi thẻ nhân vật và cuộc trò chuyện · ${escapeHtml(__FF54_SOURCE_NAME__)} · SHA-256 ${escapeHtml(__FF54_SOURCE_SHA256__)}</div>
      <div class="bar"><button class="primary" id="save">Lưu toàn cục</button><button id="reset">Khôi phục mặc định</button><button id="close">Đóng</button></div><div class="status" id="status"></div>
    </header>
    <label class="master"><input id="master" type="checkbox" ${settings.enabled ? "checked" : ""}><span><strong>Bật FF5.4 trên toàn bộ RisuAI</strong><br><span class="note">Một cấu hình dùng chung cho mọi thẻ nhân vật và cuộc trò chuyện. Tiện ích chỉ can thiệp khi mô hình đang tạo phản hồi.</span></span></label>
    <details open><summary><span>Module của plugin</span><small>Tính năng bổ sung riêng cho bản RisuAI.</small></summary><div class="list">${checkbox(
      "plugin",
      "vietnamese-output",
      settings.vietnameseOutputEnabled,
      "🇻🇳 Đầu ra tiếng Việt",
      "Viết tiếng Việt tự nhiên; bản địa hóa mẫu và từ vựng có thể đi vào phản hồi ở mọi CoT liên quan · Mặc định bật",
    )}</div></details>
    <h2 class="section-title">Nhóm chọn một</h2><p class="section-note">Mỗi nhóm chỉ kích hoạt một lựa chọn. Chọn “không dùng” để tắt toàn bộ nhóm.</p><div class="choice-grid">${choiceGroups}</div>
    <h2 class="section-title">Module độc lập</h2>${promptSections}
    <details><summary><span>Bộ lọc kỹ thuật (${preset.extensions?.regex_scripts?.length ?? 0})</span><small>Các bộ lọc gốc dùng khi gửi ngữ cảnh và hiển thị phản hồi. Chỉ nên thay đổi khi hiểu rõ biểu thức tương ứng.</small></summary><div class="regex-groups">${regexGroups}</div></details>
  </main>`;

  const status = document.getElementById("status")!;
  const readUi = () => {
    settings.enabled = (document.getElementById("master") as HTMLInputElement).checked;
    for (const node of document.querySelectorAll<HTMLSelectElement>('select[data-kind="choice"]')) {
      const group = EXCLUSIVE_PROMPT_GROUPS.find(
        (candidate) => candidate.id === node.dataset.group,
      );
      if (!group) continue;
      for (const identifier of group.memberIds) settings.promptEnabled[identifier] = false;
      if (node.value) settings.promptEnabled[node.value] = true;
    }
    for (const node of document.querySelectorAll<HTMLInputElement>("input[data-kind]")) {
      const id = node.dataset.id!;
      if (node.dataset.kind === "prompt") settings.promptEnabled[id] = node.checked;
      else if (node.dataset.kind === "regex") settings.regexEnabled[id] = node.checked;
      else if (id === "vietnamese-output") settings.vietnameseOutputEnabled = node.checked;
    }
  };
  for (const node of document.querySelectorAll<HTMLSelectElement>('select[data-kind="choice"]')) {
    node.addEventListener("change", () => {
      const detail = document.querySelector<HTMLElement>(
        `[data-choice-detail="${node.dataset.group}"]`,
      );
      const option = node.selectedOptions[0];
      if (detail && option) detail.textContent = option.dataset.detail ?? "";
    });
  }
  document.getElementById("close")!.addEventListener("click", () => void Risuai.hideContainer());
  document.getElementById("save")!.addEventListener("click", async () => {
    readUi();
    await saveSettings();
    status.textContent =
      "Đã lưu. Cấu hình này đang áp dụng cho mọi thẻ nhân vật và cuộc trò chuyện.";
  });
  document.getElementById("reset")!.addEventListener("click", async () => {
    settings = createDefaultSettings(preset);
    await saveSettings();
    await showSettings();
    document.getElementById("status")!.textContent =
      "Đã khôi phục toàn bộ lựa chọn mặc định của preset gốc.";
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
  return adaptDisplayMarkupForRisuAI(
    applyRegexScripts(content, preset, settings, {
      placement: PLACEMENT_AI_OUTPUT,
      markdown: true,
      depth: 0,
    }),
  );
};

void (async () => {
  settings = normalizeSettings(preset, await Risuai.pluginStorage.getItem(STORAGE_KEY));
  normalizeExclusivePromptGroups(settings, orderEntries());
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
