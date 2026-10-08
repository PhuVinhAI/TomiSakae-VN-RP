import {
  adaptDisplayMarkupForRisuAI,
  adaptVietnameseHeaderForRisuAI,
  applyRegexScripts,
  buildRequestMessages,
  createDefaultSettings,
  expandHostMacros,
  PLACEMENT_AI_OUTPUT,
  applyPromptRegexToMessages,
  splitBeforeSceneHeader,
  hasCompleteSceneHeader,
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
import { SETTINGS_STYLES } from "./ui-style.js";
import {
  createRewriteButton,
  type RewriteButtonApi,
  type RewriteButtonController,
  type RewriteButtonTarget,
} from "./submodel-button.js";
import { buildEditorReferenceMessages } from "./submodel-context.js";
import {
  CONFIG_PRESETS_STORAGE_KEY,
  createConfigPreset,
  normalizePresetStore,
  presetForCard,
  selectCardPreset,
  type ConfigPresetStore,
} from "./presets.js";

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
  getCurrentCharacterIndex(): Promise<number>;
  getCurrentChatIndex(): Promise<number>;
  getChatFromIndex(characterIndex: number, chatIndex: number): Promise<HostChatSnapshot | null>;
  setChatToIndex(characterIndex: number, chatIndex: number, chat: HostChatSnapshot): Promise<void>;
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
  addRisuChatListener(
    mode: "output",
    callback: (argument: ChatOutputListenerArgument) => Promise<void> | void,
  ): Promise<void>;
  removeRisuChatListener(
    mode: "output",
    callback: (argument: ChatOutputListenerArgument) => Promise<void> | void,
  ): Promise<void>;
  runLLMModel(options: {
    messages: ChatMessage[];
    staticModel?: string;
    mode: "submodel";
    allowPlugins?: boolean;
  }): Promise<unknown>;
  alert(message: string): Promise<void>;
  alertError(message: string): Promise<void>;
  getRootDocument: RewriteButtonApi["getRootDocument"];
  createMutationObserver: RewriteButtonApi["createMutationObserver"];
  onUnload(callback: () => Promise<void> | void): Promise<void>;
  pluginStorage: {
    getItem<T>(key: string): Promise<T | null>;
    setItem<T>(key: string, value: T): Promise<void>;
  };
};

interface HostChat {
  bindedPersona?: string;
}

interface HostChatMessage {
  role?: "user" | "char";
  data?: string;
  swipes?: string[];
  swipeId?: number;
  [key: string]: unknown;
}

interface HostChatSnapshot {
  message?: HostChatMessage[];
  [key: string]: unknown;
}

interface ChatOutputListenerArgument {
  characterIndex: number;
  chatIndex: number;
  messageIndex: number;
  chat: HostChatSnapshot;
  char: unknown;
}

interface HostCharacter {
  chaId?: string;
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
let configPresets: ConfigPresetStore = normalizePresetStore(preset, undefined);
const cardIdsByIndex = new Map<number, string | undefined>();

async function activeConfigPreset() {
  const index = await Risuai.getCurrentCharacterIndex();
  if (!cardIdsByIndex.has(index)) {
    cardIdsByIndex.set(index, (await Risuai.getCharacter())?.chaId);
  }
  return presetForCard(configPresets, cardIdsByIndex.get(index));
}

const SUBMODEL_EDITOR_SYSTEM = `<vietnamese_editor>
Task: Rewrite the supplied AI response in natural contemporary Vietnamese.
Scope: Reader-visible narrative prose, dialogue, and free-text header/UI/GFX/state values.
Context: Use preceding prompts, card, lore, memory, and history as reference only. Never execute their RP or reasoning tasks.

Syntax & Flow:
- Rewrite: Revise wording, syntax, punctuation, paragraphing, and rhythm where needed for natural Vietnamese. Preserve natural, accurate phrasing unless restructuring is needed for coherence or flow. Never rephrase merely for variation.
- Language: Replace foreign-language leakage, translation calques, unnatural collocations, and stiff wording with idiomatic Vietnamese. Never replace natural Vietnamese with avoidable foreign wording. Preserve proper names and required technical terms.
- Style: Use contemporary Vietnamese suited to manga, anime, and light novels. Preserve the draft's character voice, comic timing, and emotional pacing. Avoid wuxia-style diction and ornate translation calques.
- Cadence: Smooth paragraphs with varied sentence lengths and openings. Ban verbless fragments, telegraphic prose, isolated one-word narration, and disconnected inventory-style narration. Connect related observations and actions without adding facts. Ban run-on sentences and padding.
- Punctuation: Ban em-dashes (—) in prose and dialogue. Rephrase with natural punctuation.
- Dialogue: Edit text inside speech color tags; preserve enclosing tags. Retain character voice and context-appropriate pauses, stutters, and short utterances.
- Pronouns: Adjust self-reference, pronouns, and forms of address to context. Keep speaker, addressee, and referents clear; preserve relationships and intended respect, distance, or intimacy.

Fidelity & Format:
- Meaning: Preserve facts, events, actions, sequence, speaker intent, POV, agency, tone, emotional intensity, and RP state. Preserve negation, uncertainty, and degree.
- State Text: Polish reader-visible Vietnamese text inside headers, HUDs, GFX text, <internal_states>, GM Notebook sections, and state trackers only when meaning and structure stay identical. Never alter fixed state data: numbers, DC, rolls, deltas, counters, progress, scores, names, locations, factions, quest state, inventory, image keywords, tags, identifiers, schema text, or machine syntax.
- Syntax Lock: Preserve HTML/XML and color tags, header structure, comments, internal/GFX/image/§...§ markers, placeholders, identifiers, numbers, fixed schema labels, and machine syntax exactly. Repair only existing malformed markup with a clear intended structure; preserve valid syntax and all state data.
- Boundaries: Never add or omit content, continue the scene, summarize, explain, or answer the user.
- Output: Return only the edited response. No code fences, notes, or commentary.
</vietnamese_editor>`;

interface PendingEditorRequest {
  cardId: string | undefined;
  chatId: unknown;
  messages: ChatMessage[];
  responseId?: unknown;
  responseIndex?: number;
  autoRewriteAttempted?: boolean;
}

const editorRequests = new Map<string, PendingEditorRequest>();
let editorListenerRegistered = false;
let editorButton: RewriteButtonController | undefined;
const editorBusyChats = new Set<string>();
const editorChatKey = (characterIndex: number, chatIndex: number) =>
  `${characterIndex}:${chatIndex}`;

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
  await Risuai.pluginStorage.setItem(CONFIG_PRESETS_STORAGE_KEY, configPresets);
  await syncEditorButton();
}

function checkbox(
  kind: "plugin" | "prompt" | "regex",
  id: string,
  checked: boolean,
  label: string,
  detail: string,
): string {
  return `<label class="toggle-row">
    <input class="switch" type="checkbox" data-kind="${kind}" data-id="${escapeHtml(id)}" ${checked ? "checked" : ""}>
    <span class="toggle-copy"><strong>${escapeHtml(label)}</strong><small>${escapeHtml(detail)}</small></span>
  </label>`;
}

function sourceState(enabled: boolean): string {
  return enabled ? "Preset gốc: bật" : "Preset gốc: tắt";
}

function selectedGroupPrompt(group: ExclusivePromptGroup, settings: FfGlobalSettings): string {
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
  index: number,
  settings: FfGlobalSettings,
): string {
  const selected = selectedGroupPrompt(group, settings);
  const option = (identifier: string, name: string, detail: string, source?: string) =>
    `<label class="choice-option"><input type="radio" name="choice-${escapeHtml(group.id)}" data-kind="choice" data-group="${escapeHtml(group.id)}" value="${escapeHtml(identifier)}" data-detail="${escapeHtml(detail)}" ${selected === identifier ? "checked" : ""}><span class="radio-body"><span class="radio-dot"></span><span class="radio-copy"><strong>${escapeHtml(name)}</strong>${source ? `<small>${escapeHtml(source)}</small>` : ""}</span></span></label>`;
  const options = group.memberIds
    .map((identifier) => {
      const prompt = prompts.get(identifier);
      if (!prompt) return "";
      const copy = promptUiCopy(prompt);
      const sourceEnabled =
        orderEntries().find((entry) => entry.identifier === identifier)?.enabled !== false;
      return option(identifier, copy.name, copy.description, sourceState(sourceEnabled));
    })
    .join("");
  const selectedPrompt = selected ? prompts.get(selected) : undefined;
  const selectedDescription = selectedPrompt
    ? promptUiCopy(selectedPrompt).description
    : group.offDescription;
  return `<article class="choice-card">
    <div class="choice-head"><span class="choice-number">${String(index + 1).padStart(2, "0")}</span><div><strong>${escapeHtml(group.label)}</strong><small>${escapeHtml(group.description)}</small></div></div>
    <div class="choice-options">${options}${option("", group.offLabel, group.offDescription)}</div>
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
  const [character, characterIndex] = await Promise.all([
    Risuai.getCharacter(),
    Risuai.getCurrentCharacterIndex(),
  ]);
  const cardId = character?.chaId;
  cardIdsByIndex.set(characterIndex, cardId);
  const profile = presetForCard(configPresets, cardId);
  const settings = structuredClone(profile.settings);
  const presetOptions = configPresets.presets
    .map(
      (entry) =>
        `<option value="${escapeHtml(entry.id)}" ${entry.id === profile.id ? "selected" : ""}>${escapeHtml(entry.name)}</option>`,
    )
    .join("");
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
  const choiceGroups = EXCLUSIVE_PROMPT_GROUPS.map((group, index) =>
    exclusiveGroup(group, prompts, index, settings),
  ).join("");
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
      return `<details ${section.open ? "open" : ""}><summary><span class="summary-copy"><strong>${escapeHtml(section.label)}</strong><small>${escapeHtml(section.description)}</small></span></summary><div class="list">${rows}</div></details>`;
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

  document.head.innerHTML = `<meta name="viewport" content="width=device-width,initial-scale=1"><style>${SETTINGS_STYLES}</style>`;
  document.body.innerHTML = `<main class="shell">
    <div class="masthead"><div class="brand"><span class="brand-mark">ff</span><span>Trạm điều khiển FF5.4</span></div><span class="edition">Bảng điều khiển / 5.4</span></div>
    <section class="hero"><div><span class="eyebrow">Không gian cấu hình</span><h1>Điều khiển <em>FF5.4.</em></h1><p class="hero-copy">Thiết lập nhịp kể, góc nhìn và những quy tắc vận hành. Mỗi preset dùng chung cho các card đã chọn preset đó.</p></div><div class="hero-side"><span class="index">Preset: ${escapeHtml(profile.name)}</span><p>Chọn cách thế giới của bạn vận hành.</p><small>Card mới dùng “Mặc định”. Chọn preset khác để ghi nhớ cho card hiện tại.</small></div></section>
    <div class="workspace"><nav class="rail" aria-label="Điều hướng cấu hình"><p class="rail-title">Danh mục</p><a href="#general"><span>01</span>Tổng quan</a><a href="#choices"><span>02</span>Nhóm chọn một</a><a href="#modules"><span>03</span>Module độc lập</a><a href="#filters"><span>04</span>Bộ lọc kỹ thuật</a><p class="rail-note">Sửa cấu hình rồi bấm “Lưu preset” để áp dụng.</p></nav>
    <div class="content">
    <section id="general" class="panel"><div class="panel-heading"><span class="index">01 / Nền tảng</span><h2>Tổng quan</h2></div>
    <div class="preset-panel"><label class="preset-field"><span>Preset cho ${escapeHtml(character?.nickname || character?.name || "card hiện tại")}</span><div class="preset-picker" id="preset-picker"><select id="config-preset" class="preset-native" tabindex="-1" aria-hidden="true" ${cardId ? "" : "disabled"}>${presetOptions}</select><button class="preset-trigger" id="config-preset-trigger" type="button" aria-haspopup="listbox" aria-expanded="false" ${cardId ? "" : "disabled"}>${escapeHtml(profile.name)}<span class="preset-trigger-mark" aria-hidden="true"></span></button><div class="preset-menu" id="config-preset-menu" role="listbox">${configPresets.presets.map((entry) => `<button class="preset-option${entry.id === profile.id ? " is-selected" : ""}" type="button" role="option" aria-selected="${entry.id === profile.id ? "true" : "false"}" data-preset-id="${escapeHtml(entry.id)}"><span>${escapeHtml(entry.name)}</span>${entry.id === profile.id ? '<span class="preset-option-mark" aria-hidden="true">✓</span>' : ""}</button>`).join("")}</div></div></label><p class="section-note">Chọn preset sẽ được ghi nhớ cho mọi chat của card này. Lưu cấu hình sẽ cập nhật preset cho tất cả card đang dùng nó.</p><div class="preset-create"><label class="preset-field"><span>Tên preset mới</span><input id="preset-name" type="text" placeholder="Nhập tên preset"></label><button class="action" id="create-preset">Tạo preset</button></div><small>Tạo preset sẽ sao chép cấu hình đang hiển thị.</small></div>
    <label class="master"><span class="master-copy"><strong>Bật FF5.4 cho preset này</strong><small>Áp dụng cho mọi chat của các card dùng preset “${escapeHtml(profile.name)}”.</small></span><input class="switch" id="master" type="checkbox" ${settings.enabled ? "checked" : ""}></label>
    <details open><summary><span class="summary-copy"><strong>Module của plugin</strong><small>Tính năng bổ sung riêng cho bản RisuAI.</small></span></summary><div class="list">${checkbox(
      "plugin",
      "vietnamese-output",
      settings.vietnameseOutputEnabled,
      "🇻🇳 Đầu ra tiếng Việt",
      "Viết tiếng Việt tự nhiên; bản địa hóa mẫu và từ vựng có thể đi vào phản hồi ở mọi CoT liên quan · Mặc định bật",
    )}${checkbox(
      "plugin",
      "submodel-editor",
      settings.submodelEditorEnabled,
      "✍️ Biên tập bằng Submodel",
      "Hiện nút ✍️ ở phản hồi AI cuối để viết lại tiếng Việt bằng preset Submodel hiện tại của PocketRisu",
    )}${checkbox(
      "plugin",
      "submodel-auto-rewrite",
      settings.submodelAutoRewriteEnabled,
      "🔄 Tự động biên tập bằng Submodel",
      "Cần bật Biên tập bằng Submodel. Tự sửa phản hồi mới sau khi tạo xong, có đủ header và khối internal state hoàn chỉnh; thông báo khi đã lưu · Mặc định tắt",
    )}</div></details></section>
    <section id="choices" class="panel"><div class="panel-heading"><span class="index">02 / Quy tắc lựa chọn</span><h2>Nhóm chọn một</h2></div><p class="section-note">Mỗi nhóm chỉ kích hoạt một lựa chọn. Chọn “không dùng” để tắt toàn bộ nhóm.</p><div class="choice-grid">${choiceGroups}</div></section>
    <section id="modules" class="panel"><div class="panel-heading"><span class="index">03 / Bộ công cụ</span><h2>Module độc lập</h2></div><p class="section-note">Mở một nhóm để xem chức năng và bật những module bạn cần.</p>${promptSections}</section>
    <section id="filters" class="panel"><div class="panel-heading"><span class="index">04 / Vận hành</span><h2>Bộ lọc kỹ thuật</h2></div><p class="section-note">Các bộ lọc gốc dùng khi gửi ngữ cảnh và hiển thị phản hồi. Chỉ thay đổi khi bạn hiểu rõ tác dụng của chúng.</p><details><summary><span class="summary-copy"><strong>Xem ${preset.extensions?.regex_scripts?.length ?? 0} bộ lọc</strong><small>Được chia theo công việc để dễ tìm.</small></span></summary><div class="regex-groups">${regexGroups}</div></details></section>
    <p class="source-note">Nguồn: ${escapeHtml(__FF54_SOURCE_NAME__)}<br>SHA-256: ${escapeHtml(__FF54_SOURCE_SHA256__)}</p>
    </div></div>
    <div class="command-bar"><div class="command-inner"><span class="command-label">FF5.4 / ${escapeHtml(profile.name)}</span><button class="action primary" id="save">Lưu preset</button><button class="action" id="reset">Khôi phục</button><button class="action" id="close">Đóng</button><div class="status" id="status" role="status" aria-live="polite"></div></div></div>
  </main>`;

  const status = document.getElementById("status")!;
  const readUi = () => {
    settings.enabled = (document.getElementById("master") as HTMLInputElement).checked;
    for (const group of EXCLUSIVE_PROMPT_GROUPS) {
      const node = document.querySelector<HTMLInputElement>(
        `input[data-kind="choice"][data-group="${group.id}"]:checked`,
      );
      for (const identifier of group.memberIds) settings.promptEnabled[identifier] = false;
      if (node?.value) settings.promptEnabled[node.value] = true;
    }
    for (const node of document.querySelectorAll<HTMLInputElement>(
      'input[type="checkbox"][data-kind]',
    )) {
      const id = node.dataset.id!;
      if (node.dataset.kind === "prompt") settings.promptEnabled[id] = node.checked;
      else if (node.dataset.kind === "regex") settings.regexEnabled[id] = node.checked;
      else if (id === "vietnamese-output") settings.vietnameseOutputEnabled = node.checked;
      else if (id === "submodel-editor") settings.submodelEditorEnabled = node.checked;
      else if (id === "submodel-auto-rewrite") settings.submodelAutoRewriteEnabled = node.checked;
    }
  };
  for (const node of document.querySelectorAll<HTMLInputElement>('input[data-kind="choice"]')) {
    node.addEventListener("change", () => {
      const detail = document.querySelector<HTMLElement>(
        `[data-choice-detail="${node.dataset.group}"]`,
      );
      if (detail) detail.textContent = node.dataset.detail ?? "";
    });
  }
  document.getElementById("close")!.addEventListener("click", () => void Risuai.hideContainer());
  const presetPicker = document.getElementById("preset-picker")!;
  const presetTrigger = document.getElementById("config-preset-trigger") as HTMLButtonElement;
  const presetMenu = document.getElementById("config-preset-menu")!;
  const presetSelect = document.getElementById("config-preset") as HTMLSelectElement;
  presetTrigger.addEventListener("click", () => {
    const open = presetPicker.dataset.open === "true";
    presetPicker.dataset.open = open ? "false" : "true";
    presetTrigger.setAttribute("aria-expanded", open ? "false" : "true");
  });
  presetMenu.addEventListener("click", (event) => {
    const option = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-preset-id]");
    if (!option || !presetSelect) return;
    presetSelect.value = option.dataset.presetId ?? "";
    presetSelect.dispatchEvent(new Event("change", { bubbles: true }));
  });
  document.getElementById("config-preset")!.addEventListener("change", async () => {
    if (!cardId) return;
    selectCardPreset(
      configPresets,
      cardId,
      (document.getElementById("config-preset") as HTMLSelectElement).value,
    );
    await saveSettings();
    await showSettings();
    document.getElementById("status")!.textContent = "Đã lưu preset được chọn cho card này.";
  });
  document.getElementById("create-preset")!.addEventListener("click", async () => {
    try {
      readUi();
      const created = createConfigPreset(
        configPresets,
        (document.getElementById("preset-name") as HTMLInputElement).value,
        settings,
      );
      if (cardId) selectCardPreset(configPresets, cardId, created.id);
      await saveSettings();
      await showSettings();
      document.getElementById("status")!.textContent = `Đã tạo preset “${created.name}”.`;
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : "Không thể tạo preset.";
    }
  });
  document.getElementById("save")!.addEventListener("click", async () => {
    readUi();
    profile.settings = structuredClone(settings);
    await saveSettings();
    status.textContent = `Đã lưu preset “${profile.name}”.`;
  });
  document.getElementById("reset")!.addEventListener("click", async () => {
    profile.settings = createDefaultSettings(preset);
    await saveSettings();
    await showSettings();
    document.getElementById("status")!.textContent =
      `Đã khôi phục cấu hình của preset “${profile.name}” về mặc định (Chế độ Hiện thực).`;
  });
  await Risuai.showContainer("fullscreen");
}

function mainGeneration(type: string): boolean {
  return type === "model";
}

async function getHostMacroContext(character: HostCharacter | null): Promise<{
  characterName: string;
  maxContext?: number;
  maxResponse?: number;
  userName: string;
}> {
  const database = await Risuai.getDatabase([
    "personas",
    "selectedPersona",
    "maxContext",
    "maxResponse",
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
    ...(database?.maxContext !== undefined ? { maxContext: database.maxContext } : {}),
    ...(database?.maxResponse !== undefined ? { maxResponse: database.maxResponse } : {}),
    userName,
  };
}

const historyCleanups = new Map<string, Promise<void>>();

async function cleanSavedHistory(
  settings: FfGlobalSettings,
  characterIndex: number,
  chatIndex: number,
): Promise<void> {
  const chat = await Risuai.getChatFromIndex(characterIndex, chatIndex);
  if (!chat?.message?.length) return;

  const sourceMessages: ChatMessage[] = chat.message.map((message) => ({
    role: message.role === "char" ? "assistant" : "user",
    content: String(message.data ?? ""),
  }));
  const cleanedMessages = applyPromptRegexToMessages(sourceMessages, preset, settings);
  let changed = false;
  const message = chat.message.map((entry, index) => {
    const content = cleanedMessages[index]?.content ?? String(entry.data ?? "");
    if (content !== String(entry.data ?? "")) changed = true;
    return content === entry.data ? entry : { ...entry, data: content };
  });
  if (changed) await Risuai.setChatToIndex(characterIndex, chatIndex, { ...chat, message });
}

async function cleanSavedHistoryOnce(
  settings: FfGlobalSettings,
  characterIndex: number,
  chatIndex: number,
): Promise<void> {
  const key = editorChatKey(characterIndex, chatIndex);
  if (!historyCleanups.has(key)) {
    historyCleanups.set(
      key,
      cleanSavedHistory(settings, characterIndex, chatIndex).finally(() => {
        historyCleanups.delete(key);
      }),
    );
  }
  await historyCleanups.get(key);
}

const beforeRequest = async (messages: ChatMessage[], type: string): Promise<ChatMessage[]> => {
  if (!mainGeneration(type)) return messages;
  const [character, characterIndex, chatIndex] = await Promise.all([
    Risuai.getCharacter(),
    Risuai.getCurrentCharacterIndex(),
    Risuai.getCurrentChatIndex(),
  ]);
  cardIdsByIndex.set(characterIndex, character?.chaId);
  const settings = presetForCard(configPresets, character?.chaId).settings;
  if (!settings.enabled) return messages;
  await cleanSavedHistoryOnce(settings, characterIndex, chatIndex);
  const macroContext = await getHostMacroContext(character);
  const built = await buildRequestMessages(messages, preset, settings, async (content) =>
    expandHostMacros(content, macroContext),
  );
  if (editorListenerRegistered) {
    try {
      const key = editorChatKey(characterIndex, chatIndex);
      editorRequests.delete(key);
      const chat = await Risuai.getChatFromIndex(characterIndex, chatIndex);
      if (chat) {
        editorRequests.set(key, {
          cardId: character?.chaId,
          chatId: chat.id,
          messages: structuredClone(built),
        });
      }
    } catch (error) {
      editorRequests.clear();
      console.warn("[FF5.4] Could not capture Submodel context; keeping main generation.", error);
    }
  } else {
    editorRequests.clear();
  }
  void editorButton
    ?.refresh()
    .catch((error) => console.warn("[FF5.4] Could not refresh rewrite button.", error));
  return built;
};

const displayOutput = async (content: string): Promise<string> => {
  const settings = (await activeConfigPreset()).settings;
  if (!settings.enabled) return content;
  return adaptVietnameseHeaderForRisuAI(
    adaptDisplayMarkupForRisuAI(
      applyRegexScripts(content, preset, settings, {
        placement: PLACEMENT_AI_OUTPUT,
        markdown: true,
        depth: 0,
      }),
    ),
  );
};

async function readSubmodelResult(value: unknown): Promise<string | undefined> {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") throw new Error("Submodel không trả về kết quả hợp lệ.");
  const record = value as Record<string, unknown>;
  if (record.type === "success" && typeof record.result === "string") return record.result;
  if (record.type === "fail")
    throw new Error(`Submodel thất bại: ${String(record.result ?? "Lỗi không xác định")}`);
  if (record.type !== "streaming")
    throw new Error("Submodel trả về định dạng không hỗ trợ cho việc biên tập.");
  const result = record.result;
  if (!result || typeof result !== "object" || !("getReader" in result))
    throw new Error("Không đọc được luồng phản hồi của Submodel.");
  const reader = (result as ReadableStream<{ [key: string]: string }>).getReader();
  let output = "";
  try {
    while (true) {
      const chunk = await reader.read();
      // PocketRisu stream chunks contain the full response so far.
      if (chunk.value) output = Object.values(chunk.value)[0] ?? output;
      if (chunk.done) return output || undefined;
    }
  } finally {
    reader.releaseLock();
  }
}

function splitEditorReasoning(text: string): { prefix: string; response: string } {
  // PocketRisu prepends provider reasoning to both streamed and complete results.
  // Keep the main reply's prefix unchanged; the editor's own reasoning is not an edit.
  const prefix = text.match(/^(?:\s*<(Thoughts|think)>[\s\S]*?<\/\1>\s*)+/i)?.[0] ?? "";
  return { prefix, response: text.slice(prefix.length) };
}

function splitEditorResponse(text: string): { prefix: string; response: string } {
  const reasoning = splitEditorReasoning(text);
  const header = splitBeforeSceneHeader(reasoning.response);
  return { prefix: reasoning.prefix + header.prefix, response: header.response };
}

function insertSubmodelEditorSystem(messages: ChatMessage[]): ChatMessage[] {
  const editorSystem: ChatMessage = {
    role: "system",
    content: SUBMODEL_EDITOR_SYSTEM,
    memo: "ff54:submodel-editor",
  };
  const highRiskIndex = messages.findIndex(
    (message) =>
      message.memo === "ff54:jailbreak" ||
      message.content.includes("High risk context is allowed."),
  );
  if (highRiskIndex < 0) return [...messages, editorSystem];
  return [...messages.slice(0, highRiskIndex), editorSystem, ...messages.slice(highRiskIndex)];
}

async function runSubmodelEditor(
  context: PendingEditorRequest,
  response: string,
): Promise<string | undefined> {
  const messages: ChatMessage[] = [
    ...insertSubmodelEditorSystem(
      buildEditorReferenceMessages(context.messages, context.responseId),
    ),
    {
      role: "user",
      content: `Edit this already-generated AI response according to <vietnamese_editor>. Return only the edited response.\n\n${response}`,
      memo: "ff54:submodel-editor-target",
    },
  ];
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Risuai.runLLMModel({ mode: "submodel", messages, allowPlugins: false }).then(
        readSubmodelResult,
      ),
      new Promise<undefined>((resolve) => {
        timer = setTimeout(() => resolve(undefined), 90_000);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

const submodelOutputListener = async ({
  characterIndex,
  chatIndex,
  messageIndex,
  chat,
}: ChatOutputListenerArgument): Promise<void> => {
  const key = editorChatKey(characterIndex, chatIndex);
  const context = editorRequests.get(key);
  const target = chat.message?.[messageIndex];
  if (
    context &&
    context.chatId === chat.id &&
    messageIndex >= 0 &&
    messageIndex === (chat.message?.length ?? 0) - 1 &&
    target?.role === "char"
  ) {
    const settings = presetForCard(configPresets, context.cardId).settings;
    context.responseId = target.chatId;
    context.responseIndex = messageIndex;
    if (
      settings.enabled &&
      settings.submodelEditorEnabled &&
      settings.submodelAutoRewriteEnabled &&
      !chat.isStreaming &&
      !context.autoRewriteAttempted &&
      !editorBusyChats.has(key) &&
      completeAutoRewriteResponse(String(target.data ?? ""))
    ) {
      context.autoRewriteAttempted = true;
      await rewriteLatestResponse(
        {
          key: JSON.stringify([characterIndex, chatIndex, chat.id, target.chatId, messageIndex]),
          characterIndex,
          chatIndex,
          messageIndex,
          messageId: target.chatId,
          chatId: chat.id,
          available: true,
        },
        true,
      );
    }
  }
  await editorButton?.refresh();
};

function completeAutoRewriteResponse(text: string): boolean {
  const { response } = splitEditorResponse(text);
  if (!hasCompleteSceneHeader(response)) return false;
  const state = response.match(/<internal_states>([\s\S]*?)<\/internal_states>/i);
  return Boolean(state?.[1]?.trim());
}

async function getEditorButtonTarget(): Promise<RewriteButtonTarget | undefined> {
  const settings = (await activeConfigPreset()).settings;
  if (!settings.enabled || !settings.submodelEditorEnabled || !editorListenerRegistered) return;
  const [characterIndex, chatIndex] = await Promise.all([
    Risuai.getCurrentCharacterIndex(),
    Risuai.getCurrentChatIndex(),
  ]);
  const context = editorRequests.get(editorChatKey(characterIndex, chatIndex));
  if (context && context.responseIndex === undefined) return;
  const chat = await Risuai.getChatFromIndex(characterIndex, chatIndex);
  const messageIndex = (chat?.message?.length ?? 0) - 1;
  const target = chat?.message?.[messageIndex];
  if (!chat || chat.isStreaming || target?.role !== "char" || !String(target.data ?? "").trim())
    return;
  return {
    key: JSON.stringify([characterIndex, chatIndex, chat.id, target.chatId, messageIndex]),
    characterIndex,
    chatIndex,
    messageIndex,
    messageId: target.chatId,
    chatId: chat.id,
    busy: editorBusyChats.has(editorChatKey(characterIndex, chatIndex)),
    available:
      context?.chatId === chat.id &&
      context?.responseId === target.chatId &&
      context?.responseIndex === messageIndex,
  };
}

async function syncEditorButton(): Promise<void> {
  try {
    editorButton ??= await createRewriteButton(
      Risuai,
      getEditorButtonTarget,
      rewriteLatestResponse,
    );
    await editorButton?.refresh();
  } catch (error) {
    console.warn("[FF5.4] Rewrite button requires PocketRisu's mainDom permission.", error);
  }
}

async function rewriteLatestResponse(
  buttonTarget: RewriteButtonTarget,
  automatic = false,
): Promise<void> {
  const { characterIndex, chatIndex, messageIndex } = buttonTarget;
  const key = editorChatKey(characterIndex, chatIndex);
  const context = editorRequests.get(key);
  if (!context || editorBusyChats.has(key)) return;
  const profile = presetForCard(configPresets, context.cardId);
  const editorEnabled = () =>
    presetForCard(configPresets, context.cardId).id === profile.id &&
    profile.settings.enabled &&
    profile.settings.submodelEditorEnabled &&
    editorListenerRegistered &&
    (!automatic || profile.settings.submodelAutoRewriteEnabled);
  if (!editorEnabled()) return;
  const chat = await Risuai.getChatFromIndex(characterIndex, chatIndex);
  const target = chat?.message?.[messageIndex];
  if (
    !chat ||
    chat.isStreaming ||
    chat.id !== buttonTarget.chatId ||
    context.chatId !== chat.id ||
    context.responseId !== buttonTarget.messageId ||
    context.responseIndex !== messageIndex ||
    target?.role !== "char" ||
    target.chatId !== buttonTarget.messageId ||
    messageIndex !== (chat.message?.length ?? 0) - 1
  )
    return;
  const original = String(target?.data ?? "");
  if (!original.trim()) return;
  if (automatic && !completeAutoRewriteResponse(original)) return;
  if (editorBusyChats.has(key)) return;
  editorBusyChats.add(key);
  try {
    await editorButton?.refresh();
    const source = splitEditorResponse(original);
    const result = await runSubmodelEditor(context, source.response);
    if (!editorEnabled() || editorRequests.get(key) !== context) return;
    if (result === undefined)
      throw new Error("Submodel đã quá thời gian chờ 90 giây hoặc không trả về nội dung.");
    const body = splitEditorResponse(result).response;
    if (!body.trim()) throw new Error("Submodel trả về nội dung trống, giữ nguyên phản hồi gốc.");
    if (!editorEnabled() || editorRequests.get(key) !== context) return;
    const edited = source.prefix + body;
    const latestChat = await Risuai.getChatFromIndex(characterIndex, chatIndex);
    const latestMessage = latestChat?.message?.[messageIndex];
    if (
      !latestChat ||
      latestChat.isStreaming ||
      latestChat.id !== chat.id ||
      messageIndex !== (latestChat.message?.length ?? 0) - 1 ||
      !latestMessage ||
      latestMessage.role !== "char" ||
      latestMessage.chatId !== target.chatId ||
      latestMessage.swipeId !== target.swipeId ||
      String(latestMessage.data ?? "") !== original
    ) {
      await Risuai.alert(
        "Phản hồi hoặc cuộc trò chuyện đã thay đổi trong lúc Submodel chạy, nên bản sửa chưa được lưu.",
      );
      return;
    }
    const alternatives = Array.isArray(latestMessage.swipes) ? [...latestMessage.swipes] : [];
    if (!alternatives.includes(original)) alternatives.push(original);
    // Add the edit as a new PocketRisu swipe so the original remains selectable.
    alternatives.push(edited);
    const updatedMessage = {
      ...latestMessage,
      data: edited,
      swipes: alternatives,
      swipeId: alternatives.length - 1,
    };
    latestChat.message![messageIndex] = updatedMessage;
    await Risuai.setChatToIndex(characterIndex, chatIndex, latestChat);
    const savedChat = await Risuai.getChatFromIndex(characterIndex, chatIndex);
    const savedMessage = savedChat?.message?.[messageIndex];
    if (
      savedMessage?.data !== edited ||
      savedMessage.swipeId !== alternatives.length - 1 ||
      !Array.isArray(savedMessage.swipes) ||
      savedMessage.swipes.length !== alternatives.length ||
      savedMessage.swipes.some((swipe, index) => swipe !== alternatives[index])
    )
      throw new Error("PocketRisu chưa lưu được bản sửa thành phản hồi song song.");
    await Risuai.alert(
      automatic
        ? "Đã tự động biên tập tiếng Việt bằng Submodel và thêm một phản hồi song song."
        : "Đã biên tập tiếng Việt bằng Submodel và thêm một phản hồi song song.",
    );
  } catch (error) {
    console.warn("[FF5.4] Submodel editor failed; keeping main response.", error);
    await Risuai.alertError(
      error instanceof Error ? error.message : "Không thể lưu bản sửa từ Submodel.",
    );
  } finally {
    editorBusyChats.delete(key);
    await editorButton?.refresh();
  }
}

void (async () => {
  configPresets = normalizePresetStore(
    preset,
    await Risuai.pluginStorage.getItem(CONFIG_PRESETS_STORAGE_KEY),
    await Risuai.pluginStorage.getItem(STORAGE_KEY),
  );
  for (const profile of configPresets.presets)
    normalizeExclusivePromptGroups(profile.settings, orderEntries());
  await Risuai.pluginStorage.setItem(CONFIG_PRESETS_STORAGE_KEY, configPresets);
  const button = await Risuai.registerButton(
    { name: "FF5.4", icon: "⚡", iconType: "html", location: "chat", id: BUTTON_ID },
    () => void showSettings(),
  );
  await Risuai.addRisuReplacer("beforeRequest", beforeRequest);
  await Risuai.addRisuScriptHandler("display", displayOutput);
  try {
    await Risuai.addRisuChatListener("output", submodelOutputListener);
    editorListenerRegistered = true;
  } catch (error) {
    console.warn("[FF5.4] Submodel editor requires PocketRisu's chat output API.", error);
  }
  await syncEditorButton();
  await Risuai.onUnload(async () => {
    const unregisterEditor = editorListenerRegistered;
    editorListenerRegistered = false;
    editorRequests.clear();
    await editorButton?.dispose();
    editorButton = undefined;
    await Risuai.removeRisuReplacer("beforeRequest", beforeRequest);
    await Risuai.removeRisuScriptHandler("display", displayOutput);
    if (unregisterEditor) {
      await Risuai.removeRisuChatListener("output", submodelOutputListener);
    }
    await Risuai.unregisterUIPart(button.id);
  });
})();
