import type { FfGlobalSettings, FfPreset } from "./core.js";
import {
  VIETNAMESE_OUTPUT_PROMPT,
  SOLA_VIETNAMESE_OUTPUT_PROMPT,
  VOYAGE_VIETNAMESE_OUTPUT_PROMPT,
  SOLA_VIETNAMESE_REPLACEMENTS,
  VOYAGE_VIETNAMESE_REPLACEMENTS,
  adaptPromptForVietnamese,
} from "./vietnamese.js";
import { IMAGE_OPTIMIZATION_PROMPT, addImageReasoningGuidance } from "./image.js";

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
    if (settings.vietnameseOutputEnabled) {
      for (const [source, replacement] of SOLA_VIETNAMESE_REPLACEMENTS)
        content = content.replaceAll(source, replacement);
      content = content.replace(
        "- Voices: 3-Axis Audit (Diction, Cadence, Evasion).",
        "- Voices: 3-Axis Audit (Diction, Cadence, Evasion) in natural Vietnamese.",
      );
    }
    if (settings.imageOptimizationEnabled) {
      content = content.replace(
        "- Map physical contact, displacement, or reflexive reaction.",
        "- Map physical contact, displacement, or reflexive reaction and matching image beats under Image Coverage.",
      );
    }
  } else {
    if (settings.vietnameseOutputEnabled) {
      for (const [source, replacement] of VOYAGE_VIETNAMESE_REPLACEMENTS)
        content = content.replaceAll(source, replacement);
      content = content.replace(
        "* explore the goals, motivations and feelings of each NPC in the scene",
        "* explore the goals, motivations and feelings of each NPC in the scene and their natural Vietnamese voice",
      );
      content = content.replace(
        "4. reason what would be realistic for them to say",
        "4. reason what would be realistic for them to say in natural Vietnamese",
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
  const rules = IMAGE_OPTIMIZATION_PROMPT.split("\n").filter((line) => line.startsWith("- "));
  const intro =
    "When card/lore provides images, follow its image syntax and available identifiers; apply these placement and coverage rules.";
  return familyOf(preset) === "sola"
    ? `## Image Coverage\n${intro}\n${rules.join("\n")}`
    : `## Rule: Image Coverage\n${intro}\n${rules.map((line) => line.replace(/^- /, "* ")).join("\n")}`;
}
