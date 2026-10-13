import type { FfGlobalSettings, FfPreset } from "./core.js";
import {
  familyOf,
  familyPrompts,
  familyRegexScripts,
  presetOrder,
  VOYAGE_ABILITY_CHECK_VALUE_ID,
  VOYAGE_FF54_JAILBREAK_ID,
} from "./preset-family.js";
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
  return familyOf(preset) === "sola"
    ? [
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
      ]
    : [
        group(
          "pov",
          "Góc nhìn",
          "Chọn cách gọi nhân vật người chơi trong phần kể của GM.",
          "Không khóa góc nhìn",
          "Để model chọn theo card và các chỉ dẫn còn lại.",
          (n) => n.includes("PoV "),
        ),
        group(
          "ability-check",
          "Kiểm tra PbtA",
          "Chọn kết quả do plugin tạo tự động theo preset gốc hoặc chờ người dùng tung 2d6.",
          "Không kiểm tra PbtA",
          "Không chèn luật kiểm tra tự động hoặc thủ công, cũng không tạo giá trị kiểm tra năng lực.",
          (n) => n.includes("PbtA Ability Check"),
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
  if (familyOf(preset) === "voyage") return VOYAGE_SECTIONS.map((section) => ({ ...section }));
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
    ...(familyOf(preset) === "voyage" ? [VOYAGE_ABILITY_CHECK_VALUE_ID] : []),
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

const VOYAGE_SECTIONS: readonly PromptSection[] = [
  {
    id: "core",
    label: "Luật cốt lõi & lượt chơi",
    description: "Khung nhập vai, phân quyền người tham gia và thứ tự lượt.",
    open: true,
    promptIds: [
      "48727501-cb02-4bb4-8be7-17d47d48e05c",
      "efc68059-6257-4271-9a82-84c02c9b490e",
      "d1d5e6a0-3649-4683-aab9-9872a78750d3",
      "0edb52d9-7c28-4900-9d5a-29a9153cc60a",
      "d5743229-76f1-4ff4-b9a3-629eaecf3496",
      "e067f3e3-04ee-447b-b40c-eab74406c9bc",
      "867a59b8-8216-4d9f-bc24-222490ed0051",
      "54e77eae-eba6-49f4-b594-4266aaf19ef0",
    ],
  },
  {
    id: "world",
    label: "Thế giới, địa điểm & NPC",
    description: "Đời sống ngoài cảnh, quan hệ ghi nhớ tương tác và xây nhân vật, địa điểm.",
    open: false,
    promptIds: [
      "afdcb40c-3c4a-4669-8829-075057d83254",
      "dae41101-c072-454f-9b8b-6a648267d951",
      "a1bc631c-6727-4575-9376-880393ae5f10",
      "3be2b7a8-426c-4412-b282-56da106ac01a",
      "ecd8f1f2-5fdc-4b31-990d-3ceb11c621c1",
      "81f2b26e-f29b-4861-b3b6-a26dff63c9b1",
      "a76a2d6f-1771-4698-98f2-26f64b95630c",
      "3e752037-9e82-4834-81f2-e55ed6d750b7",
    ],
  },
  {
    id: "prose",
    label: "Văn xuôi, hội thoại & cử chỉ",
    description: "Lời thoại có mục đích, biểu hiện cơ thể thực tế và cách định dạng đầu ra.",
    open: false,
    promptIds: [
      "b7089457-20c8-4210-90ed-b0b6fc680ef3",
      "fa0a4c53-0653-48a8-a173-f5385afcab09",
      "2366d1f0-8e3b-4014-91b6-a9750fcece7a",
      "a7d883dc-3a5b-42d2-afc5-ab09d106e630",
      "43124371-15cd-4a30-903a-8b4e98e16354",
      "d3ba012d-031e-48f3-b98b-fe4feb4536db",
      "d590ac07-c0da-4f89-9c71-295f53a5bce0",
      "11600b2f-2ee0-4c23-8311-dbd9cba5276f",
    ],
  },
  {
    id: "state",
    label: "Hồ sơ ẩn",
    description: "Ghi chú GM cùng hồ sơ nhân vật và địa điểm, lưu trong comment XML.",
    open: true,
    promptIds: [
      "905b9207-5d9b-4531-a5b5-35fa4c575388",
      "766e1812-cc15-416b-9145-8ffce5036892",
      "8e0ea0b9-a1f2-46a1-b5b6-8ffa3a82435c",
    ],
  },
  {
    id: "adult",
    label: "Nội dung người lớn & hậu quả",
    description: "Chủ đề trưởng thành, ngôn ngữ trực diện và khả năng chịu hậu quả lâu dài.",
    open: false,
    promptIds: [
      VOYAGE_FF54_JAILBREAK_ID,
      "43769028-2d80-4b27-b795-bbbdf7730a44",
      "216aa279-7af9-401b-8d51-fea7cc725a43",
      "ee7a5f53-672d-4b32-a607-c976db5f32eb",
    ],
  },
  {
    id: "reasoning",
    label: "Suy luận & lời nhắc",
    description: "Lập hướng diễn biến, khuyến khích sáng tạo và nhắc lại luật trước lượt mới.",
    open: false,
    promptIds: [
      "b039bfa8-f628-4e55-b5fc-322d1434dba7",
      "2ac42672-234d-4d50-94b5-6d267771e8f7",
      "713e9dd1-366f-4f2a-9e4b-5e28b6ee63a5",
    ],
  },
];
