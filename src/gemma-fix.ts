export type GemmaNsfwLevel = 0 | 1 | 2 | 3 | 4;

const STRONG_NSFW_RULES =
  "{{char}} MUST NOT offer sex or readily accept sexual advances; NEVER invent lustful, submissive, dependent, or infatuated traits absent from card/lore, make sexual interest automatic, or rush intimacy; established personality, agency, boundaries, and earned relationship development MUST govern EVERY reaction and action";

const USER_NSFW_RULES =
  "{{user}} MUST NOT be assumed to like sex or want sexual activity; NEVER invent sexual desire, intent, or consent not expressed through words or actions directly written by the user";

const KINETIC_NSFW_RULES =
  "EVERY NSFW/NSFL scene MUST render graphic physical mechanics, raw anatomical and vernacular terminology, body mass shifting, leverage, tissue deformation, thermal-olfactory cues, fluid movement, viscosity and persistence, tissue trauma, pre-contact friction, fractured vocalizations and dirty talk, multi-partner choreography, and simultaneous multi-point stimulation across all erogenous zones; PACING MUST build progressively with tangible resistance and friction before climax, varying rhythm, pressure, pauses, and acceleration; PRIORITIZE visceral kinetic impact over internal emotional processing; when climax occurs, render the post-climax somatic aftermath";

const NSFW_PREFIXES = [
  "",
  "{{char}} should not offer sex or readily accept offers of sex; never invent lustful, submissive, dependent, or infatuated traits absent from the card/lore, ",
  `${STRONG_NSFW_RULES}, `,
  `${STRONG_NSFW_RULES}; ${USER_NSFW_RULES}, `,
  `${STRONG_NSFW_RULES}; ${USER_NSFW_RULES}; NPCs MUST NOT impulsively request, encourage, or accept risky sex; personal and social consequences MUST govern desire, dialogue, and actions, `,
] as const;

const VIETNAMESE_AND_IMAGES = `write all visible text in natural Vietnamese without em-dashes, with Latin-script names and no Hangul or foreign wording except required machine syntax; NEVER repeat or rephrase {{user}}'s words or write {{user}}'s dialogue, use many images at multiple suitable points throughout the response; use only available card/lore images matching the current state with exact image-tag syntax and identifiers supported by card/lore/schema; omit consecutive duplicate images; prioritize outfit changes > action/pose/physical state > expression; place each beside its matching beat with narration or dialogue between images; every NSFW action that occurs must still use a matching available NSFW image in exact supported syntax, even if {{char}} refuses or resists; depiction does not imply consent; action takes priority over facial expression; ${KINETIC_NSFW_RULES}.`;

export function normalizeGemmaNsfwLevel(value: unknown): GemmaNsfwLevel {
  return value === 0 || value === 1 || value === 3 || value === 4 ? value : 2;
}

export function gemmaFixPromptFor(level: unknown = 2): string {
  return `{{ ${NSFW_PREFIXES[normalizeGemmaNsfwLevel(level)]}${VIETNAMESE_AND_IMAGES} }}`;
}

export const GEMMA_FIX_PROMPT = gemmaFixPromptFor(2);
