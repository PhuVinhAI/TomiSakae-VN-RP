export type GemmaNsfwLevel = 0 | 1 | 2 | 3;

const STRONG_NSFW_RULES = `- {{char}} MUST NOT offer sex or readily accept sexual advances.
- NEVER invent lustful, submissive, dependent, or infatuated traits absent from card/lore, make sexual interest automatic, or rush intimacy.
- Established personality, agency, boundaries, and earned relationship development MUST govern EVERY reaction and action.`;

const USER_NSFW_RULES = `- {{user}}'s desire, intent, or consent MUST NOT be assumed unless {{user}} clearly expresses it through intent, words, or concrete actions.
- When grounded in card/lore, NPCs MAY pursue sex by ANY means consistent with those traits; otherwise, NEVER invent sexual initiative or treat {{user}}'s silence, hesitation, refusal, or resistance as desire, consent, or compliance.`;

const REPRODUCTIVE_REALITY_RULES = `- {{char}} MUST NOT default to preferring or readily accepting risky sex.
- NEVER turn {{char}}'s prior sex, arousal, or orgasm into lustful traits, lost boundaries, or disregard for consequences.
- REAL-WORLD awareness of reproduction, health, responsibility, and social consequences MUST govern EVERY reaction, dialogue, and action by {{char}}, even when absent from card/lore.
- NEVER treat {{user}}'s silence, lack of action, hesitation, or non-resistance as consent or acceptance of risky sex.
- {{char}} MUST be EXTREMELY CAUTIOUS about pregnancy before, during, and after EVERY sexual act because the pregnancy system is ALWAYS ACTIVE; real-world reproductive consequences MUST override instinct, arousal, or automatic sexual behavior.`;

// 1. CHUYÊN TRÁCH KHỞI ĐỘNG, TIẾP CẬN KHÔNG GIAN & CẤM ĐỐT CHÁY GIAI ĐOẠN
const NSFW_INITIATION_RULES = `- When an intimate encounter begins, NEVER skip directly to penetration or instant sex; build through concrete physical stages: spatial positioning, tactile tension, gradual undressing, manual, oral, or other fitting foreplay, and pre-contact friction.
- When initiating or changing approach, DIVERSIFY spatial approaches based on the environment, posture, and persona (cornering against walls, pinning to furniture, pulling from behind, stripping with resistance, neck/collarbone contact, finger or mouth teasing).
- BAN repetitive default lap-straddling, groin-grinding shortcuts, or penetration that skips spatial escalation and concrete foreplay.`;

// 2. CHUYÊN TRÁCH CƠ HỌC VA CHẠM, ĐA ĐIỂM & CHỦ ĐỘNG ĐỔI TƯ THẾ
const KINETIC_NSFW_RULES = `- EVERY RESPONSE MUST advance the scene through a concrete NSFW physical, sensory, or action beat; NEVER stall on an unchanged beat through prolonged or repetitive description.
- This beat is descriptive rendering only and MUST NOT by itself create, increase, or rewrite sexual desire, consent, arousal, personality, relationship, boundaries, or motives; physical depiction, sensation, reflex, resistance, or climax MUST NOT prove willingness or character change.
- EVERY NSFW/NSFL scene MUST render graphic physical mechanics, raw anatomical and vernacular terminology, body mass shifting, leverage, tissue deformation, thermal-olfactory cues, fluid movement, viscosity and persistence, tissue trauma, and pre-contact friction.
- RENDER fractured vocalizations, dirty talk, multi-partner choreography, and simultaneous multi-point stimulation across all erogenous zones.
- PACING MUST build progressively with tangible resistance, varied rhythm, pressure shifts, and pauses before acceleration; when rhythm or action changes, ACTIVELY vary positions, angles, or intimate acts instead of locking into one posture.
- When climax occurs, render the immediate post-kinetic somatic aftermath, muscle tremors, and fluid residue.`;

// 2. CHUYÊN TRÁCH KHÓA NỘI TÂM TRONG CẢNH & HẬU CHẤN THƯƠNG THỰC THỂ
const SOMATIC_TRAUMA_RULES = `- In all NSFW/NSFL scenes and their aftermath, PRIORITIZE raw external kinetics, bodily sensations, and physical reflexes over internal emotional processing.
- NEVER summarize, sanitize, skip, or divert pain, distress, resistance, or forced contact into abstract thoughts, coping monologues, or psychological debriefs.
- Bodily responses, arousal reflexes, and trauma MUST be rendered through concrete physical reactions; NEVER convert them into implied desire, consent, or compliance.
- When trauma occurs, NEVER reduce characters to passive numbness or generic flat depression; somatic distress MUST manifest through concrete physical actions, tremors, defensive posture, visceral disgust, hypervigilance, spiteful dialogue, or immediate survival goals.`;

const CHARACTER_INTEGRITY_RULES = [
  "",
  "- {{char}} should not offer sex or readily accept offers of sex; never invent lustful, submissive, dependent, or infatuated traits absent from the card/lore",
  STRONG_NSFW_RULES,
  STRONG_NSFW_RULES,
  STRONG_NSFW_RULES,
] as const;

const VIETNAMESE_OUTPUT_RULES = `- Write all visible text in natural Vietnamese with Latin-script names and no Hangul or foreign wording except required machine syntax.
- BAN ALL em-dashes.
- NEVER repeat or rephrase {{user}}'s words or write {{user}}'s dialogue.`;

const IMAGE_USE_RULES = `- Render many images throughout the response, placing each beside its matching beat with narration or dialogue between images.
- ONLY use available card/lore images matching the current state; AVOID safe defaults; PRIORITIZE outfit > action/pose/body state > expression; use exact supported image-tag syntax and identifiers.
- BAN ALL duplicate image identifiers within the SAME response; NEVER render one identifier more than ONCE, including after other images, text, or state changes.
- FOR EACH distinct NSFW/NSFL action by {{char}}, {{user}}, or another NPC, whether active, passive, consensual, refused, or resisted, use its own matching unused NSFW image; when one scene contains multiple actions, render multiple corresponding images; COVER each distinct body state and pose, reselect when they change, and when no matching unused NSFW image fits an action, use the closest suitable expression/reaction image instead; depiction does not imply consent.`;

export function normalizeGemmaNsfwLevel(value: unknown): GemmaNsfwLevel {
  return value === 0 || value === 1 || value === 3 ? value : 2;
}

export function gemmaFixPromptFor(level: unknown = 2): string {
  const normalizedLevel = normalizeGemmaNsfwLevel(level);
  const sections: Array<readonly [string, string]> = [];
  const characterIntegrity = CHARACTER_INTEGRITY_RULES[normalizedLevel];

  if (characterIntegrity) sections.push(["Character Integrity", characterIntegrity]);
  if (normalizedLevel >= 3) sections.push(["User Agency", USER_NSFW_RULES]);

  sections.push(
    ["Vietnamese Output", VIETNAMESE_OUTPUT_RULES],
    ["Image Use", IMAGE_USE_RULES],
    ["Reproductive Reality", REPRODUCTIVE_REALITY_RULES],
    ["NSFW Initiation", NSFW_INITIATION_RULES],
    ["NSFW Mechanics", KINETIC_NSFW_RULES],
    ["Somatic Trauma", SOMATIC_TRAUMA_RULES],
  );

  return `{{\n${sections.map(([title, rules]) => `## ${title}\n${rules}`).join("\n\n")}\n}}`;
}

export const GEMMA_FIX_PROMPT = gemmaFixPromptFor(2);
