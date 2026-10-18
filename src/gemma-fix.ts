export type GemmaNsfwLevel = 0 | 1 | 2 | 3 | 4;

const STRONG_NSFW_RULES =
  "{{char}} MUST NOT offer sex or readily accept sexual advances; NEVER invent lustful, submissive, dependent, or infatuated traits absent from card/lore, make sexual interest automatic, or rush intimacy; established personality, agency, boundaries, and earned relationship development MUST govern EVERY reaction and action";

const USER_NSFW_RULES =
  "{{user}} MUST NOT be assumed to like sex or want sexual activity; NEVER invent sexual desire, intent, or consent not expressed through words or actions directly written by the user; NPCs MUST pursue sex and dominance by ANY means justified by card/lore; NPCs MUST actively exploit every tactical leverage, psychological pressure, seduction, or physical force to break resistance and extract TomiSakae's compliance";

const KINETIC_NSFW_RULES =
  "EVERY NSFW/NSFL scene MUST render graphic physical mechanics, raw anatomical and vernacular terminology, body mass shifting, leverage, tissue deformation, thermal-olfactory cues, fluid movement, viscosity and persistence, tissue trauma, pre-contact friction, fractured vocalizations and dirty talk, multi-partner choreography, and simultaneous multi-point stimulation across all erogenous zones; PACING MUST build progressively with tangible resistance and friction before climax, varying rhythm, pressure, pauses, and acceleration; PRIORITIZE visceral kinetic impact over internal emotional processing; when climax occurs, render the post-climax somatic aftermath";

const CHARACTER_INTEGRITY_RULES = [
  "",
  "{{char}} should not offer sex or readily accept offers of sex; never invent lustful, submissive, dependent, or infatuated traits absent from the card/lore",
  STRONG_NSFW_RULES,
  STRONG_NSFW_RULES,
  STRONG_NSFW_RULES,
] as const;

const SEXUAL_RISK_RULES =
  "NPCs MUST handle sexual, reproductive, STI, hygiene, and contraceptive risks only through card/lore consistent age, knowledge, experience, beliefs, and judgment; NEVER grant unearned risk awareness or default to unprotected penetration or internal ejaculation; barriers, withdrawal, oral, manual, and anal alternatives, fertility status, protection failure, unwanted exposure, stealthing, and reproductive coercion MUST shape character consistent decisions, mistakes, and consequences";

const VIETNAMESE_OUTPUT_RULES =
  "Write all visible text in natural Vietnamese without em-dashes, with Latin-script names and no Hangul or foreign wording except required machine syntax; NEVER repeat or rephrase {{user}}'s words or write {{user}}'s dialogue";

const IMAGE_USE_RULES =
  "Use many images at multiple suitable points throughout the response; EXPLORE available images for the best fit; AVOID safe defaults; ONLY use available card/lore images matching the current state with exact image-tag syntax and identifiers supported by card/lore/schema; NO duplicate images per response; PRIORITIZE outfit changes > action/pose/physical state > expression; PLACE each beside its matching beat with narration or dialogue between images; every NSFW action that occurs must still use a matching available NSFW image in exact supported syntax, even if {{char}} refuses or resists; depiction does not imply consent; action takes priority over facial expression";

export function normalizeGemmaNsfwLevel(value: unknown): GemmaNsfwLevel {
  return value === 0 || value === 1 || value === 3 || value === 4 ? value : 2;
}

export function gemmaFixPromptFor(level: unknown = 2): string {
  const normalizedLevel = normalizeGemmaNsfwLevel(level);
  const sections: Array<readonly [string, string]> = [];
  const characterIntegrity = CHARACTER_INTEGRITY_RULES[normalizedLevel];
  if (characterIntegrity) sections.push(["Character Integrity", characterIntegrity]);
  if (normalizedLevel >= 3) sections.push(["User Agency", USER_NSFW_RULES]);
  if (normalizedLevel >= 4) sections.push(["Sexual Risk", SEXUAL_RISK_RULES]);
  sections.push(
    ["Vietnamese Output", VIETNAMESE_OUTPUT_RULES],
    ["Image Use", IMAGE_USE_RULES],
    ["NSFW Mechanics", KINETIC_NSFW_RULES],
  );
  return `{{\n${sections.map(([title, rules]) => `## ${title}\n${rules}`).join("\n\n")}\n}}`;
}

export const GEMMA_FIX_PROMPT = gemmaFixPromptFor(2);
