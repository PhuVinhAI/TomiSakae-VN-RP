export const IMAGE_OPTIMIZATION_PROMPT = `<image_optimization>
Trigger: Card/lore provides image instructions.
Format: Follow card/lore image syntax and placement rules.

Rules:
- Coverage: Use multiple images across meaningful scene beats when supported. Place each beside the action or dialogue it depicts.
- Match: Match subject, action, expression, pose, clothing, and setting to the current moment.
- Variety: Select different suitable images as the scene changes. Avoid cycling through the same few images.
- Repetition: Repeat only when the depicted state continues. Avoid consecutive duplicates and long illustrated passages with only one image.
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
