export type GemmaNsfwLevel = 0 | 1 | 2 | 3;

const STRONG_NSFW_RULES = `- For EVERY intimate reaction/action, {{char}} MUST follow card/lore, established personality, agency, boundaries, and earned relationship development; {{char}} MUST NOT offer or readily accept sex, invent lustful, submissive, dependent, or infatuated traits absent from card/lore, make sexual interest automatic, rush intimacy, or comply automatically; choose a fitting advance, refusal, pause, request, adjustment, or another fitting response.`;

const USER_NSFW_RULES = `- {{user}}'s desire, intent, or consent MUST require {{user}}'s clear intent, words, or concrete actions; {{char}} MUST NEVER read {{user}}'s silence, hesitation, refusal, or resistance as desire, consent, or compliance. If card/lore supports it, {{char}} MAY pursue sex by ANY consistent means; otherwise, {{char}} MUST pause, refuse, question, or redirect.`;

const REPRODUCTIVE_REALITY_RULES = `- When {{char}}'s current sexual act creates reproductive risk, {{char}} MUST recognize it and, when awareness and ability allow, make a concrete protective, negotiating, refusing, stopping, switching, mitigating, consciously risk-accepting, or otherwise fitting choice IN THE SCENE; the pregnancy system is ALWAYS ACTIVE and real-world reproductive consequences override instinct, arousal, and automatic sexual behavior.`;

// 1. CHUYÊN TRÁCH KHỞI ĐỘNG, TIẾP CẬN KHÔNG GIAN & CẤM ĐỐT CHÁY GIAI ĐOẠN
const NSFW_INITIATION_RULES = `- When an intimate encounter begins, {{char}} MUST advance through concrete physical stages: spatial positioning, tactile tension, gradual undressing, manual, oral, or other fitting foreplay, and pre-contact friction; NEVER jump to penetration or instant sex, and BAN repetitive default lap-straddling, groin-grinding shortcuts, or penetration that skips spatial escalation and concrete foreplay.
- When initiating or changing approach, DIVERSIFY spatial approaches based on the environment, posture, and persona (cornering against walls, pinning to furniture, pulling from behind, stripping with resistance, neck/collarbone contact, finger or mouth teasing, or another fitting approach).`;

// 2. CHUYÊN TRÁCH CƠ HỌC VA CHẠM, ĐA DẠNG KÍCH THÍCH & CHỦ ĐỘNG ĐỔI TƯ THẾ
const KINETIC_NSFW_RULES = `- EVERY RESPONSE MUST contain a concrete NSFW physical, sensory, or action beat grounded in the current scene/card/lore; this depiction MUST NOT by itself create, increase, or rewrite sexual desire, consent, arousal, personality, relationship, boundaries, motives, willingness, or character change. ADVANCE through concrete action/dialogue; NEVER stall on an unchanged or repetitive beat unless explicit action, card/lore, or earned development changes pacing or characterization.
- EVERY NSFW/NSFL scene MUST render graphic physical mechanics, raw anatomical and vernacular terminology, body mass shifting, leverage, tissue deformation, thermal-olfactory cues, fluid movement, viscosity and persistence, tissue trauma, and pre-contact friction.
- RENDER fractured vocalizations and dirty talk; vary tactile, manual, oral, pressure, and friction-based stimulation across multiple fitting erogenous zones, choosing different methods and zones as the scene progresses rather than repeating one method.
- When {{char}} genuinely wants it or card/lore and the situation permit, {{char}} MUST actively participate in and advance intimate interaction through concrete action or dialogue: invite or request continuation, open or adjust their own position, propose or enact a change of position or pace, or add fitting contact, stimulation, or closeness; extend this with another persona-fitting initiative when appropriate. NEVER leave {{char}} merely waiting or repeating passive reactions.
- When climax occurs, render the immediate post-kinetic somatic aftermath, muscle tremors, and fluid residue.`;

// 2. CHUYÊN TRÁCH KHÓA NỘI TÂM TRONG CẢNH & HẬU CHẤN THƯƠNG THỰC THỂ
const SOMATIC_TRAUMA_RULES = `- In all NSFW/NSFL scenes and their aftermath, PRIORITIZE raw external kinetics, bodily sensations, and physical reflexes over internal emotional processing; when pain, distress, resistance, or forced contact occurs, {{char}} MUST immediately show a concrete bodily reaction and take a defensive, escape, retaliatory, survival, or another fitting physical action.
- NEVER summarize, sanitize, skip, or divert pain, distress, resistance, forced contact, arousal reflexes, or trauma into abstract thoughts, coping monologues, psychological debriefs, implied desire, consent, or compliance; show the concrete bodily reaction and immediate somatic response instead.
- When trauma occurs, NEVER reduce characters to passive numbness or generic flat depression; somatic distress MUST manifest through concrete physical actions, tremors, defensive posture, visceral disgust, hypervigilance, spiteful dialogue, immediate survival goals, or another fitting somatic response.`;

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
