import type { FfGlobalSettings, FfPreset } from "./core.js";
import { familyOf, familyPrompts, familyRegexScripts, presetOrder } from "./preset-family.js";
import { SOLA_SECTION_COPY, solaRegexUiCopy } from "./preset-ui-copy.js";
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
    description: string,
    offLabel: string,
    offDescription: string,
    match: (name: string) => boolean,
  ): ExclusivePromptGroup => ({
    id,
    label,
    description,
    memberIds: preset.prompts.filter((p) => match(p.name ?? "")).map((p) => p.identifier),
    offLabel,
    offDescription,
  });
  return [
    group(
      "user-agency",
      "Quyền điều khiển người dùng",
      "Chọn mức Sola được triển khai hành động và lời thoại của nhân vật người dùng.",
      "Không thêm luật điều khiển",
      "Không chèn hai module này; model xử lý theo các chỉ dẫn còn lại của card và preset.",
      (n) => n.startsWith("[Core] User:") || n.startsWith("[Core] User: Embellishment"),
    ),
    group(
      "anti-slop",
      "Mức lọc văn sáo",
      "Chọn bản đầy đủ hoặc bản ngắn để giảm các tật văn AI.",
      "Không lọc bổ sung",
      "Không chèn bộ lọc văn sáo riêng; Chuẩn văn xuôi & chống nhại vẫn hoạt động nếu được bật.",
      (n) => n.startsWith("[Core Extra]"),
    ),
    group(
      "dialogue-color",
      "Màu lời thoại",
      "Chọn màu đơn hoặc màu chuyển sắc cố định làm định dạng lời thoại chính.",
      "Không dùng màu lời thoại chính",
      "Tắt hai định dạng chính; các module sắc thái, chuyển sắc điểm nhấn và hiệu ứng chữ vẫn theo lựa chọn riêng.",
      (n) => n.includes("Default Voice:") && n.includes("Pick 1"),
    ),
    group(
      "pov",
      "Góc nhìn",
      "Chọn ngôi kể, mốc thời gian và giới hạn cảm nhận cho trần thuật của Sola.",
      "Không khóa góc nhìn",
      "Để model chọn theo card, lịch sử chat và các chỉ dẫn đang bật.",
      (n) => n.includes("[Core] POV:"),
    ),
    group(
      "pronouns",
      "Giới tính khi nhắc đến người dùng",
      "Chọn đại từ nữ, nam hoặc trung tính cho nhân vật người dùng.",
      "Theo persona & bối cảnh",
      "Không chèn module neo giới tính; model dựa trên persona và quan hệ trong cảnh.",
      (n) => n.startsWith("[Pronouns]"),
    ),
    group(
      "reasoning",
      "Rà soát truyện",
      "Chọn cách Sola rà soát cảnh trước khi viết. Các module giảm suy luận được bật riêng bên dưới.",
      "Không dùng rà soát tiêu chuẩn",
      "Tắt hai bản rà soát đầy đủ; bản chớp nhoáng và các module suy luận khác vẫn theo lựa chọn riêng.",
      (n) =>
        n.startsWith("[Reasoning]") &&
        (n.includes("Forced Sola") || n.includes("[Reasoning] Sola's Story Review")),
    ),
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
  const map = new Map(familyPrompts(preset).map((p) => [p.identifier, p]));
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
      const copy = SOLA_SECTION_COPY[prompt.identifier];
      current = {
        id: prompt.identifier,
        label: copy?.name ?? prompt.name.replace(/^━/, ""),
        description: copy?.description ?? "Các module bổ sung của Sola V2 Flame.",
        promptIds: [],
        open: sections.length === 0,
      };
      sections.push(current);
      continue;
    }
    if (typeof prompt.content !== "string" || !prompt.content.trim()) continue;
    if (!sections.includes(current)) sections.push(current);
    current.promptIds = [...current.promptIds, entry.identifier];
  }
  return sections.filter((s) => s.promptIds.length > 0);
}

export function familyHiddenPromptIds(preset: FfPreset): ReadonlySet<string> {
  if (familyOf(preset) === "ff54") return SOURCE_SEPARATOR_IDS;
  return new Set([
    ...preset.prompts.filter((p) => p.name?.startsWith("━")).map((p) => p.identifier),
  ]);
}

export function familyRegexGroups(preset: FfPreset): { label: string; ids: string[] }[] {
  const groups = new Map<string, string[]>();
  for (const script of familyRegexScripts(preset)) {
    const label =
      solaRegexUiCopy(script)?.group ??
      (script.promptOnly ? "Ngữ cảnh gửi model" : "Hiển thị & định dạng");
    const ids = groups.get(label) ?? [];
    ids.push(script.id);
    groups.set(label, ids);
  }
  return [...groups].map(([label, ids]) => ({ label, ids }));
}
