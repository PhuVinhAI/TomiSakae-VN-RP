import type { FfGlobalSettings, FfPreset, FfPrompt, FfRegexScript } from "./core.js";
import { adaptSolaSaver, SOLA_HEADER_SAVER } from "./sola-history.js";
import { SOLA_REASONING_SCRIPTS } from "./sola-reasoning.js";
import { adaptSolaCalendarPrompt, SOLA_CALENDAR_ID } from "./sola-calendar.js";
import {
  VIETNAMESE_OUTPUT_PROMPT,
  SOLA_VIETNAMESE_OUTPUT_PROMPT,
  VOYAGE_VIETNAMESE_OUTPUT_PROMPT,
  adaptSolaPromptForVietnamese,
  adaptVoyagePromptForVietnamese,
  adaptPromptForVietnamese,
} from "./vietnamese.js";
import {
  IMAGE_OPTIMIZATION_PROMPT,
  SOLA_IMAGE_OPTIMIZATION_PROMPT,
  VOYAGE_IMAGE_OPTIMIZATION_PROMPT,
  addImageReasoningGuidance,
} from "./image.js";
import {
  addVoyageJailbreakToReasoning,
  VOYAGE_FF54_JAILBREAK_CONTROL,
  VOYAGE_FF54_JAILBREAK_ID,
} from "./voyage-jailbreak.js";

export const PRESET_FAMILIES = [
  {
    id: "ff54",
    name: "Freaky Frankenstein 5.4",
    description: "GM theo task, mô phỏng thế giới và internal states.",
  },
  {
    id: "sola",
    name: "Sola V2 Flame",
    description: "Nhịp điện ảnh, giọng NPC riêng, Story Review và Showrunner HUD.",
  },
  {
    id: "voyage",
    name: "Voyage-Universal-v5",
    description: "GM PbtA, văn trực tiếp, thế giới mở và ghi chú ẩn.",
  },
] as const;

export type PresetFamilyId = (typeof PRESET_FAMILIES)[number]["id"];
export const VOYAGE_AUTOMATIC_PBTA_ID = "f7855edd-a399-4f2c-a376-317368b545ee";
export const VOYAGE_ABILITY_CHECK_VALUE_ID = "58b58785-f5e9-49c4-9cd5-a3bbe0297e74";
export interface PresetSource {
  preset: FfPreset;
  sourceName: string;
  sha256: string;
}
export type PresetSources = Record<PresetFamilyId, PresetSource>;

export function normalizePresetFamily(value: unknown): PresetFamilyId {
  return value === "sola" || value === "voyage" ? value : "ff54";
}

export function familyOf(preset: FfPreset): PresetFamilyId {
  return normalizePresetFamily(preset.family);
}

/** SillyTavern exports can include a placeholder order before the active order. */
export function presetOrder(preset: FfPreset) {
  return (
    (preset.prompt_order.find((entry) => entry.character_id === 100001) ?? preset.prompt_order[0])
      ?.order ?? []
  );
}

export function familyPrompts(preset: FfPreset): FfPrompt[] {
  return familyOf(preset) === "voyage"
    ? [...preset.prompts, VOYAGE_FF54_JAILBREAK_CONTROL]
    : preset.prompts;
}

export function familyRegexScripts(preset: FfPreset): FfRegexScript[] {
  const scripts = preset.extensions?.regex_scripts ?? [];
  return familyOf(preset) === "sola"
    ? [...SOLA_REASONING_SCRIPTS, ...scripts.map(adaptSolaSaver), SOLA_HEADER_SAVER]
    : scripts;
}

export { VOYAGE_FF54_JAILBREAK_ID };

export function pluginMemoPrefix(preset: FfPreset): string {
  return familyOf(preset) === "ff54" ? "ff54:" : `vn-rp:${familyOf(preset)}:`;
}

export function isPluginMemo(memo: unknown): boolean {
  return /^(?:ff54:|vn-rp:)/.test(String(memo ?? ""));
}

export function vietnameseOutputFor(preset: FfPreset): string {
  switch (familyOf(preset)) {
    case "sola":
      return SOLA_VIETNAMESE_OUTPUT_PROMPT;
    case "voyage":
      return VOYAGE_VIETNAMESE_OUTPUT_PROMPT;
    default:
      return VIETNAMESE_OUTPUT_PROMPT;
  }
}

export function adaptFamilyPrompt(
  content: string,
  preset: FfPreset,
  settings: FfGlobalSettings,
): string {
  if (familyOf(preset) === "ff54") {
    if (settings.vietnameseOutputEnabled) content = adaptPromptForVietnamese(content);
    if (settings.imageOptimizationEnabled) content = addImageReasoningGuidance(content);
    return content;
  }
  if (familyOf(preset) === "sola") {
    content = content
      .replace(
        "Use <scene_header> to establish opening locations, time skips, or major environment shifts.",
        "Begin every response with <scene_header> on its own line, after any reasoning and before narration or dialogue.",
      )
      .replace(
        "At the start of a scene, following a time skip, or upon arriving at a new location, place a panoramic cinematic header on its own line at the very top of your response:",
        "Begin every response with a panoramic cinematic header on its own line, after any reasoning and before narration or dialogue:",
      )
      .replace(
        "- Always start the roleplay with an establishing header on its own line at the very top of your first response.\n- Place on its own line BEFORE the opening paragraph of a new scene or after a major transition.\n- Do NOT repeat the header within the same continuous scene unless a significant time skip occurs.",
        "- Include the current scene header at the start of every response, even within the same continuous scene.",
      );
    if (settings.vietnameseOutputEnabled) {
      content = adaptSolaPromptForVietnamese(content);
    }
    content = adaptSolaCalendarPrompt(
      content,
      settings.promptEnabled[SOLA_CALENDAR_ID] === true,
      settings.vietnameseOutputEnabled,
    );
    if (settings.imageOptimizationEnabled) {
      content = content.replace(
        "- Map physical contact, displacement, or reflexive reaction.",
        "- Map physical contact, displacement, or reflexive reaction and matching image beats under Image Coverage.",
      );
    }
  } else {
    if (settings.vietnameseOutputEnabled) {
      content = adaptVoyagePromptForVietnamese(content);
    }
    if (settings.promptEnabled[VOYAGE_FF54_JAILBREAK_ID]) {
      content = addVoyageJailbreakToReasoning(content);
    }
    content = content
      .replace("* > blockquote for documents and chat messages\n", "")
      .replace("* ```codeblock``` for terminal and code\n", "");
    if (!settings.promptEnabled["54e77eae-eba6-49f4-b594-4266aaf19ef0"]) {
      content = content.replace(
        "GM is allowed to declare PC game over for any reason in any way at any time.\n",
        "",
      );
    }
    if (settings.imageOptimizationEnabled) {
      content = content.replace(
        "* explore three to five different ways to take the story",
        "* explore three to five different ways to take the story and matching image beats under Image Coverage",
      );
    }
  }
  return content;
}

export function imageOptimizationFor(preset: FfPreset): string {
  if (familyOf(preset) === "ff54") return IMAGE_OPTIMIZATION_PROMPT;
  if (familyOf(preset) === "voyage") return VOYAGE_IMAGE_OPTIMIZATION_PROMPT;
  return SOLA_IMAGE_OPTIMIZATION_PROMPT;
}
