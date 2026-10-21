import {
  adaptDisplayMarkupForRisuAI,
  adaptVietnameseHeaderForRisuAI,
  applyRegexScripts,
  buildRequestMessages,
  createDefaultSettings,
  expandHostMacros,
  PLACEMENT_AI_OUTPUT,
  applyPromptRegexToMessages,
  isChatComment,
  extractInternalStateBlock,
  keepsInternalStateInHistory,
  splitBeforeSceneHeader,
  hasCompleteSceneHeader,
  type ChatMessage,
  type FfGlobalSettings,
  type FfPreset,
  type HostMacroContext,
} from "./core.js";
import { resolveDialogueTheme } from "./dialogue-colors.js";
import { promptUiCopy, regexUiCopy, type ExclusivePromptGroup } from "./ui-vi.js";
import {
  PRESET_FAMILIES,
  familyPrompts,
  familyRegexScripts,
  familyOf,
  normalizePresetFamily,
  presetOrder,
  isPluginMemo,
  pluginMemoPrefix,
  type PresetSources,
  type PresetFamilyId,
} from "./preset-family.js";
import {
  restoreSolaHistoryContent,
  solaHistorySwipeKey,
  type SolaHistoryArchive,
  type SolaHistoryRemoval,
} from "./sola-history.js";
import {
  familyChoiceGroups,
  familyPromptSections,
  familyRegexGroups,
  normalizeFamilyChoices,
} from "./family-ui.js";
import { insertSubmodelEditorSystem, editorUserFor } from "./editor-prompts.js";
import { adaptSolaSceneHeaderForDisplay } from "./sola-display.js";
import { splitSolaReasoning } from "./sola-reasoning.js";
import { resolveSolaPregnancy } from "./sola-sex-tracker.js";
import { SETTINGS_STYLES } from "./ui-style.js";
import {
  createRewriteButton,
  type RewriteButtonApi,
  type RewriteButtonController,
  type RewriteButtonTarget,
} from "./submodel-button.js";
import { buildEditorReferenceMessages } from "./submodel-context.js";
import { createCompletionMonitor } from "./completion-monitor.js";
import { estimatePluginPromptTokens, type PluginTokenEstimate } from "./token-estimate.js";
import { collectCardImages, type CardImageSource } from "./card-images.js";
import {
  CONFIG_PRESETS_STORAGE_KEY,
  createConfigPreset,
  deleteConfigPreset,
  normalizePresetStore,
  presetForCard,
  renameConfigPreset,
  selectCardPreset,
  switchPresetFamily,
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
  getColorScheme?(): Promise<{ scheme: unknown }>;
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
  alertConfirm(message: string): Promise<boolean>;
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
  isComment?: boolean;
  /** Hidden snapshot kept so an older/branched history can restore its state. */
  ff54InternalState?: string;
  solaHistory?: SolaHistoryArchive;
  [key: string]: unknown;
}

interface HostChatSnapshot {
  id?: unknown;
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

interface NotificationAudioContext {
  state?: string;
  currentTime: number;
  destination: unknown;
  createOscillator(): {
    type: string;
    frequency: { setValueAtTime(value: number, when: number): void };
    connect(destination: unknown): void;
    start(when?: number): void;
    stop(when?: number): void;
  };
  createGain(): {
    gain: {
      setValueAtTime(value: number, when: number): void;
      exponentialRampToValueAtTime(value: number, when: number): void;
    };
    connect(destination: unknown): void;
  };
  resume?(): Promise<void>;
  close?(): Promise<void>;
}

type NotificationAudioContextConstructor = new () => NotificationAudioContext;

interface HostCharacter extends CardImageSource {
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

declare const __PLUGIN_VERSION__: string;
declare const __PRESET_SOURCES__: PresetSources;
declare const __FF54_PRESET__: FfPreset;
declare const __FF54_SOURCE_NAME__: string;
declare const __FF54_SOURCE_SHA256__: string;

const PLUGIN_DISPLAY_NAME = `TomiSakae VN-RP v${__PLUGIN_VERSION__}`;
const STORAGE_KEY = "ff54-global-settings-v1";
const BUTTON_ID = "ff54-global-config";
const presetSources: PresetSources =
  typeof __PRESET_SOURCES__ !== "undefined"
    ? __PRESET_SOURCES__
    : {
        ff54: {
          preset: __FF54_PRESET__,
          sourceName: __FF54_SOURCE_NAME__,
          sha256: __FF54_SOURCE_SHA256__,
        },
        sola: { preset: __FF54_PRESET__, sourceName: "", sha256: "" },
      };
const preset = presetSources.ff54.preset;
function sourceForSettings(settings: FfGlobalSettings): FfPreset {
  return presetSources[normalizePresetFamily(settings.presetFamily)].preset;
}
let configPresets: ConfigPresetStore = normalizePresetStore(preset, undefined);
const cardIdsByIndex = new Map<number, string | undefined>();

async function activeConfigPreset() {
  const index = await Risuai.getCurrentCharacterIndex();
  if (!cardIdsByIndex.has(index)) {
    cardIdsByIndex.set(index, (await Risuai.getCharacter())?.chaId);
  }
  return presetForCard(configPresets, cardIdsByIndex.get(index));
}

interface PendingEditorRequest {
  presetFamily?: PresetFamilyId;
  cardId: string | undefined;
  chatId: unknown;
  messages: ChatMessage[];
  historyMessageIds: string[];
  responseId?: unknown;
  responseIndex?: number;
  autoRewriteAttempted?: boolean;
  outputHandled?: boolean;
  pregnancyHandled?: boolean;
  previousOutput?: { id: unknown; swipeId: number | undefined; content: string };
}

const editorRequests = new Map<string, PendingEditorRequest>();
let editorListenerRegistered = false;
let editorButton: RewriteButtonController | undefined;
let editorButtonInitialization: Promise<RewriteButtonController | undefined> | undefined;
const editorRuns = new Map<string, { controller: AbortController; targetKey: string }>();
const editorChatKey = (characterIndex: number, chatIndex: number) =>
  `${characterIndex}:${chatIndex}`;
const mainCompletionMonitor = createCompletionMonitor(Risuai);
let notificationAudio: NotificationAudioContext | undefined;
let pluginUnloaded = false;

function playCompletionSound(enabled: boolean, success: boolean): void {
  if (!enabled || pluginUnloaded) return;
  try {
    const globals = globalThis as unknown as {
      AudioContext?: NotificationAudioContextConstructor;
      webkitAudioContext?: NotificationAudioContextConstructor;
    };
    const AudioContextConstructor = globals.AudioContext ?? globals.webkitAudioContext;
    if (!AudioContextConstructor) return;
    const audio = (notificationAudio ??= new AudioContextConstructor());
    // Reuse the context unlocked by the settings gesture. Resume before scheduling
    // tones so a suspended mobile context does not consume the notification.
    void (async () => {
      if (audio.state !== "running") await audio.resume?.();
      if (pluginUnloaded || (audio.state && audio.state !== "running")) return;
      const start = audio.currentTime;
      const frequencies = success ? [660, 880] : [220, 160];
      frequencies.forEach((frequency, index) => {
        const when = start + index * 0.1;
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, when);
        gain.gain.setValueAtTime(0.0001, when);
        gain.gain.exponentialRampToValueAtTime(0.08, when + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.12);
        oscillator.connect(gain);
        gain.connect(audio.destination);
        oscillator.start(when);
        oscillator.stop(when + 0.13);
      });
    })().catch(() => {});
  } catch {
    // Optional audio feedback must never affect generation or editing.
  }
}

function createEditorAbortController(): AbortController {
  if (typeof AbortController !== "undefined") return new AbortController();
  const listeners = new Set<() => void>();
  const signal = {
    aborted: false,
    reason: undefined as unknown,
    addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
  } as unknown as AbortSignal;
  return {
    signal,
    abort(reason?: unknown) {
      if (signal.aborted) return;
      Object.assign(signal, { aborted: true, reason });
      for (const listener of [...listeners]) listener();
      listeners.clear();
    },
  } as AbortController;
}

function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function orderEntries(preset: FfPreset) {
  return presetOrder(preset);
}

function promptById(preset: FfPreset) {
  return new Map(familyPrompts(preset).map((prompt) => [prompt.identifier, prompt]));
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
  disabled = false,
  experimental = false,
): string {
  return `<label class="toggle-row">
    <input class="switch" type="checkbox" data-kind="${kind}" data-id="${escapeHtml(id)}" ${checked ? "checked" : ""} ${disabled ? "disabled" : ""}>
    <span class="toggle-copy"><span class="toggle-title"><strong>${escapeHtml(label)}</strong>${experimental ? '<span class="ui-badge ui-badge-experimental">Thử nghiệm</span>' : ""}</span><small>${escapeHtml(detail)}</small></span>
  </label>`;
}

function sourceState(enabled: boolean): string {
  return enabled ? "Preset gốc: bật" : "Preset gốc: tắt";
}

function tokenEstimateHtml(estimate: PluginTokenEstimate, preset: FfPreset): string {
  const number = (value: number) => value.toLocaleString("vi-VN");
  const prompts = promptById(preset);
  const rows = [...estimate.entries]
    .sort((left, right) => right.tokens - left.tokens)
    .map((entry) => {
      const prompt = prompts.get(entry.identifier);
      const name =
        entry.identifier === "vietnamese-output"
          ? "🇻🇳 Đầu ra tiếng Việt"
          : entry.identifier === "image-optimization"
            ? "🖼️ Tối ưu hình ảnh theo card"
            : entry.identifier === "card-image-catalog"
              ? "🖼️ Danh sách ảnh của card"
              : entry.identifier === "nsfw-tracker"
                ? "🔥 Bộ theo dõi NSFW/NSFL"
                : entry.identifier === "sex-tracker"
                  ? "🌙 Bộ theo dõi tình dục"
                  : entry.identifier === "gemma-fix"
                    ? "🛠️ Fix Gemma 4"
                    : prompt
                      ? promptUiCopy(prompt, familyOf(preset)).name
                      : entry.identifier;
      return `<div class="token-row"><span>${escapeHtml(name)}</span><strong>≈ ${number(entry.tokens)}</strong></div>`;
    })
    .join("");
  return `<div class="token-heading"><div><span class="index">Ước tính theo cấu hình đang chọn</span><h3>Token prompt chèn thêm</h3></div><strong class="token-total">≈ ${number(estimate.tokens)}</strong></div>
    <div class="token-metrics"><span>Nội dung prompt <b>${number(estimate.contentTokens)}</b></span><span>Khung message <b>≈ ${number(estimate.framingTokens)}</b></span><span>Số message <b>${number(estimate.messageCount)}</b></span></div>
    ${estimate.cardImages ? `<p class="token-note">Ảnh card: <b>${number(estimate.cardImages.imageCount)}</b> · Từ khóa ảnh: <b>${number(estimate.cardImages.keywordCount)}</b> · Token danh sách: <b>≈ ${number(estimate.cardImages.tokens)}</b>${estimate.cardImages.unavailable ? " · Danh sách ảnh chưa tải đầy đủ, chưa gửi vào request." : ""}</p>` : ""}
    <p class="token-note">Dùng tokenizer o200k_base làm tham chiếu; số thực tế tùy model/API. Không tính card/lore, memory, lịch sử chat hay phản hồi AI. Cập nhật ngay khi đổi lựa chọn; bấm “Lưu preset” để áp dụng.</p>
    ${rows ? `<details><summary><span class="summary-copy"><strong>Chi tiết theo module</strong><small>Từ nhiều token đến ít. Nội dung phụ thuộc được tính ở prompt dùng nó; tổng có thể lệch nhẹ do gộp message.</small></span></summary><div class="token-rows">${rows}</div></details>` : '<p class="token-note">Plugin đang tắt nên không chèn prompt.</p>'}`;
}

function selectedGroupPrompt(
  group: ExclusivePromptGroup,
  settings: FfGlobalSettings,
  preset: FfPreset,
): string {
  const enabled = group.memberIds.filter((identifier) => settings.promptEnabled[identifier]);
  if (enabled.length <= 1) return enabled[0] ?? "";
  const defaults = new Map(
    orderEntries(preset).map((entry) => [entry.identifier, entry.enabled !== false]),
  );
  return enabled.find((identifier) => defaults.get(identifier)) ?? enabled.at(-1) ?? "";
}

function exclusiveGroup(
  group: ExclusivePromptGroup,
  prompts: Map<string, FfPreset["prompts"][number]>,
  index: number,
  settings: FfGlobalSettings,
  preset: FfPreset,
): string {
  const selected = selectedGroupPrompt(group, settings, preset);
  const option = (identifier: string, name: string, detail: string, source?: string) =>
    `<label class="choice-option"><input type="radio" name="choice-${escapeHtml(group.id)}" data-kind="choice" data-group="${escapeHtml(group.id)}" value="${escapeHtml(identifier)}" data-detail="${escapeHtml(detail)}" ${selected === identifier ? "checked" : ""}><span class="radio-body"><span class="radio-dot"></span><span class="radio-copy"><strong>${escapeHtml(name)}</strong>${source ? `<small>${escapeHtml(source)}</small>` : ""}</span></span></label>`;
  const options = group.memberIds
    .map((identifier) => {
      const prompt = prompts.get(identifier);
      if (!prompt) return "";
      const copy = promptUiCopy(prompt, familyOf(preset));
      const sourceEnabled =
        orderEntries(preset).find((entry) => entry.identifier === identifier)?.enabled !== false;
      return option(identifier, copy.name, copy.description, sourceState(sourceEnabled));
    })
    .join("");
  const selectedPrompt = selected ? prompts.get(selected) : undefined;
  const selectedDescription = selectedPrompt
    ? promptUiCopy(selectedPrompt, familyOf(preset)).description
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
  const preset = sourceForSettings(settings);
  const family = PRESET_FAMILIES.find((entry) => entry.id === familyOf(preset))!;
  const familyLabel = `${family.name} · ${family.status}`;
  const source = presetSources[family.id];
  const exclusiveGroups = familyChoiceGroups(preset);
  const presetOptions = configPresets.presets
    .map(
      (entry) =>
        `<option value="${escapeHtml(entry.id)}" ${entry.id === profile.id ? "selected" : ""}>${escapeHtml(entry.name)}</option>`,
    )
    .join("");
  const prompts = promptById(preset);
  const choiceGroups = exclusiveGroups
    .map((group, index) => exclusiveGroup(group, prompts, index, settings, preset))
    .join("");
  const sections = familyPromptSections(preset);
  const promptDefaults = createDefaultSettings(preset).promptEnabled;
  const promptSections = sections
    .map((section) => {
      const rows = section.promptIds
        .map((identifier) => {
          const prompt = prompts.get(identifier);
          if (!prompt) return "";
          const entry = orderEntries(preset).find(
            (candidate) => candidate.identifier === identifier,
          );
          const copy = promptUiCopy(prompt, familyOf(preset));
          return checkbox(
            "prompt",
            identifier,
            settings.promptEnabled[identifier] === true,
            copy.name,
            `${copy.description} · ${sourceState(entry?.enabled !== false)}${promptDefaults[identifier] !== (entry?.enabled !== false) ? ` · Plugin mặc định: ${promptDefaults[identifier] ? "bật" : "tắt"}` : ""}`,
          );
        })
        .join("");
      return `<details ${section.open ? "open" : ""}><summary><span class="summary-copy"><strong>${escapeHtml(section.label)}</strong><small>${escapeHtml(section.description)}</small></span></summary><div class="list">${rows}</div></details>`;
    })
    .join("");
  const regexMap = new Map(familyRegexScripts(preset).map((script) => [script.id, script]));
  const filterGroups = family.id === "ff54" ? REGEX_GROUPS : familyRegexGroups(preset);
  const regexGroups = filterGroups
    .map((group) => {
      const rows = group.ids
        .map((identifier) => {
          const script = regexMap.get(identifier);
          if (!script) return "";
          const copy = regexUiCopy(script);
          return checkbox(
            "regex",
            identifier,
            settings.regexEnabled[identifier] === true,
            copy.name,
            `${copy.description} · ${sourceState(!script.disabled)}`,
          );
        })
        .join("");
      return `<section class="mini-group"><h3>${escapeHtml(group.label)}</h3>${rows}</section>`;
    })
    .join("");

  document.head.innerHTML = `<meta name="viewport" content="width=device-width,initial-scale=1"><style>${SETTINGS_STYLES}</style>`;
  document.body.innerHTML = `<main class="shell">
    <div class="masthead"><div class="brand"><span class="brand-mark">ts</span><span>${escapeHtml(PLUGIN_DISPLAY_NAME)}</span></div><span class="edition">${escapeHtml(familyLabel)}</span></div>
    <section class="hero"><div><span class="eyebrow">Không gian cấu hình</span><h1>Điều khiển <em>TomiSakae VN-RP.</em></h1><p class="hero-copy">Tính năng Global dùng chung, bộ nền giữ phong cách và quy tắc riêng. Mỗi preset dùng chung cho các card đã chọn preset đó.</p></div><div class="hero-side"><span class="index">Preset: ${escapeHtml(profile.name)}</span><p>Chọn cách thế giới của bạn vận hành.</p><small>Card mới dùng “Mặc định”. Chọn preset khác để ghi nhớ cho card hiện tại.</small></div></section>
    <div class="workspace"><nav class="rail" aria-label="Điều hướng cấu hình"><p class="rail-title">Danh mục</p><a href="#general"><span>01</span>Global</a><a href="#family"><span>02</span>Bộ preset nền</a><a href="#choices"><span>03</span>Nhóm chọn một</a><a href="#modules"><span>04</span>Module độc lập</a><a href="#filters"><span>05</span>Bộ lọc kỹ thuật</a><p class="rail-note">Sửa cấu hình rồi bấm “Lưu preset” để áp dụng.</p></nav>
    <div class="content">
    <section id="general" class="panel"><div class="panel-heading"><span class="index">01 / Dùng chung</span><h2>Global</h2></div>
    <div class="preset-panel"><label class="preset-field"><span>Preset cho ${escapeHtml(character?.nickname || character?.name || "card hiện tại")}</span><div class="preset-picker" id="preset-picker"><select id="config-preset" class="preset-native" tabindex="-1" aria-hidden="true" ${cardId ? "" : "disabled"}>${presetOptions}</select><button class="preset-trigger" id="config-preset-trigger" type="button" aria-haspopup="listbox" aria-expanded="false" ${cardId ? "" : "disabled"}>${escapeHtml(profile.name)}<span class="preset-trigger-mark" aria-hidden="true"></span></button><div class="preset-menu" id="config-preset-menu" role="listbox">${configPresets.presets.map((entry) => `<button class="preset-option${entry.id === profile.id ? " is-selected" : ""}" type="button" role="option" aria-selected="${entry.id === profile.id ? "true" : "false"}" data-preset-id="${escapeHtml(entry.id)}"><span>${escapeHtml(entry.name)}</span>${entry.id === profile.id ? '<span class="preset-option-mark" aria-hidden="true">✓</span>' : ""}</button>`).join("")}</div></div></label><p class="section-note">Chọn preset sẽ được ghi nhớ cho mọi chat của card này. Lưu cấu hình sẽ cập nhật preset cho tất cả card đang dùng nó.</p><div class="preset-create"><label class="preset-field"><span>Tên preset mới</span><input id="preset-name" type="text" placeholder="Nhập tên preset"></label><button class="action" id="create-preset">Tạo preset</button></div><div class="preset-manage"><label class="preset-field"><span>Đổi tên preset hiện tại</span><input id="rename-preset-name" type="text" value="${escapeHtml(profile.name)}" ${profile.id === "default" ? "disabled" : ""}></label><div class="preset-manage-actions"><button class="action" id="rename-preset" ${profile.id === "default" ? "disabled" : ""}>Đổi tên</button><button class="action danger" id="delete-preset" ${profile.id === "default" ? "disabled" : ""}>Xóa preset</button></div></div><small>Tạo preset sao chép cấu hình đang hiển thị. Preset Mặc định không thể đổi tên hoặc xóa.</small></div>
    <label class="master"><span class="master-copy"><strong>Bật TomiSakae VN-RP cho preset này</strong><small>Áp dụng cho mọi chat của các card dùng preset “${escapeHtml(profile.name)}”. Bộ nền: ${escapeHtml(familyLabel)}.</small></span><input class="switch" id="master" type="checkbox" ${settings.enabled ? "checked" : ""}></label>
    <div id="token-estimate-panel" class="token-panel" aria-live="polite"><p class="token-note">Đang ước tính token prompt…</p></div>
    <details open><summary><span class="summary-copy"><strong>Tính năng Global</strong><small>Giữ nguyên lựa chọn khi đổi bộ nền; prompt tự điều chỉnh theo bộ đang dùng.</small></span></summary><div class="list">${checkbox(
      "plugin",
      "vietnamese-output",
      settings.vietnameseOutputEnabled,
      "🇻🇳 Đầu ra tiếng Việt",
      "Tiếng Việt tự nhiên theo phong cách, định dạng và schema của bộ nền đang chọn · Mặc định bật",
    )}${checkbox(
      "plugin",
      "image-optimization",
      settings.imageOptimizationEnabled,
      "🖼️ Tối ưu hình ảnh theo card",
      "Chọn ảnh đúng trạng thái và trang phục theo card/lore; đặt sát đoạn phù hợp, đa dạng xuyên suốt phản hồi, không đặt hai ảnh liên tiếp · Mặc định tắt",
      false,
      true,
    )}${checkbox(
      "plugin",
      "card-image-catalog",
      settings.cardImageCatalogEnabled,
      "🖼️ Danh sách ảnh của card",
      "Đếm ảnh và token; gửi toàn bộ từ khóa ảnh bằng tin user riêng ngay sau tin user mới nhất · Mặc định tắt",
    )}${
      family.id === "sola"
        ? checkbox(
            "plugin",
            "sola-nsfw-tracker",
            settings.solaNsfwTrackerEnabled,
            "🔥 Bộ theo dõi NSFW/NSFL",
            "Ghi lại cách viết vừa dùng; hệ thống chuyển từng mục thành lệnh cấm lặp sau tin user ở request kế tiếp · Mặc định tắt",
          )
        : ""
    }${
      family.id === "sola"
        ? checkbox(
            "plugin",
            "sola-sex-tracker",
            settings.solaSexTrackerEnabled,
            "🌙 Theo dõi sinh sản",
            "Mô phỏng chu kỳ, nhận biết và thai kỳ; plugin tự xét xác suất riêng từng nhân vật khi phản hồi mới hoàn tất · Mặc định tắt",
          )
        : ""
    }${checkbox(
      "plugin",
      "gemma-fix",
      settings.gemmaFixEnabled,
      "🛠️ Fix Gemma 4",
      "Tiếng Việt, ảnh có sẵn và bộ quy tắc NSFW đầy đủ · Mặc định tắt",
    )}${checkbox(
      "plugin",
      "sound-notifications",
      settings.soundNotificationsEnabled,
      "🔔 Âm báo hoàn tất",
      "Báo cả thành công và thất bại; nếu tự biên tập thì chờ Submodel xong. Bật để nghe thử, rồi lưu preset · Mặc định tắt",
    )}${checkbox(
      "plugin",
      "submodel-editor",
      settings.submodelEditorEnabled,
      "✍️ Biên tập bằng Submodel",
      "Hiện nút ✍️ ở phản hồi AI cuối để viết lại tiếng Việt bằng preset Submodel hiện tại của PocketRisu; chỉ lấy 2 lượt trước và tin user hiện tại, không gửi memory/summary",
      false,
      true,
    )}${checkbox(
      "plugin",
      "submodel-auto-rewrite",
      settings.submodelEditorEnabled && settings.submodelAutoRewriteEnabled,
      "🔄 Tự động biên tập bằng Submodel",
      "Cần bật Biên tập bằng Submodel. Tự sửa phản hồi mới sau khi tạo xong và hoàn chỉnh theo định dạng của bộ nền; thông báo khi đã lưu · Mặc định tắt",
      !settings.submodelEditorEnabled,
      true,
    )}${checkbox(
      "plugin",
      "dialogue-theme",
      settings.dialogueThemeEnabled !== false,
      "🎨 Màu hội thoại theo giao diện",
      "Điều chỉnh bảng màu của bộ nền theo theme sáng/tối, giữ cú pháp màu riêng; bộ không có màu không bị thêm thẻ",
    )}</div></details></section>
    <section id="family" class="panel"><div class="panel-heading"><span class="index">02 / Bộ nền</span><h2>Bộ preset nền</h2></div><p class="section-note">Chọn một bộ cho cấu hình “${escapeHtml(profile.name)}”. Các module của mỗi bộ được lưu riêng; lựa chọn Global giữ nguyên.</p><div class="family-grid">${PRESET_FAMILIES.map((entry) => `<label class="choice-option family-option"><input type="radio" name="preset-family" data-family="${entry.id}" ${entry.id === family.id ? "checked" : ""}><span class="radio-body"><span class="radio-dot"></span><span class="family-copy"><span class="family-heading"><strong>${escapeHtml(entry.name)}</strong><span class="ui-badge ui-badge-stable">${escapeHtml(entry.status)}</span></span><small>${escapeHtml(entry.description)}</small></span></span></label>`).join("")}</div></section>
    <section id="choices" class="panel"><div class="panel-heading"><span class="index">03 / Quy tắc lựa chọn</span><h2>Nhóm chọn một</h2></div><p class="section-note">Mỗi nhóm chỉ kích hoạt một lựa chọn; có lựa chọn tắt các module trong nhóm.</p><div class="choice-grid">${choiceGroups}</div></section>
    <section id="modules" class="panel"><div class="panel-heading"><span class="index">04 / Bộ công cụ</span><h2>Module độc lập</h2></div><p class="section-note">Mở một nhóm để xem chức năng và bật những module bạn cần.</p>${promptSections}</section>
    <section id="filters" class="panel"><div class="panel-heading"><span class="index">05 / Vận hành</span><h2>Bộ lọc kỹ thuật</h2></div>${regexMap.size ? `<p class="section-note">Các bộ lọc gốc dùng khi gửi ngữ cảnh và hiển thị phản hồi. Chỉ thay đổi khi bạn hiểu rõ tác dụng của chúng.</p><details><summary><span class="summary-copy"><strong>Xem ${regexMap.size} bộ lọc</strong><small>Được chia theo công việc để dễ tìm.</small></span></summary><div class="regex-groups">${regexGroups}</div></details>` : '<p class="section-note">Bộ preset này không có bộ lọc kỹ thuật riêng.</p>'}</section>
    <p class="source-note">Nguồn: ${escapeHtml(source.sourceName)}<br>SHA-256: ${escapeHtml(source.sha256)}</p>
    </div></div>
    <div class="command-bar"><div class="command-inner"><span class="command-label">${escapeHtml(PLUGIN_DISPLAY_NAME)} · ${escapeHtml(familyLabel)} / ${escapeHtml(profile.name)}</span><button class="action primary" id="save">Lưu preset</button><button class="action" id="reset">Khôi phục</button><button class="action" id="close">Đóng</button><div class="status" id="status" role="status" aria-live="polite"></div></div></div>
  </main>`;

  const status = document.getElementById("status")!;
  const editorToggle = document.querySelector<HTMLInputElement>(
    'input[data-id="submodel-editor"]',
  )!;
  const autoRewriteToggle = document.querySelector<HTMLInputElement>(
    'input[data-id="submodel-auto-rewrite"]',
  )!;
  const syncSubmodelToggles = () => {
    autoRewriteToggle.disabled = !editorToggle.checked;
    if (autoRewriteToggle.disabled) autoRewriteToggle.checked = false;
  };
  syncSubmodelToggles();
  editorToggle.addEventListener("change", syncSubmodelToggles);
  const readUi = () => {
    syncSubmodelToggles();
    settings.enabled = (document.getElementById("master") as HTMLInputElement).checked;
    for (const group of exclusiveGroups) {
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
      else if (id === "dialogue-theme") settings.dialogueThemeEnabled = node.checked;
      else if (id === "image-optimization") settings.imageOptimizationEnabled = node.checked;
      else if (id === "card-image-catalog") settings.cardImageCatalogEnabled = node.checked;
      else if (id === "sola-nsfw-tracker") settings.solaNsfwTrackerEnabled = node.checked;
      else if (id === "sola-sex-tracker") settings.solaSexTrackerEnabled = node.checked;
      else if (id === "gemma-fix") settings.gemmaFixEnabled = node.checked;
      else if (id === "sound-notifications") settings.soundNotificationsEnabled = node.checked;
      else if (id === "submodel-editor") settings.submodelEditorEnabled = node.checked;
      else if (id === "submodel-auto-rewrite") settings.submodelAutoRewriteEnabled = node.checked;
    }
  };
  readUi();
  let savedState = JSON.stringify(settings);
  const tokenPanel = document.getElementById("token-estimate-panel")!;
  const tokenHostContext = await getHostMacroContext(character).catch(() => ({
    characterName: character?.nickname || character?.name || "Character",
    userName: "User",
    cardImageCatalog: collectCardImages(character),
  }));
  let tokenPreviewVersion = 0;
  const refreshTokenEstimate = async () => {
    const version = ++tokenPreviewVersion;
    try {
      const estimate = await estimatePluginPromptTokens(
        preset,
        structuredClone(settings),
        tokenHostContext,
      );
      if (
        version === tokenPreviewVersion &&
        document.getElementById("token-estimate-panel") === tokenPanel
      )
        tokenPanel.innerHTML = tokenEstimateHtml(estimate, preset);
    } catch (error) {
      if (
        version === tokenPreviewVersion &&
        document.getElementById("token-estimate-panel") === tokenPanel
      )
        tokenPanel.textContent = "Chưa thể ước tính token prompt.";
      console.warn("[TomiSakae VN-RP] Could not estimate prompt tokens.", error);
    }
  };
  const refreshTokenEstimateFromUi = async () => {
    readUi();
    await refreshTokenEstimate();
  };
  for (const node of document.querySelectorAll<HTMLInputElement>('input[data-kind="choice"]')) {
    node.addEventListener("change", async () => {
      const detail = document.querySelector<HTMLElement>(
        `[data-choice-detail="${node.dataset.group}"]`,
      );
      if (detail) detail.textContent = node.dataset.detail ?? "";
      await refreshTokenEstimateFromUi();
    });
  }
  document.getElementById("master")!.addEventListener("change", refreshTokenEstimateFromUi);
  for (const node of document.querySelectorAll<HTMLInputElement>(
    'input[type="checkbox"][data-kind]',
  )) {
    if (
      node.dataset.kind === "prompt" ||
      node.dataset.id === "vietnamese-output" ||
      node.dataset.id === "image-optimization" ||
      node.dataset.id === "card-image-catalog" ||
      node.dataset.id === "sola-nsfw-tracker" ||
      node.dataset.id === "sola-sex-tracker" ||
      node.dataset.id === "gemma-fix" ||
      node.dataset.id === "dialogue-theme"
    )
      node.addEventListener("change", refreshTokenEstimateFromUi);
  }
  document
    .querySelector<HTMLInputElement>('input[data-id="sound-notifications"]')
    ?.addEventListener("change", (event) => {
      playCompletionSound((event.currentTarget as HTMLInputElement).checked, true);
    });
  let closing = false;
  document.getElementById("close")!.addEventListener("click", async () => {
    if (closing) return;
    closing = true;
    try {
      readUi();
      if (
        JSON.stringify(settings) !== savedState &&
        !(await Risuai.alertConfirm("Có thay đổi chưa lưu. Đóng và bỏ các thay đổi này?"))
      )
        return;
      await Risuai.hideContainer();
    } finally {
      closing = false;
    }
  });
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
  for (const node of document.querySelectorAll<HTMLInputElement>("input[data-family]")) {
    node.addEventListener("change", async () => {
      readUi();
      profile.settings = switchPresetFamily(
        settings,
        presetSources[normalizePresetFamily(node.dataset.family)].preset,
      );
      normalizeFamilyChoices(sourceForSettings(profile.settings), profile.settings);
      await saveSettings();
      await showSettings();
      document.getElementById("status")!.textContent = "Đã lưu bộ nền và giữ lựa chọn Global.";
    });
  }
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
  document.getElementById("rename-preset")!.addEventListener("click", async () => {
    try {
      renameConfigPreset(
        configPresets,
        profile.id,
        (document.getElementById("rename-preset-name") as HTMLInputElement).value,
      );
      await saveSettings();
      await showSettings();
      document.getElementById("status")!.textContent = `Đã đổi tên preset thành “${profile.name}”.`;
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : "Không thể đổi tên preset.";
    }
  });
  document.getElementById("delete-preset")!.addEventListener("click", async () => {
    try {
      deleteConfigPreset(configPresets, profile.id);
      await saveSettings();
      await showSettings();
      document.getElementById("status")!.textContent = "Đã xóa preset.";
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : "Không thể xóa preset.";
    }
  });
  document.getElementById("save")!.addEventListener("click", async () => {
    readUi();
    if (settings.soundNotificationsEnabled && notificationAudio?.state !== "running")
      playCompletionSound(true, true);
    profile.settings = structuredClone(settings);
    await saveSettings();
    savedState = JSON.stringify(profile.settings);
    status.textContent = `Đã lưu preset “${profile.name}”.`;
  });
  document.getElementById("reset")!.addEventListener("click", async () => {
    profile.settings = createDefaultSettings(preset);
    await saveSettings();
    await showSettings();
    document.getElementById("status")!.textContent =
      `Đã khôi phục cấu hình của preset “${profile.name}” về mặc định của ${family.name}.`;
  });
  await refreshTokenEstimate();
  await Risuai.showContainer("fullscreen");
}

function mainGeneration(type: string): boolean {
  return type === "model";
}

async function getHostDialogueTheme() {
  try {
    const colors = await Risuai.getColorScheme?.();
    return resolveDialogueTheme(colors?.scheme);
  } catch {
    return undefined;
  }
}

async function getHostMacroContext(character: HostCharacter | null): Promise<HostMacroContext> {
  const [database, dialogueTheme] = await Promise.all([
    Risuai.getDatabase(["personas", "selectedPersona", "maxContext", "maxResponse"]),
    getHostDialogueTheme(),
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
    cardImageCatalog: collectCardImages(character),
    ...(dialogueTheme ? { dialogueTheme } : {}),
  };
}

const historyCleanups = new Map<string, Promise<void>>();

function appendInternalState(content: string, state: string): string {
  if (/<internal_states\b/i.test(content)) return content;
  const body = content.trimEnd();
  return body ? `${body}\n${state}` : state;
}

function isHistoryComment(message: HostChatMessage): boolean {
  return isChatComment({
    content: String(message.data ?? ""),
    ...(message.isComment === undefined ? {} : { isComment: message.isComment }),
  });
}

function savedHistorySignature(chat: HostChatSnapshot): string {
  return [
    String(chat.id ?? ""),
    ...(chat.message ?? []).map((entry) =>
      [
        entry.chatId ?? "",
        entry.role ?? "",
        entry.isComment ?? false,
        String(entry.data ?? ""),
        entry.swipeId ?? "",
        JSON.stringify(entry.swipes ?? []),
        entry.ff54InternalState ?? "",
        JSON.stringify(entry.solaHistory ?? {}),
      ].join("\u0001"),
    ),
  ].join("\u0002");
}

function syncRestoredStatesToRequest(
  messages: ChatMessage[],
  chat: HostChatSnapshot,
  preset: FfPreset,
  settings: FfGlobalSettings,
): ChatMessage[] {
  const assistantHistory = (chat.message ?? []).filter(
    (entry) => entry.role === "char" && !isHistoryComment(entry),
  );
  const used = new Set<number>();
  const comparisonSettings = {
    ...settings,
    regexEnabled: Object.fromEntries(
      familyRegexScripts(preset).map((script) => [
        script.id,
        script.scriptName?.startsWith("Sola Saver:") === true ||
          (script.scriptName?.startsWith("Sola Reasoning:") === true &&
            script.promptOnly === true &&
            settings.regexEnabled[script.id] === true),
      ]),
    ),
  };
  const solaBody = (content: string) =>
    applyRegexScripts(content, preset, comparisonSettings, {
      placement: PLACEMENT_AI_OUTPUT,
      prompt: true,
      history: true,
      depth: Number.MAX_SAFE_INTEGER,
    });
  return messages.map((message) => {
    if (message.role !== "assistant" || message.isComment === true || isPluginMemo(message.memo))
      return message;
    const matchIndex = assistantHistory.findIndex((entry, index) => {
      if (used.has(index)) return false;
      const data = String(entry.data ?? "");
      const swipeData =
        Array.isArray(entry.swipes) &&
        typeof entry.swipeId === "number" &&
        typeof entry.swipes[entry.swipeId] === "string"
          ? entry.swipes[entry.swipeId]!
          : undefined;
      const activeData = swipeData ?? data;
      if (familyOf(preset) === "sola") {
        const snapshot = entry.solaHistory?.[solaHistorySwipeKey(entry.swipeId)];
        const restoredSnapshot = snapshot
          ? restoreSolaHistoryContent(snapshot.visible, snapshot)
          : undefined;
        if (
          snapshot &&
          (message.content === snapshot.visible || message.content === restoredSnapshot)
        )
          return true;
        if (
          message.memo !== undefined &&
          message.memo === entry.chatId &&
          solaBody(message.content) === solaBody(activeData)
        )
          return true;
      }
      if (activeData === message.content) return true;
      const state = extractInternalStateBlock(activeData);
      return (
        state !== undefined && activeData.replace(state, "").trimEnd() === message.content.trimEnd()
      );
    });
    if (matchIndex < 0) return message;
    used.add(matchIndex);
    const matchedEntry = assistantHistory[matchIndex];
    const matchedSnapshot = matchedEntry?.solaHistory?.[solaHistorySwipeKey(matchedEntry.swipeId)];
    const restored = matchedSnapshot
      ? restoreSolaHistoryContent(matchedSnapshot.visible, matchedSnapshot)
      : Array.isArray(matchedEntry?.swipes) &&
          typeof matchedEntry.swipeId === "number" &&
          typeof matchedEntry.swipes[matchedEntry.swipeId] === "string"
        ? matchedEntry.swipes[matchedEntry.swipeId]!
        : String(matchedEntry?.data ?? "");
    const restoreTrackers =
      matchedSnapshot !== undefined ||
      (Array.isArray(matchedEntry?.swipes) &&
        typeof matchedEntry.swipeId === "number" &&
        typeof matchedEntry.swipes[matchedEntry.swipeId] === "string" &&
        matchedEntry.swipes[matchedEntry.swipeId] !== String(matchedEntry.data ?? "") &&
        /<(?:nsfw_nsfl_ban_list|sex_tracker)\b/i.test(restored));
    return restored && (restored !== message.content || restoreTrackers)
      ? {
          ...message,
          ...(restored !== message.content ? { content: restored } : {}),
          ...(restoreTrackers ? { vnRpRestoreSolaTrackers: true } : {}),
        }
      : message;
  });
}

/** Serialize request updates with the background history restorer. */
function updateSavedHistory<T>(
  characterIndex: number,
  chatIndex: number,
  update: () => Promise<T>,
): Promise<T> {
  const key = editorChatKey(characterIndex, chatIndex);
  const active = historyCleanups.get(key);
  const current = (async () => {
    await active?.catch(() => {});
    return update();
  })().finally(() => {
    if (historyCleanups.get(key) === lock) historyCleanups.delete(key);
  });
  const lock = current.then(
    () => {},
    () => {},
  );
  historyCleanups.set(key, lock);
  return current;
}

async function prepareRestoredRequest(
  messages: ChatMessage[],
  preset: FfPreset,
  settings: FfGlobalSettings,
  characterIndex: number,
  chatIndex: number,
): Promise<ChatMessage[]> {
  return updateSavedHistory(characterIndex, chatIndex, async () => {
    const chat = await Risuai.getChatFromIndex(characterIndex, chatIndex);
    return chat ? syncRestoredStatesToRequest(messages, chat, preset, settings) : messages;
  });
}

async function cleanSavedHistory(
  settings: FfGlobalSettings,
  characterIndex: number,
  chatIndex: number,
  skipStreaming = false,
): Promise<boolean> {
  const preset = sourceForSettings(settings);
  const chat = await Risuai.getChatFromIndex(characterIndex, chatIndex);
  if (!chat?.message?.length || (skipStreaming && chat.isStreaming)) return true;
  const sourceSignature = savedHistorySignature(chat);

  const sourceMessages: ChatMessage[] = chat.message.map((message) => ({
    role: message.role === "char" ? "assistant" : "user",
    content: String(message.data ?? ""),
    isComment: isHistoryComment(message),
  }));
  let changed = false;
  const restoredMessages = sourceMessages.map((source, index) => {
    const entry = chat.message![index]!;
    if (source.role !== "assistant" || source.isComment === true) return source;
    if (familyOf(preset) === "sola") {
      const restored = restoreSolaHistoryContent(
        source.content,
        entry.solaHistory?.[solaHistorySwipeKey(entry.swipeId)],
      );
      return restored === source.content ? source : { ...source, content: restored };
    }
    const currentState = extractInternalStateBlock(source.content);
    const storedState =
      typeof entry.ff54InternalState === "string" && entry.ff54InternalState.trim()
        ? entry.ff54InternalState
        : undefined;
    if (currentState && currentState !== storedState) {
      entry.ff54InternalState = currentState;
      changed = true;
    }
    const state = currentState ?? storedState;
    if (!state || !keepsInternalStateInHistory(sourceMessages, source, preset, settings))
      return source;
    const restored = appendInternalState(source.content, state);
    return restored === source.content ? source : { ...source, content: restored };
  });
  const removals = new Map<ChatMessage, SolaHistoryRemoval[]>();
  const cleanedMessages = applyPromptRegexToMessages(restoredMessages, preset, settings, {
    history: true,
    ...(familyOf(preset) === "sola"
      ? {
          onHistoryRemoval: (source: ChatMessage, offset: number, text: string) => {
            const parts = removals.get(source) ?? [];
            parts.push({ offset, text });
            removals.set(source, parts);
          },
        }
      : {}),
  });
  const message = chat.message.map((entry, index) => {
    const content = cleanedMessages[index]?.content ?? String(entry.data ?? "");
    const parts = removals.get(restoredMessages[index]!);
    if (parts?.length) {
      const snapshot = { visible: content, removals: parts };
      const key = solaHistorySwipeKey(entry.swipeId);
      if (JSON.stringify(entry.solaHistory?.[key]) !== JSON.stringify(snapshot)) {
        entry.solaHistory = { ...entry.solaHistory, [key]: snapshot };
        changed = true;
      }
    }
    if (content !== String(entry.data ?? "")) changed = true;
    return content === entry.data ? entry : { ...entry, data: content };
  });
  if (changed) {
    const latest = await Risuai.getChatFromIndex(characterIndex, chatIndex);
    if (
      !latest ||
      (skipStreaming && latest.isStreaming) ||
      savedHistorySignature(latest) !== sourceSignature
    )
      return false;
    await Risuai.setChatToIndex(characterIndex, chatIndex, { ...chat, message });
  }
  return true;
}

async function cleanSavedHistoryOnce(
  settings: FfGlobalSettings,
  characterIndex: number,
  chatIndex: number,
  skipStreaming = false,
): Promise<void> {
  await updateSavedHistory(characterIndex, chatIndex, async () => {
    // A host swipe/new-message write can land while the snapshot is being
    // restored. Retry from the newest chat instead of sending a stale request.
    for (let attempt = 0; attempt < 4; attempt += 1) {
      if (await cleanSavedHistory(settings, characterIndex, chatIndex, skipStreaming)) return;
    }
  });
}

let historyRestoreTimer: unknown;

async function restoreActiveHistory(): Promise<void> {
  if (pluginUnloaded) return;
  const [character, characterIndex, chatIndex] = await Promise.all([
    Risuai.getCharacter(),
    Risuai.getCurrentCharacterIndex(),
    Risuai.getCurrentChatIndex(),
  ]);
  cardIdsByIndex.set(characterIndex, character?.chaId);
  const settings = presetForCard(configPresets, character?.chaId).settings;
  if (!settings.enabled) return;
  await cleanSavedHistoryOnce(settings, characterIndex, chatIndex, true);
}

function startHistoryRestoreWatcher(): void {
  const globals = globalThis as unknown as {
    setInterval?: (callback: () => void, timeout: number) => unknown;
  };
  if (typeof globals.setInterval !== "function") return;
  // PocketRisu has no public chat-delete/branch event. Polling the active
  // snapshot lets a deletion, swipe change, or new branch restore its nearest
  // retained internal state back into the visible history without waiting for
  // another request.
  void restoreActiveHistory().catch((error) =>
    console.warn("[TomiSakae VN-RP] Could not restore active history.", error),
  );
  historyRestoreTimer = globals.setInterval(() => {
    void restoreActiveHistory().catch((error) =>
      console.warn("[TomiSakae VN-RP] Could not restore active history.", error),
    );
  }, 250);
}

function stopHistoryRestoreWatcher(): void {
  const globals = globalThis as unknown as {
    clearInterval?: (timer: unknown) => void;
  };
  if (historyRestoreTimer !== undefined && typeof globals.clearInterval === "function")
    globals.clearInterval(historyRestoreTimer);
  historyRestoreTimer = undefined;
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
  const preset = sourceForSettings(settings);
  await cleanSavedHistoryOnce(settings, characterIndex, chatIndex);
  const requestMessages = await prepareRestoredRequest(
    messages,
    preset,
    settings,
    characterIndex,
    chatIndex,
  );
  const macroContext = await getHostMacroContext(character);
  const built = await buildRequestMessages(
    requestMessages,
    preset,
    settings,
    async (content) => expandHostMacros(content, macroContext),
    {
      ...(macroContext.dialogueTheme ? { dialogueTheme: macroContext.dialogueTheme } : {}),
      ...(macroContext.cardImageCatalog ? { cardImageCatalog: macroContext.cardImageCatalog } : {}),
    },
  );
  if (editorListenerRegistered) {
    try {
      const key = editorChatKey(characterIndex, chatIndex);
      mainCompletionMonitor.finish(key);
      editorRequests.delete(key);
      const chat = await Risuai.getChatFromIndex(characterIndex, chatIndex);
      if (chat) {
        const previousOutput = [...(chat.message ?? [])]
          .reverse()
          .find((message) => message.role === "char" && !isHistoryComment(message));
        const context: PendingEditorRequest = {
          cardId: character?.chaId,
          presetFamily: familyOf(preset),
          chatId: chat.id,
          messages: structuredClone(built),
          historyMessageIds: (chat.message ?? []).flatMap((message) =>
            typeof message.chatId === "string" ? [message.chatId] : [],
          ),
          ...(previousOutput
            ? {
                previousOutput: {
                  id: previousOutput.chatId,
                  swipeId: previousOutput.swipeId,
                  content: restoreSolaHistoryContent(
                    String(previousOutput.data ?? ""),
                    previousOutput.solaHistory?.[solaHistorySwipeKey(previousOutput.swipeId)],
                  ),
                },
              }
            : {}),
        };
        editorRequests.set(key, context);
        if (settings.soundNotificationsEnabled) {
          mainCompletionMonitor.start(key, {
            characterIndex,
            chatIndex,
            chatId: chat.id,
            onIncomplete: () => {
              if (editorRequests.get(key) !== context || context.outputHandled) return;
              context.outputHandled = true;
              const current = presetForCard(configPresets, context.cardId).settings;
              playCompletionSound(current.enabled && current.soundNotificationsEnabled, false);
            },
          });
        }
      }
    } catch (error) {
      editorRequests.clear();
      console.warn(
        "[TomiSakae VN-RP] Could not capture Submodel context; keeping main generation.",
        error,
      );
    }
  } else {
    editorRequests.clear();
  }
  void editorButton
    ?.refresh()
    .catch((error) => console.warn("[TomiSakae VN-RP] Could not refresh rewrite button.", error));
  return built;
};

const displayOutput = async (content: string): Promise<string> => {
  const settings = (await activeConfigPreset()).settings;
  if (!settings.enabled) return content;
  const preset = sourceForSettings(settings);
  const theme = settings.dialogueThemeEnabled !== false ? await getHostDialogueTheme() : undefined;
  const renderSource =
    familyOf(preset) === "sola"
      ? adaptSolaSceneHeaderForDisplay(content, settings.vietnameseOutputEnabled)
      : content;
  const displayed = applyRegexScripts(renderSource, preset, settings, {
    placement: PLACEMENT_AI_OUTPUT,
    markdown: true,
    depth: 0,
    ...(theme ? { dialogueTheme: theme } : {}),
  });
  if (familyOf(preset) !== "ff54") return displayed;
  return adaptVietnameseHeaderForRisuAI(adaptDisplayMarkupForRisuAI(displayed));
};

async function readSubmodelResult(
  value: unknown,
  signal: AbortSignal,
): Promise<string | undefined> {
  if (signal.aborted) {
    const stream = (value as { type?: string; result?: ReadableStream } | null)?.result;
    if ((value as { type?: string } | null)?.type === "streaming" && stream?.cancel)
      void stream.cancel().catch(() => {});
    throw signal.reason;
  }
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
  const cancel = () => {
    void reader.cancel().catch(() => {});
  };
  signal.addEventListener("abort", cancel, { once: true });
  let output = "";
  try {
    while (true) {
      const chunk = await reader.read();
      if (signal.aborted) throw signal.reason;
      // PocketRisu stream chunks contain the full response so far.
      if (chunk.value) output = Object.values(chunk.value)[0] ?? output;
      if (chunk.done) return output || undefined;
    }
  } finally {
    signal.removeEventListener("abort", cancel);
    reader.releaseLock();
  }
}

function splitEditorReasoning(text: string): { prefix: string; response: string } {
  // PocketRisu prepends provider reasoning to both streamed and complete results.
  // Keep the main reply's prefix unchanged; the editor's own reasoning is not an edit.
  const prefix = text.match(/^(?:\s*<(Thoughts|think)>[\s\S]*?<\/\1>\s*)+/i)?.[0] ?? "";
  return { prefix, response: text.slice(prefix.length) };
}

function splitEditorResponse(text: string, preset: FfPreset): { prefix: string; response: string } {
  if (familyOf(preset) === "sola") return splitSolaReasoning(text);
  const reasoning = splitEditorReasoning(text);
  const header = splitBeforeSceneHeader(reasoning.response);
  return { prefix: reasoning.prefix + header.prefix, response: header.response };
}

async function runSubmodelEditor(
  context: PendingEditorRequest,
  response: string,
  controller: AbortController,
): Promise<string | undefined> {
  const preset = presetSources[normalizePresetFamily(context.presetFamily)].preset;
  const references = buildEditorReferenceMessages(
    context.messages,
    context.responseId,
    context.historyMessageIds,
  );
  const messages = insertSubmodelEditorSystem(references, preset);
  const prefix = pluginMemoPrefix(preset);
  messages.push({
    role: "assistant",
    content: response,
    memo: `${prefix}submodel-editor-source`,
  });
  messages.push({
    role: "user",
    content: editorUserFor(preset),
    memo: `${prefix}submodel-editor-target`,
  });
  const { signal } = controller;
  if (signal.aborted) throw signal.reason;
  let onAbort!: () => void;
  const stopped = new Promise<never>((_resolve, reject) => {
    onAbort = () => {
      reject(signal.reason);
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
  const timer = setTimeout(() => {
    controller.abort(new Error("Submodel đã quá thời gian chờ 10 phút, giữ nguyên phản hồi gốc."));
  }, 600_000);
  try {
    return await Promise.race([
      Risuai.runLLMModel({ mode: "submodel", messages, allowPlugins: false }).then((value) =>
        readSubmodelResult(value, signal),
      ),
      stopped,
    ]);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", onAbort);
  }
}

/** Resolve only the completed main reply, once per generation (including misses). */
async function resolveCompletedPregnancy(
  event: ChatOutputListenerArgument,
  context: PendingEditorRequest,
): Promise<void> {
  const { characterIndex, chatIndex, messageIndex } = event;
  const key = editorChatKey(characterIndex, chatIndex);
  if (context.pregnancyHandled) return;
  await updateSavedHistory(characterIndex, chatIndex, async () => {
    const settings = presetForCard(configPresets, context.cardId).settings;
    const preset = sourceForSettings(settings);
    if (
      pluginUnloaded ||
      editorRequests.get(key) !== context ||
      context.pregnancyHandled ||
      !settings.enabled ||
      !settings.solaSexTrackerEnabled ||
      familyOf(preset) !== "sola" ||
      context.presetFamily !== "sola"
    )
      return;
    const samples: number[] = [];
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const chat = await Risuai.getChatFromIndex(characterIndex, chatIndex);
      const entry = chat?.message?.[messageIndex];
      const output = event.chat.message?.[messageIndex];
      if (
        editorRequests.get(key) !== context ||
        !chat ||
        chat.isStreaming ||
        chat.id !== event.chat.id ||
        context.chatId !== chat.id ||
        messageIndex !== (chat.message?.length ?? 0) - 1 ||
        !output ||
        entry?.role !== "char" ||
        isHistoryComment(entry) ||
        entry.chatId !== output?.chatId ||
        entry.swipeId !== output.swipeId
      )
        return;
      const swipeKey = solaHistorySwipeKey(entry.swipeId);
      const original = String(entry.data ?? "");
      const source = restoreSolaHistoryContent(original, entry.solaHistory?.[swipeKey]);
      const response = splitEditorResponse(source, preset);
      if (
        (context.previousOutput !== undefined &&
          entry.chatId === context.previousOutput.id &&
          entry.swipeId === context.previousOutput.swipeId &&
          source === context.previousOutput.content) ||
        splitEditorResponse(String(output.data ?? ""), preset).response.trimStart() !==
          response.response.trimStart() ||
        !completeAutoRewriteResponse(source, preset)
      )
        return;
      let sampleIndex = 0;
      const resolved = resolveSolaPregnancy(response.response, () => {
        const index = sampleIndex++;
        if (samples[index] === undefined) {
          const crypto = globalThis.crypto;
          samples[index] = crypto?.getRandomValues
            ? crypto.getRandomValues(new Uint32Array(1))[0]! / 0x100000000
            : Math.random();
        }
        return samples[index]!;
      });
      const content = response.prefix + resolved;
      if (content === source) {
        context.pregnancyHandled = true;
        return;
      }
      const latest = await Risuai.getChatFromIndex(characterIndex, chatIndex);
      if (editorRequests.get(key) !== context) return;
      if (!latest || savedHistorySignature(latest) !== savedHistorySignature(chat)) continue;
      const archive = { ...entry.solaHistory };
      delete archive[swipeKey];
      const updated: HostChatMessage = { ...entry, data: content, solaHistory: archive };
      if (
        Array.isArray(entry.swipes) &&
        typeof entry.swipeId === "number" &&
        typeof entry.swipes[entry.swipeId] === "string"
      ) {
        updated.swipes = [...entry.swipes];
        updated.swipes[entry.swipeId] = content;
      }
      // Mark before writing: a host may emit another output event for this save.
      context.pregnancyHandled = true;
      try {
        await Risuai.setChatToIndex(characterIndex, chatIndex, {
          ...chat,
          message: chat.message!.map((message) => (message === entry ? updated : message)),
        });
      } catch (error) {
        context.pregnancyHandled = false;
        throw error;
      }
      return;
    }
    throw new Error("History changed while saving reproductive state.");
  });
}

const submodelOutputListener = async (event: ChatOutputListenerArgument): Promise<void> => {
  const { characterIndex, chatIndex, messageIndex, chat } = event;
  const key = editorChatKey(characterIndex, chatIndex);
  const context = editorRequests.get(key);
  const target = chat.message?.[messageIndex];
  const settings = presetForCard(configPresets, context?.cardId).settings;
  if (!context || context.chatId !== chat.id || chat.isStreaming) {
    await editorButton?.refresh();
    return;
  }
  if (settings.enabled && settings.solaSexTrackerEnabled && context.presetFamily === "sola")
    await resolveCompletedPregnancy(event, context);
  const firstOutput = !context.outputHandled;
  context.outputHandled = true;
  mainCompletionMonitor.finish(key);
  if (
    context &&
    context.chatId === chat.id &&
    messageIndex >= 0 &&
    messageIndex === (chat.message?.length ?? 0) - 1 &&
    target?.role === "char"
  ) {
    context.responseId = target.chatId;
    context.responseIndex = messageIndex;
    if (
      settings.enabled &&
      settings.submodelEditorEnabled &&
      settings.submodelAutoRewriteEnabled &&
      normalizePresetFamily(context.presetFamily) === familyOf(sourceForSettings(settings)) &&
      !chat.isStreaming &&
      !context.autoRewriteAttempted &&
      !editorRuns.has(key) &&
      completeAutoRewriteResponse(String(target.data ?? ""), sourceForSettings(settings))
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
    } else if (firstOutput) {
      playCompletionSound(settings.enabled && settings.soundNotificationsEnabled, true);
    }
  } else if (firstOutput) {
    playCompletionSound(settings.enabled && settings.soundNotificationsEnabled, true);
  }
  await editorButton?.refresh();
};

function completeAutoRewriteResponse(text: string, preset: FfPreset): boolean {
  if (familyOf(preset) !== "ff54") {
    const body = splitEditorResponse(text, preset).response.trim();
    if (!body) return false;
    const tracked =
      /<(\/?)(sola_hud|fengine|thought_engine|bond|date|story_notes|wardrobe|inventory|scene_cast|scene_state|char_matrix|solatag|tempo|cabinet|arrow|omen|nsfw_nsfl_ban_list|sex_tracker)\b[^>]*>/gi;
    const open: string[] = [];
    for (const match of body.matchAll(tracked)) {
      const tag = match[2]!.toLowerCase();
      if (match[1]) {
        if (open.pop() !== tag) return false;
      } else if (!/\/\s*>$/.test(match[0])) open.push(tag);
    }
    if (open.length) return false;
    return (body.match(/<!--/g)?.length ?? 0) === (body.match(/-->/g)?.length ?? 0);
  }
  const { response } = splitEditorResponse(text, preset);
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
    busy: editorRuns.has(editorChatKey(characterIndex, chatIndex)),
    available:
      context?.chatId === chat.id &&
      normalizePresetFamily(context?.presetFamily) === familyOf(sourceForSettings(settings)) &&
      context?.responseId === target.chatId &&
      context?.responseIndex === messageIndex,
  };
}

async function syncEditorButton(): Promise<void> {
  try {
    if (!editorButton) {
      const initialization = (editorButtonInitialization ??= createRewriteButton(
        Risuai,
        getEditorButtonTarget,
        rewriteLatestResponse,
        (target) => {
          const run = editorRuns.get(editorChatKey(target.characterIndex, target.chatIndex));
          if (run?.targetKey === target.key) run.controller.abort("cancel");
        },
      ));
      try {
        editorButton = await initialization;
      } finally {
        if (editorButtonInitialization === initialization) editorButtonInitialization = undefined;
      }
    }
    await editorButton?.refresh();
  } catch (error) {
    console.warn(
      "[TomiSakae VN-RP] Rewrite button requires PocketRisu's mainDom permission.",
      error,
    );
  }
}

async function rewriteLatestResponse(
  buttonTarget: RewriteButtonTarget,
  automatic = false,
): Promise<void> {
  const { characterIndex, chatIndex, messageIndex } = buttonTarget;
  const key = editorChatKey(characterIndex, chatIndex);
  const context = editorRequests.get(key);
  if (!context || editorRuns.has(key)) return;
  const profile = presetForCard(configPresets, context.cardId);
  const preset = sourceForSettings(profile.settings);
  const editorEnabled = () =>
    presetForCard(configPresets, context.cardId).id === profile.id &&
    familyOf(sourceForSettings(profile.settings)) === normalizePresetFamily(context.presetFamily) &&
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
  if (automatic && !completeAutoRewriteResponse(original, preset)) return;
  if (editorRuns.has(key)) return;
  const run = { controller: createEditorAbortController(), targetKey: buttonTarget.key };
  editorRuns.set(key, run);
  let notified = false;
  const notify = (success: boolean) => {
    if (notified) return;
    notified = true;
    playCompletionSound(
      profile.settings.enabled && profile.settings.soundNotificationsEnabled,
      success,
    );
  };
  try {
    await editorButton?.refresh();
    const source = splitEditorResponse(original, preset);
    // The history watcher may clean the same reply while Submodel is running.
    // Accept that exact configured cleanup, while still rejecting real edits.
    const cleanedOriginal =
      applyPromptRegexToMessages(
        chat.message!.map((message) => ({
          role: message.role === "char" ? "assistant" : "user",
          content: String(message.data ?? ""),
          isComment: isHistoryComment(message),
        })),
        preset,
        profile.settings,
        { history: true },
      )[messageIndex]?.content ?? original;
    const result = await runSubmodelEditor(context, source.response, run.controller);
    if (run.controller.signal.aborted) return;
    if (!editorEnabled() || editorRequests.get(key) !== context) return;
    if (result === undefined)
      throw new Error("Submodel không trả về nội dung, giữ nguyên phản hồi gốc.");
    const body = splitEditorResponse(result, preset).response;
    if (!body.trim()) throw new Error("Submodel trả về nội dung trống, giữ nguyên phản hồi gốc.");
    if (!editorEnabled() || editorRequests.get(key) !== context) return;
    const latestChat = await Risuai.getChatFromIndex(characterIndex, chatIndex);
    const latestMessage = latestChat?.message?.[messageIndex];
    const latestContent = String(latestMessage?.data ?? "");
    if (
      !latestChat ||
      latestChat.isStreaming ||
      latestChat.id !== chat.id ||
      messageIndex !== (latestChat.message?.length ?? 0) - 1 ||
      !latestMessage ||
      latestMessage.role !== "char" ||
      latestMessage.chatId !== target.chatId ||
      latestMessage.swipeId !== target.swipeId ||
      (latestContent !== original && latestContent !== cleanedOriginal)
    ) {
      notify(false);
      await Risuai.alert(
        "Phản hồi hoặc cuộc trò chuyện đã thay đổi trong lúc Submodel chạy, nên bản sửa chưa được lưu.",
      );
      return;
    }
    // Do not reinsert reasoning that has already been removed from history.
    const edited = splitEditorResponse(latestContent, preset).prefix + body;
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
    notify(true);
    await Risuai.alert(
      automatic
        ? "Đã tự động biên tập tiếng Việt bằng Submodel và thêm một phản hồi song song."
        : "Đã biên tập tiếng Việt bằng Submodel và thêm một phản hồi song song.",
    );
  } catch (error) {
    notify(false);
    if (run.controller.signal.reason === "cancel") return;
    console.warn("[TomiSakae VN-RP] Submodel editor failed; keeping main response.", error);
    await Risuai.alertError(
      error instanceof Error ? error.message : "Không thể lưu bản sửa từ Submodel.",
    );
  } finally {
    if (editorRuns.get(key) === run) editorRuns.delete(key);
    notify(false);
    await editorButton?.refresh();
  }
}

void (async () => {
  configPresets = normalizePresetStore(
    preset,
    await Risuai.pluginStorage.getItem(CONFIG_PRESETS_STORAGE_KEY),
    await Risuai.pluginStorage.getItem(STORAGE_KEY),
    presetSources,
  );
  for (const profile of configPresets.presets)
    normalizeFamilyChoices(sourceForSettings(profile.settings), profile.settings);
  await Risuai.pluginStorage.setItem(CONFIG_PRESETS_STORAGE_KEY, configPresets);
  const button = await Risuai.registerButton(
    { name: PLUGIN_DISPLAY_NAME, icon: "⚡", iconType: "html", location: "chat", id: BUTTON_ID },
    () => void showSettings(),
  );
  await Risuai.addRisuReplacer("beforeRequest", beforeRequest);
  await Risuai.addRisuScriptHandler("display", displayOutput);
  try {
    await Risuai.addRisuChatListener("output", submodelOutputListener);
    editorListenerRegistered = true;
  } catch (error) {
    console.warn("[TomiSakae VN-RP] Submodel editor requires PocketRisu's chat output API.", error);
  }
  startHistoryRestoreWatcher();
  await syncEditorButton();
  await Risuai.onUnload(async () => {
    pluginUnloaded = true;
    stopHistoryRestoreWatcher();
    mainCompletionMonitor.dispose();
    await notificationAudio?.close?.().catch(() => {});
    const unregisterEditor = editorListenerRegistered;
    editorListenerRegistered = false;
    for (const run of editorRuns.values()) run.controller.abort("cancel");
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
