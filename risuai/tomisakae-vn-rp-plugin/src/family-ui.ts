import type { FfGlobalSettings, FfPreset } from "./core.js";
import { familyOf, presetOrder } from "./preset-family.js";
import {
  EXCLUSIVE_PROMPT_GROUPS,
  HOST_MARKER_IDS,
  PROMPT_SECTIONS,
  SOURCE_SEPARATOR_IDS,
  normalizeExclusivePromptGroups,
  type ExclusivePromptGroup,
  type PromptSection,
} from "./ui-vi.js";

export function familyChoiceGroups(preset: FfPreset): readonly ExclusivePromptGroup[] {
  if (familyOf(preset) === "ff54") return EXCLUSIVE_PROMPT_GROUPS;
  const group = (
    id: string,
    label: string,
    match: (name: string) => boolean,
  ): ExclusivePromptGroup => ({
    id,
    label,
    description: "Chọn một module theo preset nguồn.",
    memberIds: preset.prompts.filter((p) => match(p.name ?? "")).map((p) => p.identifier),
    offLabel: "Không dùng",
    offDescription: "Tắt các module trong nhóm này.",
  });
  return familyOf(preset) === "sola"
    ? [
        group(
          "user-agency",
          "Quyền điều khiển người dùng",
          (n) => n.startsWith("[Core] User:") || n.startsWith("[Core] User: Embellishment"),
        ),
        group("anti-slop", "Mức lọc văn sáo", (n) => n.startsWith("[Core Extra]")),
        group(
          "dialogue-color",
          "Màu lời thoại",
          (n) => n.includes("Default Voice:") && n.includes("Pick 1"),
        ),
        group("pov", "Góc nhìn", (n) => n.includes("[Core] POV:")),
        group("pronouns", "Giới tính khi nhắc đến người dùng", (n) => n.startsWith("[Pronouns]")),
        group(
          "reasoning",
          "Story Review",
          (n) =>
            n.startsWith("[Reasoning]") &&
            (n.includes("Forced Sola") || n.includes("[Reasoning] Sola's Story Review")),
        ),
      ]
    : [
        group("pov", "Góc nhìn", (n) => n.includes("PoV ")),
        group("ability-check", "Kiểm tra PbtA", (n) => n.includes("PbtA Ability Check")),
      ];
}

export function normalizeFamilyChoices(preset: FfPreset, settings: FfGlobalSettings): void {
  if (familyOf(preset) === "ff54")
    return normalizeExclusivePromptGroups(settings, presetOrder(preset));
  for (const group of familyChoiceGroups(preset)) {
    const enabled = group.memberIds.filter((id) => settings.promptEnabled[id]);
    if (enabled.length <= 1) continue;
    const defaults = presetOrder(preset)
      .filter((p) => p.enabled !== false)
      .map((p) => p.identifier);
    const keep = enabled.find((id) => defaults.includes(id)) ?? enabled[0];
    for (const id of enabled) settings.promptEnabled[id] = id === keep;
  }
}

export function familyPromptSections(preset: FfPreset): PromptSection[] {
  const excluded = new Set([
    ...HOST_MARKER_IDS,
    ...familyChoiceGroups(preset).flatMap((g) => g.memberIds),
  ]);
  const sections: PromptSection[] = [];
  if (familyOf(preset) === "ff54") {
    sections.push(...PROMPT_SECTIONS);
    for (const section of sections) for (const id of section.promptIds) excluded.add(id);
    for (const id of SOURCE_SEPARATOR_IDS) excluded.add(id);
  }
  const map = new Map(preset.prompts.map((p) => [p.identifier, p]));
  let current: PromptSection = {
    id: "source",
    label: "Module của preset",
    description: "Theo thứ tự và tên module gốc.",
    promptIds: [],
    open: true,
  };
  for (const entry of presetOrder(preset)) {
    const prompt = map.get(entry.identifier);
    if (!prompt || prompt.marker || excluded.has(entry.identifier)) continue;
    if (familyOf(preset) === "sola" && prompt.name?.startsWith("━")) {
      current = {
        id: prompt.identifier,
        label: prompt.name.replace(/^━/, ""),
        description: "Nhóm trong Sola V2 Flame.",
        promptIds: [],
        open: sections.length === 0,
      };
      sections.push(current);
    }
    if (typeof prompt.content !== "string" || !prompt.content.trim()) continue;
    if (!sections.includes(current)) sections.push(current);
    current.promptIds = [...current.promptIds, entry.identifier];
  }
  return sections.filter((s) => s.promptIds.length > 0);
}
