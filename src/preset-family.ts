import type { FfGlobalSettings, FfPreset, FfPrompt, FfRegexScript } from "./core.js";
import { adaptSolaSaver, SOLA_HEADER_SAVER } from "./sola-history.js";
import { SOLA_REASONING_SCRIPTS } from "./sola-reasoning.js";
import { adaptSolaSoundPlacement } from "./sola-sound.js";
import {
  adaptSolaStyleDependencies,
  adaptSolaHudDependencies,
  solaList,
} from "./sola-prompt-dependencies.js";
import {
  VIETNAMESE_OUTPUT_PROMPT,
  SOLA_VIETNAMESE_OUTPUT_PROMPT,
  adaptSolaPromptForVietnamese,
  adaptPromptForVietnamese,
} from "./vietnamese.js";
import {
  IMAGE_OPTIMIZATION_PROMPT,
  SOLA_IMAGE_OPTIMIZATION_PROMPT,
  addImageReasoningGuidance,
} from "./image.js";

export const PRESET_FAMILIES = [
  {
    id: "ff54",
    name: "Freaky Frankenstein 5.4",
    status: "Ổn định",
    description: "GM theo task, mô phỏng thế giới và internal states.",
  },
  {
    id: "sola",
    name: "Sola V2 Flame",
    status: "Ổn định",
    description: "Nhịp điện ảnh, giọng NPC riêng, Story Review và Showrunner HUD.",
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
  return value === "sola" ? value : "ff54";
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
  return preset.prompts;
}

export function familyRegexScripts(preset: FfPreset): FfRegexScript[] {
  const scripts = preset.extensions?.regex_scripts ?? [];
  if (familyOf(preset) === "sola")
    return [...SOLA_REASONING_SCRIPTS, ...scripts.map(adaptSolaSaver), SOLA_HEADER_SAVER];
  return scripts;
}

export function pluginMemoPrefix(preset: FfPreset): string {
  return familyOf(preset) === "ff54" ? "ff54:" : `vn-rp:${familyOf(preset)}:`;
}

export function isPluginMemo(memo: unknown): boolean {
  return /^(?:ff54:|vn-rp:)/.test(String(memo ?? ""));
}

function activeSolaModules(preset: FfPreset, settings: FfGlobalSettings): Set<string> {
  const enabled = new Set(
    presetOrder(preset)
      .filter((entry) => settings.promptEnabled[entry.identifier])
      .map((entry) => entry.identifier),
  );
  const modules = new Set<string>();
  for (const prompt of preset.prompts) {
    if (!enabled.has(prompt.identifier) || prompt.marker || typeof prompt.content !== "string")
      continue;
    // Empty fragments in Sola's reset prompt do not enable a module.
    for (const match of prompt.content.matchAll(/\{\{setvar::(mod_[a-z_]+)::(?!\}\})/g))
      modules.add(match[1]!);
  }
  if (settings.solaNsfwTrackerEnabled) modules.add("mod_track_nsfw");
  if (settings.solaSexTrackerEnabled) modules.add("mod_track_sex");
  return modules;
}

function solaTrackersEnabled(modules: ReadonlySet<string>): boolean {
  return [...modules].some(
    (name) => name.startsWith("mod_track_") || name === "mod_solahud" || name === "mod_tempo",
  );
}

export function vietnameseOutputFor(preset: FfPreset, settings?: FfGlobalSettings): string {
  switch (familyOf(preset)) {
    case "sola": {
      if (!settings) return SOLA_VIETNAMESE_OUTPUT_PROMPT;
      const modules = activeSolaModules(preset, settings);
      let content = SOLA_VIETNAMESE_OUTPUT_PROMPT;
      const props = settings.promptEnabled["01a0c1ff-4ecf-701c-8c25-cccd4043f936"] === true;
      const displays = [
        ...(modules.has("mod_scene_header") ? ["headers"] : []),
        ...(modules.has("mod_solahud") ? ["HUDs"] : []),
        ...([...modules].some((name) => name.startsWith("mod_track_") || name === "mod_tempo")
          ? ["trackers"]
          : []),
        ...(props ? ["props"] : []),
      ];
      content = content.replace(
        ", and readable content in headers, HUDs, trackers, and props",
        displays.length ? `, and readable content in ${solaList(displays)}` : "",
      );
      const styles = [
        ...(modules.has("mod_color") ? ["palette"] : []),
        ...(modules.has("mod_gradient") ? ["gradient"] : []),
        ...(modules.has("mod_tone") ? ["tone"] : []),
        ...(modules.has("mod_kinetic") ? ["kinetic"] : []),
      ];
      content = content.replace(
        "palette/gradient/tone/kinetic names, ",
        styles.length ? `${styles.join("/")} names, ` : "",
      );
      if (!modules.has("mod_scene_header")) content = content.replace("sky identifiers, ", "");
      if (!modules.has("mod_track_fengine")) content = content.replace("T/F/D/Y codes, ", "");
      const values = [
        ...(modules.has("mod_tempo") ? ["tempo"] : []),
        ...(modules.has("mod_track_arrow") ? ["fate"] : []),
      ];
      content = content.replace(
        "tempo/fate values, ",
        values.length ? `${values.join("/")} values, ` : "",
      );
      if (!solaTrackersEnabled(modules)) content = content.replace(", and numeric mechanics", "");
      if (!displays.length)
        content = content.replace(", including display attributes and empty-state text", "");
      if (
        !props &&
        !modules.has("mod_scene_header") &&
        !modules.has("mod_solahud") &&
        !modules.has("mod_track_date")
      )
        content = content.replace(
          " Time uses Vietnamese day-period wording or a 24-hour clock.",
          "",
        );
      return content;
    }
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
    const modules = activeSolaModules(preset, settings);
    content = adaptSolaHudDependencies(content, modules);
    if (!solaTrackersEnabled(modules)) {
      content = content
        .replaceAll(" Trackers do not count towards word count.", "")
        .replace("5. **Suspend Trackers**: During OOC conversation omit all trackers.\n", "")
        .replace("6. **OOC Formatting**:", "5. **OOC Formatting**:");
    }
    if (!modules.has("mod_solahud")) content = content.replace("`<sola_hud>`, ", "");
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
    // Adapt localized examples and macro reminders together, preserving source comments.
    content = content
      .split(/(\{\{\/\/[\s\S]*?\}\})/g)
      .map((part) =>
        part.startsWith("{{//")
          ? part
          : adaptSolaSoundPlacement(adaptSolaStyleDependencies(part, modules)),
      )
      .join("");
    if (settings.imageOptimizationEnabled) {
      content = content.replace(
        "- Map physical contact, displacement, or reflexive reaction.",
        "- Map physical contact, displacement, or reflexive reaction and matching image beats under Image Coverage.",
      );
    }
  }
  return content;
}

export function imageOptimizationFor(preset: FfPreset): string {
  if (familyOf(preset) === "ff54") return IMAGE_OPTIMIZATION_PROMPT;
  return SOLA_IMAGE_OPTIMIZATION_PROMPT;
}
