export type GemmaNsfwLevel = 0 | 1 | 2;

const NSFW_PREFIXES = [
  "",
  "{{char}} should not offer sex or readily accept offers of sex; never invent lustful traits absent from the card/lore, ",
  "{{char}} MUST NOT offer sex or readily accept sexual advances; NEVER invent lustful traits absent from card/lore, make sexual interest automatic, or rush intimacy; established personality, agency, boundaries, and earned relationship development MUST govern EVERY reaction and action, ",
] as const;

const VIETNAMESE_AND_IMAGES = `write all visible text in natural Vietnamese with Latin-script names and no Hangul or foreign wording except required machine syntax, use many images at multiple suitable points throughout the response; use only available card/lore images matching the current state with exact image-tag syntax and identifiers supported by card/lore/schema; omit consecutive duplicate images; prioritize outfit changes > action/pose/physical state > expression; place each beside its matching beat with narration or dialogue between images; every NSFW action that occurs must still use a matching available NSFW image in exact supported syntax, even if {{char}} refuses or resists; depiction does not imply consent; action takes priority over facial expression`;

export function normalizeGemmaNsfwLevel(value: unknown): GemmaNsfwLevel {
  return value === 0 || value === 1 ? value : 2;
}

export function gemmaFixPromptFor(level: unknown = 2): string {
  return `{{ ${NSFW_PREFIXES[normalizeGemmaNsfwLevel(level)]}${VIETNAMESE_AND_IMAGES} }}`;
}

export const GEMMA_FIX_PROMPT = gemmaFixPromptFor(2);
