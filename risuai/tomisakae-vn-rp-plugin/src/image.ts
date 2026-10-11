export const IMAGE_OPTIMIZATION_PROMPT = `<image_optimization>
Trigger: Card/lore provides images or image instructions.
Format: Follow card/lore image syntax, available identifiers, and placement rules.

Rules:
- Selection: Resolve the subject's current form, clothing, and setting where applicable; then choose an available image matching the visible action, expression, and pose.
- Placement: Place each image immediately before the narrative or dialogue it depicts, unless card/lore specifies another position. Keep it adjacent to the matching scene beat.
- Coverage: Illustrate meaningful changes throughout the response. Reassess images when action, expression, speaker, or scene focus changes; include later beats when suitable images remain available.
- Variety: Choose different suitable images as the depicted state changes. Repeat only when that state continues and no better match exists.
- Flow: Separate image commands with narrative or dialogue. Never place image commands consecutively, invent unavailable images, or add unrelated images to fill space.
</image_optimization>`;

const IMAGE_REASONING_REPLACEMENTS: ReadonlyArray<readonly [string, string]> = [
  [
    "You must list out concisely all the main rules in `<prose_rules>` to apply the correct narrative style to the scene.",
    "You must list out concisely all the main rules in `<prose_rules>` and `<image_optimization>` to apply the correct narrative style and image selection/placement to the scene.",
  ],
  [
    "Can I use <gfx_protocol> in this scene?",
    "Can I use <gfx_protocol> and `<image_optimization>` in this scene?",
  ],
  [
    "How can I apply `<gfx_protocol>` if logical?",
    "How can I apply `<gfx_protocol>` and `<image_optimization>` if logical?",
  ],
];

export function addImageReasoningGuidance(content: string): string {
  for (const [source, replacement] of IMAGE_REASONING_REPLACEMENTS)
    content = content.replace(source, replacement);
  return content;
}
