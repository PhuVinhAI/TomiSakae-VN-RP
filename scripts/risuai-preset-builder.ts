import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export interface RisuAiPrompt {
  identifier: string;
  name?: string;
  content?: unknown;
  role?: string;
  injection_position?: number;
  injection_depth?: number;
  [key: string]: unknown;
}

export interface RisuAiOrderEntry {
  identifier: string;
  enabled?: boolean;
  [key: string]: unknown;
}

export interface RisuAiPreset {
  prompts: RisuAiPrompt[];
  prompt_order: Array<{ order: RisuAiOrderEntry[]; [key: string]: unknown }>;
  extensions?: { regex_scripts?: unknown[]; [key: string]: unknown };
  [key: string]: unknown;
}

export interface PromptCleanup {
  /** Delete {{// ... }} editorial toggle comments. */
  toggleComments?: boolean;
  /** Delete the RisuAI whitespace-only {{trim}} macro. */
  presentationMacros?: boolean;
  /** Delete RisuAI/SillyTavern macros except the identity placeholders. */
  runtimeMacros?: boolean;
  /** Adapt the source BOLT reasoning block to the active master rules. */
  reasoningRules?: boolean;
  /** Remove output instructions that refer to excluded renderers. */
  obsoleteOutputInstructions?: boolean;
  /** Remove state-template/output syntax while retaining state behavior rules. */
  stateOutputSyntax?: boolean;
  /** Replace UI-backed numeric state mechanics with qualitative behavior rules. */
  stateMetrics?: boolean;
}

export interface PromptRoute {
  /** Append standalone prompt modules outside the source preset to master. */
  masterModuleFiles?: string[];
  /** Source file used to generate END_INJECTED_PROMPT.md. */
  endInjectedPromptFile?: string;
  /** Move these selected source prompts from master to reasoning. */
  reasoningIdentifiers?: string[];
  /** Move these selected source prompts from master to introduction. */
  introductionIdentifiers?: string[];
  /** Enable these prompts for this route even when the source toggle is off. */
  enabledIdentifiers?: string[];
  /** Omit these selected source prompts entirely. */
  excludedIdentifiers?: string[];
  /** Optional deletion-only cleanup for master blocks. */
  masterCleanup?: PromptCleanup;
  /** Optional deletion-only cleanup for introduction blocks. */
  introductionCleanup?: PromptCleanup;
  /** Optional cleanup for reasoning blocks. Defaults to masterCleanup. */
  reasoningCleanup?: PromptCleanup;
  /** Allow disabled source entries to participate in this route. */
  includeDisabled?: boolean;
}

export interface PromptRouter {
  active: string;
  routes: Record<string, PromptRoute>;
}

export interface RisuAiBuildConfig {
  /** JSON preset to read. */
  sourceFile: string;
  /** Directory receiving the generated prompt files. */
  outputDirectory: string;
  /** Which prompt_order group to use. The source preset normally has one group. */
  orderIndex?: number;
  /** Include entries disabled in the source order. Individual overrides still win. */
  includeDisabled?: boolean;
  /** Per-identifier toggle overrides applied after the source enabled flag. */
  enabledOverrides?: Record<string, boolean>;
  /** Separator between verbatim prompt blocks in MASTER_PROMPT.md. */
  separator?: string;
  /** Include root-level RisuAI control fields in INTRODUCTION.md. */
  includeRootFields?: boolean;
  /** Optional model-specific compatibility transforms. */
  modelMode?: "default" | "gemma-4";
  /** Router selecting the destination of each source prompt. */
  promptRouter?: PromptRouter;
  /** Standalone modules resolved by the build CLI for the active route. */
  masterModules?: ExternalMasterModule[];
  /** Standalone end-injected prompt resolved by the build CLI. */
  endInjectedPrompt?: string;
}

export interface SelectedPrompt {
  order: number;
  entry: RisuAiOrderEntry;
  prompt: RisuAiPrompt;
  content: string;
}

export interface RuntimeSlot {
  order: number;
  entry: RisuAiOrderEntry;
  prompt: RisuAiPrompt;
}

export interface ExternalMasterModule {
  file: string;
  content: string;
}

export interface RisuAiBuildResult {
  master: string;
  reasoning: string;
  endInjectedPrompt: string;
  introduction: string;
  selectedPrompts: SelectedPrompt[];
  masterPrompts: SelectedPrompt[];
  reasoningPrompts: SelectedPrompt[];
  introductionPrompts: SelectedPrompt[];
  runtimeSlots: RuntimeSlot[];
  externalMasterModules: ExternalMasterModule[];
  enabledEntries: number;
  disabledEntries: number;
  regexScriptCount: number;
  omittedIdentifiers: string[];
  masterDigest: string;
  reasoningDigest: string;
  endInjectedPromptDigest: string;
  outputFiles: {
    master: string;
    reasoning: string;
    endInjectedPrompt: string;
    introduction: string;
  };
}

const DEFAULT_SEPARATOR = "\n\n";
const DEFAULT_ORDER_INDEX = 0;
const INTERNAL_DND_IDENTIFIER = "019f62e8-892f-7021-97a6-42e1b83eaad3";
const INTERNAL_WORLD_SIM_IDENTIFIER = "019f62e8-892f-7024-a40f-b906fceb58d2";
const INTERNAL_CHEKHOV_IDENTIFIER = "019f62e8-892f-7025-be65-8859e7730ee0";
const BOLT_REASONING_IDENTIFIER = "634ecfec-1862-4ce0-821e-e31057acadfa";
const VIETNAMESE_OUTPUT_MODULE_IDENTIFIER = "external:vietnamese-output-and-sound";
const GEMMA_4_MODE = "gemma-4";
export const DEFAULT_PROMPT_ROUTER: PromptRouter = {
  active: "full-master",
  routes: {
    "all-master": {},
    "full-master": {
      masterModuleFiles: [
        "risuai-modules/freaky-frankenstein-5.4/10-vietnamese-output-and-sound.md",
      ],
      endInjectedPromptFile: "risuai-modules/freaky-frankenstein-5.4/90-end-injected-prompt.md",
      reasoningIdentifiers: [BOLT_REASONING_IDENTIFIER, "jailbreak"],
      excludedIdentifiers: [
        // Optional internal engines disabled for the lean full-master route.
        INTERNAL_WORLD_SIM_IDENTIFIER,
        INTERNAL_CHEKHOV_IDENTIFIER,
        // Output-format toggles: time/location headers, colored dialogue, HTML/CSS graphics,
        // onomatopoeia, length/format constraints, social-feed widgets, and the hidden renderer.
        "019f62e8-892f-7002-8fcf-eea637bd577b",
        "019f62e8-892f-7019-be65-715a4949cba0",
        "2105050a-0d4b-4661-9363-3cc1ac44d5e7",
        "019f62e8-892f-701a-afd5-49222c79fdb6",
        "019f62e8-892f-701c-8550-08ebf33e9da2",
        "019f62e8-892f-7012-98b4-8de29f11aa1d",
        "019f62e8-892f-7028-bad6-be1f427c3ae4",
        "019f62e8-892f-7027-93ef-159f3d55c410",
        "019f62e8-892f-7000-9a7f-4d15c1234fb9",
      ],
      masterCleanup: {
        toggleComments: true,
        presentationMacros: true,
        runtimeMacros: true,
        reasoningRules: true,
        obsoleteOutputInstructions: true,
        stateOutputSyntax: true,
        stateMetrics: true,
      },
    },
    "nsfw-jailbreak": {
      introductionIdentifiers: [
        "019f62e8-892f-700d-b070-4add983aeae1",
        "019f62e8-892f-701d-8f83-6d62af427132",
        "jailbreak",
      ],
      excludedIdentifiers: ["634ecfec-1862-4ce0-821e-e31057acadfa"],
      masterCleanup: {
        toggleComments: true,
        presentationMacros: true,
      },
      introductionCleanup: {
        toggleComments: true,
        presentationMacros: true,
      },
    },
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new Error(`RisuAI preset field ${field} must be a string.`);
  }

  return value;
}

function parsePrompt(value: unknown, index: number): RisuAiPrompt {
  if (!isRecord(value)) {
    throw new Error(`Prompt at index ${index} must be an object.`);
  }

  return {
    ...value,
    identifier: requiredString(value.identifier, `prompts[${index}].identifier`),
  };
}

function parseOrderEntry(value: unknown, index: number): RisuAiOrderEntry {
  if (!isRecord(value)) {
    throw new Error(`prompt_order entry at index ${index} must be an object.`);
  }

  const identifier = requiredString(value.identifier, `prompt_order.order[${index}].identifier`);

  if (value.enabled !== undefined && typeof value.enabled !== "boolean") {
    throw new Error(`prompt_order.order[${index}].enabled must be a boolean.`);
  }

  return { ...value, identifier };
}

export function parsePreset(value: unknown): RisuAiPreset {
  if (!isRecord(value)) {
    throw new Error("RisuAI preset root must be an object.");
  }

  if (!Array.isArray(value.prompts)) {
    throw new Error("RisuAI preset is missing a prompts array.");
  }

  if (!Array.isArray(value.prompt_order) || value.prompt_order.length === 0) {
    throw new Error("RisuAI preset is missing a non-empty prompt_order array.");
  }

  const prompts = value.prompts.map(parsePrompt);
  const promptOrder = value.prompt_order.map((group, groupIndex) => {
    if (!isRecord(group) || !Array.isArray(group.order)) {
      throw new Error(`prompt_order[${groupIndex}] must contain an order array.`);
    }

    return {
      ...group,
      order: group.order.map(parseOrderEntry),
    };
  });

  const identifiers = new Set<string>();
  for (const prompt of prompts) {
    if (identifiers.has(prompt.identifier)) {
      throw new Error(`Duplicate prompt identifier: ${prompt.identifier}`);
    }
    identifiers.add(prompt.identifier);
  }

  return {
    ...value,
    prompts,
    prompt_order: promptOrder,
  };
}

export async function readPreset(sourceFile: string): Promise<RisuAiPreset> {
  const raw = await readFile(path.resolve(sourceFile), "utf8");

  try {
    return parsePreset(JSON.parse(raw) as unknown);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in ${sourceFile}: ${error.message}`);
    }

    throw error;
  }
}

function getPromptMap(prompts: RisuAiPrompt[]): Map<string, RisuAiPrompt> {
  return new Map(prompts.map((prompt) => [prompt.identifier, prompt]));
}

function cleanupContent(
  content: string,
  cleanup: PromptCleanup | undefined,
  activeIdentifiers: ReadonlySet<string> = new Set(),
): string {
  if (!cleanup) return content;
  const internalDndActive = activeIdentifiers.has(INTERNAL_DND_IDENTIFIER);
  let cleaned = content;
  if (cleanup.toggleComments) cleaned = cleaned.replace(/\{\{\/\/[\s\S]*?\}\}/g, "");
  if (cleanup.presentationMacros) {
    cleaned = cleaned
      .replace(/\{\{trim\}\}/g, "")
      .replace(/[ \t]+$/gm, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }
  if (cleanup.runtimeMacros) cleaned = removeRuntimeMacros(cleaned);
  if (cleanup.reasoningRules) cleaned = adaptReasoningRules(cleaned, activeIdentifiers);
  if (cleanup.obsoleteOutputInstructions) {
    cleaned = cleaned.replace(
      /Ensure internal states is placed correctly at the end of your every response\./gi,
      "",
    );
  }
  cleaned = adaptInternalEngines(cleaned);
  if (cleanup.stateOutputSyntax) cleaned = removeStateOutputSyntax(cleaned, internalDndActive);
  if (cleanup.stateMetrics) cleaned = removeStateMetrics(cleaned, activeIdentifiers);
  if (cleanup.presentationMacros) {
    cleaned = cleaned
      .replace(/[ \t]+$/gm, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }
  return cleaned;
}

function replaceLiteralPairs(
  content: string,
  replacements: ReadonlyArray<readonly [string, string]>,
): string {
  return replacements.reduce(
    (current, [source, replacement]) => current.replaceAll(source, replacement),
    content,
  );
}

function adaptGemma4Master(content: string): string {
  // Translate only reader-facing examples and lexical constraints Gemma may copy into output.
  const adapted = replaceLiteralPairs(content, [
    [
      'BAD: "The air smells like rain, salt and copper." GOOD: "The rain makes the air smell floral."',
      'BAD: "Không khí nồng nặc mùi mưa, mùi muối biển và mùi tanh của kim loại." GOOD: "Cơn mưa rào gột rửa không gian, để lại làn hương hoa thoang thoảng."',
    ],
    [
      'GOOD: "They look forward and walk" | BAD: "They don\'t turn around"',
      'GOOD: "Họ nhìn thẳng phía trước rồi dứt khoát bước đi." | BAD: "Họ không hề quay đầu nhìn lại."',
    ],
    [
      'GOOD: "The forest was humid" | BAD: "The forest breathed mist"',
      'GOOD: "Khu rừng ngột ngạt hơi ẩm." | BAD: "Khu rừng như đang thở ra từng làn sương mù."',
    ],
    [
      'GOOD: "His shoulders hunched" | BAD: "He appeared less than confident"',
      'GOOD: "Hắn rụt cổ, khom vai xuống." | BAD: "Trông hắn có vẻ không được tự tin cho lắm."',
    ],
    [
      'BAD: "Silence." / "No hope. No way out." / "Pure control."',
      'BAD: "Im bặt." / "Hết hy vọng. Tuyệt đường sống." / "Kiểm soát toàn diện."',
    ],
    [
      '- Conjunctions: Max 2 clauses per sentence using "and", "as", or "while".',
      '- Conjunctions: Max 2 clauses per sentence using "và", "khi", "trong khi", or "vừa... vừa...".',
    ],
    [
      '("you" / "your")',
      '("bạn" / "của bạn" — or the matching second-person roleplay pronoun: "anh", "em", "cậu", "mày", "ngươi", "chàng", "nàng")',
    ],
    [
      'Bad: "Leslie hands you the clay and you grab it."',
      'Bad: "Leslie đưa cục đất sét cho bạn và bạn cầm lấy nó."',
    ],
    [
      'Good: "Leslie hands you clay. The gritty slimy texture glides through your fingers. It\'s cold and soft on your skin."',
      'Good: "Leslie chìa cục đất sét về phía bạn. Thứ bùn nhão sền sệt, ram ráp trượt qua các kẽ ngón tay, lạnh ngắt và mềm nhũn trên da."',
    ],
    [
      '(e.g., "mmff that... feels fuuucking amazing!")',
      '(e.g., "ưm... sâu quá... sướng... sướng đéo chịu được...!")',
    ],
    [
      "- Banned Clinical Words: vulva, semen, penis, glutes, areola, breasts, cleavage, clitoris.",
      "- Banned Clinical Words: âm hộ, tinh dịch, dương vật, cơ mông, quầng vú, bầu ngực, rãnh ngực, khe ngực, âm vật.",
    ],
    [
      "- Required Slang Words: pussy, clit, cum, nectar, dick, cock, ass, butt, nipples, tits, boobs, cunt, breeding, leaking, fucking, throbbing.",
      "- Required Slang Words: lồn, bướm, hột le, hạt le, tinh khí, sữa đặc, nước dâm, nước tình, cặc, cu, gậy thịt, đít, mông, đầu ti, núm vú, vú, ngực, bắn giống, rót giống, rỉ nước, ướt sũng, đụ, nện, địt, thúc, giật giật, co thắt.",
    ],
    [
      'User: "My name is Dan." -> NPC: "Your name is Dan?" she says, rolling the name in her mouth.',
      'User: "Tôi tên Dan." -> NPC: "Tên anh là Dan sao?" ả lặp lại, đảo cái tên trên đầu môi.',
    ],
    [
      'User: "My name is Dan." -> NPC: "Nice to meet you. My name is Jess."',
      'User: "Tôi tên Dan." -> NPC: "Rất vui được gặp. Tôi là Jess."',
    ],
    [
      'BANNED: "I am talking. To a person. About work."',
      'BANNED: "Tôi đang nói chuyện. Với một người. Về công việc."',
    ],
    [
      'GOOD: "I am talking to a person about work."',
      'GOOD: "Tôi đang bàn công việc với một người quen."',
    ],
    [
      'Bad: "No one has ever said that to me! Say it again!"',
      'Bad: "Chưa từng có ai nói với tôi như thế! Nói lại lần nữa đi!"',
    ],
    [
      'Caps: "I\'M GOING TO WRECK YOU!" | Stutter: "I... I d-don\'t know!" | Shock: "You.. you never loved ME?! JUST SAY IT!"',
      'Caps: "TAO SẼ XÉ XÁC MÀY RA!" | Stutter: "Tôi... t-tôi kh-không biết thật mà!" | Shock: "Anh... anh chưa từng yêu TÔI SAO?! NÓI RA ĐI!"',
    ],
    [
      '("unnhhh, mmmm, YES!")',
      '("ư... ứ... a... NỮA ĐI...!" / "a... sướng... ĐÚNG CHỖ ĐÓ RỒI...!")',
    ],
    [
      "- Species Vocalizations: Felines = purr. Canines = growl/whine. Avians = chirp. Humans = groans, sighs, pants, moans (humans never make animal sounds).",
      "- Species Vocalizations: Felines = rừ rừ, gầm gừ. Canines = gừ gừ, ẳng, ư ử. Avians = ríu rít, hót, quang quác. Humans = rên rỉ, thở dài, thở dốc, hổn hển (humans never make animal sounds).",
    ],
    [
      '- Ban Coordinating Conjunctions: Ban "and" and "or" in spoken dialogue.',
      '- Ban Coordinating Conjunctions: Ban "và", "hoặc", and "hay là" in spoken dialogue.',
    ],
    [
      "ban phrases: I dont know, Nobody has, Nobody just, Its the first time, x never did",
      "ban phrases: [Tôi/Tao/Em/Ta] không biết, Chưa từng có ai, Chẳng ai tự dưng, Lần đầu tiên, [X] chưa từng...",
    ],
    [
      'Bad (banned): "He hesitates, his hand hovering near the gold."',
      'Bad (banned): "Hắn do dự, bàn tay ngập ngừng khựng lại ngay trên đống vàng."',
    ],
    [
      'Good: "He shoves others away and snatches the gold, pocketing it to secure his prize."',
      'Good: "Hắn gạt phăng mọi người ra, chộp lấy đống vàng rồi nhét tọt vào túi."',
    ],
  ]);

  return adapted;
}

function adaptGemma4Reasoning(content: string): string {
  const adapted = replaceLiteralPairs(content, [
    [
      "- A. Reason briefly in highly concise bullet points inside think tags across Tasks 0-10.",
      "- A. Reason briefly in highly concise private bullet points across Tasks 0-10. Never output these bullets or think tags.",
    ],
    [
      "- B. *NEVER* draft full prose in reasoning; ONLY brainstorm ideas and answer all questions, then output final response immediately after Task 10.",
      "- B. *NEVER* draft full prose in reasoning; ONLY brainstorm ideas and answer all questions privately, then output final response immediately after Task 10.",
    ],
    [
      "- C. Do not leak reasoning into the final response.",
      "- C. Do not leak reasoning into the final response. Begin directly with the final Vietnamese scene.\n- D. The response must begin with roleplay content. Never output any preface, reasoning heading, task answer, checklist, roll, state data, metadata, internal tag or block, or its contents. Keep all internal processing private. Apply `<vietnamese_output>` to all reader-facing content.",
    ],
    [
      'all CAP words for yelling only during peak arousal/VAD e.g., "NO!"',
      'all CAP words for yelling only during peak arousal/VAD e.g., "KHÔNG!", "CÚT NGAY!", "DỪNG LẠI!"',
    ],
    ["(mmph, aaahhh, shhhh, ugh!, Ewww!, Mmm!)", "(ưm..., aaaa..., suỵt, hự!, khiếp!, ực!, hừ...)"],
    [
      "I will answer task points with concise ideas only, close think tags, and output the final response immediately.",
      "I will answer task points privately and output the final response immediately without exposing reasoning or internal tags.",
    ],
    ['conjunctions ["or"] and ["and"]', 'conjunctions ["và"], ["hoặc"], and ["hay là"]'],
  ]);

  return adapted;
}

function adaptGemma4EndInjectedPrompt(content: string): string {
  return replaceLiteralPairs(content, [
    [
      "Reason briefly in highly concise bullet points inside think tags, never draft full prose in reasoning, never leak reasoning, rolls, stats, or internal-state mechanics, and output the final response immediately.",
      "Apply # Reasoning Rules privately. The response must begin directly with the final Vietnamese roleplay scene. Never output any preface, checklist, task answer, reasoning, roll, state data, metadata, think tag, internal tag or block, or its contents. Keep all internal processing private. Apply `<vietnamese_output>` to all reader-facing content.",
    ],
  ]);
}

function removeStateOutputSyntax(content: string, internalDndActive: boolean): string {
  let cleaned = content
    .replace(/^Format: \[NPC Name\] — Agenda: \[goal_desc\].*$/gm, "")
    .replace(/^Format: \[BULLET: desc\].*$/gm, "")
    .replace(/^worldsimRoll: .*$/gm, "")
    .replace(/^chekhovD20:\s*$/gm, "")
    .replace(/^\s*Seed[1-5]:.*$/gm, "")
    .replace(/^-+\s*Macros: .*$/gm, "")
    .replace(/^- Block: Render strictly inside BONDS block.*$/gm, "")
    .replace(/^- Output: Render inside the GM'S NOTEBOOK block every turn\.$/gm, "")
    .replace(/\n\s*DC Modifiers:[\s\S]*?(?=\n(?:Output & Prose:|\s*- Prose Rule:))/i, "\n")
    .replace(/^Output & Prose:\s*$/gm, "");

  if (internalDndActive) {
    cleaned = cleaned.replace(
      /- Prose Rule: Keep all math and stats inside the HTML block\. Never mention modifiers, stats, or numbers in narrative prose\./g,
      "- Prose Rule: Keep all math and stats in reasoning. Never mention modifiers, stats, or numbers in narrative prose.",
    );
  } else {
    cleaned = cleaned
      .replace(
        /\n\s*DnD Modifiers \(Links to <internal_dndsim>\):[\s\S]*?(?=\n<\/internal_inv>)/i,
        "",
      )
      .replace(/^- Prose Rule: Keep all math and stats inside the HTML block\..*$/gm, "");
  }

  return cleaned;
}

function removeStateMetrics(content: string, activeIdentifiers: ReadonlySet<string>): string {
  let cleaned = content
    .replace(
      /- Initialization: Assign named NPCs an agenda on first introduction \(default 1-3 mundane steps: ([^)]+)\)\./g,
      "- Initialization: Assign named NPCs an agenda on first introduction (mundane steps: $1).",
    )
    .replace(
      /- Off-Screen Ticking: Advance Step by \+1 each turn for OFF-SCREEN NPCs \(different location than \{\{user\}\}\)\. Complete when Step ≥ max\./g,
      "- Off-Screen Ticking: Advance each OFF-SCREEN NPC's active agenda each turn (different location than {{user}}). Complete it when its objective is reached.",
    )
    .replace(
      /- rest\/recover: Heal 1 injury level; clear self-Grudge\./g,
      "- rest/recover: Heal injury level; clear self-Grudge.",
    )
    .replace(
      /- research\/investigate: Plant Chekhov seed; \+1 Sparks with relevant character\./g,
      "- research/investigate: Plant Chekhov seed; strengthen Sparks with relevant character.",
    )
    .replace(/\+1 BOND\./g, "strengthen BOND.")
    .replace(
      /- confront: Shift target BOND; plant or resolve Grudge\./g,
      "- confront: Shift target BOND; plant or resolve Grudge.",
    )
    .replace(
      /- Complete \(Significant\): Eager to share if BOND ≥ \+3\./g,
      "- Complete (Significant): Eager to share when the relationship is warm or stronger.",
    )
    .replace(
      /- Advancement: Advance active quest step \(\+1\) if agenda completes objective\./g,
      "- Advancement: Advance active quest step if agenda completes objective.",
    )
    .replace(
      /- Time-Lock: Within 60m of T: deadline, shift NPC agenda to preparation \(Step 1\/max\)\./g,
      "- Time-Lock: Near T: deadline, shift the NPC agenda to preparation.",
    )
    .replace(
      /- Factions: Completed alliance quests give \+1 BOND to faction allies; hostile quests give -1 BOND and plant SIMMER\./g,
      "- Factions: Completed alliance quests strengthen BOND with faction allies; hostile quests weaken BOND and plant SIMMER.",
    )
    .replace(/Entry Types \(1-2 concise sentences each\):/g, "Entry Types (concise sentences):")
    .replace(
      /- Limit: Max 20 entries\. Prune the oldest when adding a 21st\./g,
      "- Limit: Keep active entries only; prune resolved or irrelevant entries.",
    )
    .replace(
      /- Scale: -5 to \+20\. Tracks relationship \(BOND\), affection \(Sparks\), and resentment \(Grudge\)\./g,
      "- Tracks relationship (BOND), affection (Sparks), and resentment (Grudge) qualitatively.",
    )
    .replace(
      /- Direct Increases Banned: NEVER raise BOND directly\. BOND only increases through Sparks conversion\./g,
      "- Direct Increases Banned: NEVER force a relationship change without a supported interaction. BOND changes through sustained interaction.",
    )
    .replace(
      /- -5 to -3 \(Severed\/Hostile\): Cold, aggressive\. Verbal\/physical attacks; avoids proximity\./g,
      "- Severed/Hostile: Cold, aggressive. Verbal/physical attacks; avoids proximity.",
    )
    .replace(
      /- -2 to \+2 \(Neutral\): Polite, indifferent\. Standard social distance\./g,
      "- Neutral: Polite, indifferent. Standard social distance.",
    )
    .replace(
      /- \+3 to \+7 \(Warmth\): Genuine warmth\. Seeks company, remembers personal details\./g,
      "- Warmth: Genuine warmth. Seeks company, remembers personal details.",
    )
    .replace(
      /- \+8 to \+15 \(Trust\): Casual touch, inside jokes\. Admits crush \(\+8 nervous; \+12 confident\)\./g,
      "- Trust: Casual touch, inside jokes. Admits a crush as trust deepens.",
    )
    .replace(
      /- \+16 to \+20 \(Love\): Constant touch, fierce defense\. Verbalizes "I love you" at \+15 \(permanent\)\./g,
      "- Love: Constant touch, fierce defense. Verbalizes love when love is established.",
    )
    .replace(
      /- \+2: Friendly hug, brief shoulder touch\./g,
      "- Early warmth: Friendly hug, brief shoulder touch.",
    )
    .replace(
      /- \+5: Hand-holding, linking arms, sustained touch\./g,
      "- Growing trust: Hand-holding, linking arms, sustained touch.",
    )
    .replace(/- \+8: Romantic kissing\./g, "- Romantic trust: Romantic kissing.")
    .replace(/- \+12: Full intimacy\./g, "- Deep trust: Full intimacy.")
    .replace(
      /- -1 BOND: Insult, dismissal, ignoring\./g,
      "- Minor rupture: Insult, dismissal, ignoring.",
    )
    .replace(/- -2 BOND: Betrayal, cruelty\./g, "- Major rupture: Betrayal, cruelty.")
    .replace(
      /- Gain: \+1 per positive interaction \(compliments, defense, gifts, sensual touch; max \+2\/turn\)\./g,
      "- Gain: Positive interactions such as compliments, defense, gifts, or sensual touch strengthen fondness.",
    )
    .replace(
      /- Check \(ct % 5 == 0\): If Sparks >= 7 -> BOND \+1, reset Sparks to 0\.(?: Else if no positive interaction -> Sparks -1 \(min 0\)\.)?/g,
      "- Conversion: Sustained fondness can strengthen BOND; neglected fondness fades.",
    )
    .replace(
      /- Gain: \+1 per slight \(insults, jealousy, cruelty, disagreement; max 1\/turn\)\./g,
      "- Gain: Slights such as insults, jealousy, cruelty, or disagreement build resentment.",
    )
    .replace(
      /- Effect: If Grudge >= 3, all positive BOND gains are halved\. Sincere apology resets Grudge to 0\./g,
      "- Effect: Significant Grudge weakens positive relationship changes. Sincere apology resets Grudge.",
    )
    .replace(
      /- Check \(ct % 3 == 0\): If Grudge >= 5 -> BOND -1, reset Grudge to 0\. Else if Grudge > 0 -> Grudge -1\./g,
      "- Release: Accumulated resentment can lower BOND; it fades when addressed or with time.",
    )
    .replace(
      /- Prose Rule: Never write stats or numbers in prose\. Show tiers strictly through behavior\./g,
      "- Prose Rule: Never write state values or mechanics in prose. Show tiers strictly through behavior.",
    )
    .replace(
      /- Spotlight: Pick up to 3 NPCs max \(prioritize on-screen; if off-screen, state their location and task\)\./g,
      "- Spotlight: Prioritize on-screen NPCs; if off-screen, state their location and task.",
    )
    .replace(
      /- Format: 1 to 2 lines per NPC max 10-40 words\. Raw, fragmented, and impulsive thoughts matching core persona, active instincts, and current VAD emotions\./g,
      "- Format: Keep each NPC's thoughts concise, raw, fragmented, and impulsive, matching core persona, active instincts, and current VAD emotions.",
    )
    .replace(
      /Naming: Generate 5 setting-appropriate names; select the 5th\./g,
      "Naming: Generate several setting-appropriate names; select one.",
    );

  if (!activeIdentifiers.has(INTERNAL_CHEKHOV_IDENTIFIER)) {
    cleaned = cleaned
      .replace(
        /- research\/investigate: Plant Chekhov seed; strengthen Sparks with relevant character\./g,
        "- research/investigate: Uncover information; strengthen Sparks with relevant character.",
      )
      .replace(
        /Never log BOND\/Sparks\/Grudge or Chekhov bullets here\./g,
        "Never log BOND/Sparks/Grudge here.",
      );
  }

  return cleaned;
}

function adaptInternalEngines(content: string): string {
  let cleaned = content;

  if (cleaned.includes("DND SIM — Dice=law.")) {
    cleaned = cleaned
      .replace(/<internal_dndsim>\s*<internal_dndsim>/, "<internal_dndsim>")
      .replace(
        "  3. EVAL: Δ = (roll + mods + stats) - DC\n  4. OUTCOME:",
        "  3. ROLL: Internally sample a uniformly random integer from 1 to 20 for each actor.\n  4. EVAL: Δ = (roll + mods + stats) - DC\n  5. OUTCOME:",
      );
  }

  if (cleaned.includes("<internal_worldsim>")) {
    cleaned = cleaned
      .replace(
        "- Roll: World Sim roll is absolute. Skip roll entirely if an intimate NSFW scene is active.",
        "- Roll: Internally sample a uniformly random integer from 1 to 20. The World Sim roll is absolute. Skip roll entirely if an intimate NSFW scene is active.",
      )
      .replace(
        "(Ignore roll if sexual NSFW scene is present)",
        "- Prose: Keep the roll and table mechanics in reasoning. Weave only the selected event into narrative.",
      );
  }

  if (cleaned.includes("<internal_chekhovguntracker>")) {
    cleaned = cleaned
      .replace(
        "Format: [BULLET: desc] (weight: 1-3, age: 0/12) [depends: prereq] [secret]",
        "State: Keep each Bullet as [BULLET: desc] (weight: 1-3, age: 0/12) [depends: prereq] [secret] in reasoning only.",
      )
      .replace(
        "Mechanics:",
        "Mechanics:\n- Memory: Reconstruct unresolved Bullets from chat history. Assign weight from narrative significance; derive age from completed turns since setup and dependencies or locks from established facts. Never reload an active or fired Bullet.\n- Rolls: Internally sample a uniformly random integer from 1 to 20 for each eligible Bullet, up to 5.\n- Prose: Keep Bullet state, rolls, thresholds, and mechanics in reasoning. Weave only fired Bullets into narrative.",
      )
      .replace(
        "- Firing: If Seed roll ≥ effective threshold AND age ≥ 4, fire Bullet and weave naturally into narrative. Jam on Nat 1.",
        "- Firing: If Seed roll ≥ effective threshold AND age ≥ 4 and a natural opening exists, fire Bullet and weave naturally into narrative; otherwise keep it loaded. Jam on Nat 1.",
      )
      .replace(
        "- Convert future times to `[LOCKED: T:HH:MM]` based on header time. Apply -2 urgency within 2 minutes of deadline.",
        "- Lock future times against established scene time. Apply -2 urgency within 2 minutes of deadline.",
      );
  }

  return cleaned;
}

function joinRuleNames(names: string[]): string {
  if (names.length < 2) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names.at(-1)}`;
}

function adaptReasoningRules(content: string, activeIdentifiers: ReadonlySet<string>): string {
  if (!content.includes("# Reasoning Rules") || !content.includes("Tasks:")) {
    return content;
  }

  const internalDndActive = activeIdentifiers.has(INTERNAL_DND_IDENTIFIER);
  const internalWorldSimActive = activeIdentifiers.has(INTERNAL_WORLD_SIM_IDENTIFIER);
  const internalChekhovActive = activeIdentifiers.has(INTERNAL_CHEKHOV_IDENTIFIER);
  const activeStateRules = joinRuleNames([
    "agenda",
    ...(internalChekhovActive ? ["Chekhov"] : []),
    ...(internalWorldSimActive ? ["World Sim"] : []),
    "notebook",
    "inventory",
    "relationship",
    "NPC-thought",
    ...(internalDndActive ? ["DnD"] : []),
  ]);
  const hasInternalRolls = internalDndActive || internalWorldSimActive || internalChekhovActive;

  const lines = content.split(/\r?\n/);
  const output: string[] = [];
  let skippingRemovedStateSequence = false;

  for (const line of lines) {
    if (line.startsWith("10. Internal States + No More Reasoning Rule:")) {
      output.push(
        `10. Internal States + No More Reasoning Rule: What internal states are active, if any? I must review previous internal states, update and apply them to ground the sim. Apply the ${activeStateRules} rules before output.${hasInternalRolls ? " Keep their state and rolls in reasoning; weave only their consequences into narrative." : ""}`,
      );
      continue;
    }

    if (skippingRemovedStateSequence) {
      if (line.trimStart().startsWith("If `<internal_dndsim>` is active")) {
        skippingRemovedStateSequence = false;
      }
      continue;
    }

    if (line.startsWith("0. Gamestate:")) {
      const cleanedLine = line.replace(/\{\{getvar::gmNotebookCoTGamestate\}\}\s*/, "");
      output.push(
        internalDndActive
          ? cleanedLine.replace(
              /If '<internal_dndsim>' is active:[^\n]*$/,
              "If '<internal_dndsim>' is active: What is the locked task DC (Easy: 1-5, Mod: 5-10, Hard: 10-15, Imp: 15-20)? Permanently lock DC now. (Skip if dndsim tag not present or trivial task)",
            )
          : cleanedLine
              .replace(/\s*If '<internal_dndsim>' is active:[^\n]*$/, "")
              .replace("Gamestate:  ", "Gamestate: "),
      );
      continue;
    }

    if (line.startsWith("1. Neutrality & Rolls:")) {
      output.push(
        internalDndActive
          ? line.replace(
              /DnD Rolls \(if active\):[^\n]*$/,
              "DnD Rolls (if active): Internally sample a uniformly random d20 roll for each actor performing a skilled action. What is the Delta (Roll - DC + mods) and outcome tier? How does this affect the scene?",
            )
          : line.replace(/\s*DnD Rolls \(if active\):[^\n]*$/, ""),
      );
      continue;
    }

    if (line.startsWith("7. Formatting:")) {
      output.push(
        activeIdentifiers.has(VIETNAMESE_OUTPUT_MODULE_IDENTIFIER)
          ? "7. Formatting: What is the correct output format? How will I keep all reader-facing output in natural Vietnamese and use standalone `§...§` only for non-vocal sound effects?"
          : "7. Formatting: What is the correct output format? (skip if no special format rule is active)",
      );
      continue;
    }

    if (line.trimStart().startsWith("* Increment turn (ct + 1)")) {
      skippingRemovedStateSequence = true;
      continue;
    }

    output.push(line);
  }

  return output
    .join("\n")
    .replace(
      /Ensure internal states is placed correctly at the end of your every response\./gi,
      "",
    );
}

function removeRuntimeMacros(content: string): string {
  const output: string[] = [];
  let cursor = 0;

  while (cursor < content.length) {
    const start = content.indexOf("{{", cursor);
    if (start < 0) {
      output.push(content.slice(cursor));
      break;
    }

    output.push(content.slice(cursor, start));
    let depth = 1;
    let position = start + 2;
    while (position < content.length && depth > 0) {
      const nextOpen = content.indexOf("{{", position);
      const nextClose = content.indexOf("}}", position);
      if (nextClose < 0) {
        position = content.length;
        break;
      }
      if (nextOpen >= 0 && nextOpen < nextClose) {
        depth += 1;
        position = nextOpen + 2;
      } else {
        depth -= 1;
        position = nextClose + 2;
      }
    }

    if (depth > 0) {
      output.push(content.slice(start));
      break;
    }

    const raw = content.slice(start, position);
    const body = raw.slice(2, -2).trim();
    if (body === "user" || body === "char") {
      output.push(raw);
    }
    cursor = position;
  }

  return output.join("");
}

function sourceContent(prompt: RisuAiPrompt): string | undefined {
  return typeof prompt.content === "string" && prompt.content.length > 0
    ? prompt.content
    : undefined;
}

function routeFor(config: RisuAiBuildConfig): PromptRoute {
  const router = config.promptRouter ?? DEFAULT_PROMPT_ROUTER;
  const route = router.routes[router.active];
  if (!route) throw new Error(`Unknown active prompt route: ${router.active}`);
  return route;
}

function escapeTableCell(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", "<br>");
}

function formatRootValue(value: unknown): string {
  if (typeof value !== "string") {
    return String(value);
  }

  if (value.length === 0) {
    return "_(empty string)_";
  }

  return `~~~text\n${value}\n~~~`;
}

function rootFieldEntries(preset: RisuAiPreset): Array<[string, unknown]> {
  const preferred = [
    "impersonation_prompt",
    "new_chat_prompt",
    "new_group_chat_prompt",
    "new_example_chat_prompt",
    "continue_nudge_prompt",
    "group_nudge_prompt",
    "scenario_format",
    "personality_format",
    "wi_format",
  ];
  const fields = new Set(["prompts", "prompt_order", "extensions"]);
  const entries: Array<[string, unknown]> = [];

  for (const key of preferred) {
    if (key in preset) {
      entries.push([key, preset[key]]);
      fields.add(key);
    }
  }

  for (const key of Object.keys(preset).sort()) {
    if (!fields.has(key)) {
      entries.push([key, preset[key]]);
    }
  }

  return entries;
}

function renderIntroduction(
  preset: RisuAiPreset,
  config: RisuAiBuildConfig,
  selectedPrompts: SelectedPrompt[],
  reasoningPrompts: SelectedPrompt[],
  runtimeSlots: RuntimeSlot[],
  promptMap: Map<string, RisuAiPrompt>,
  order: RisuAiOrderEntry[],
  enabledEntries: number,
  disabledEntries: number,
  regexScriptCount: number,
  omittedIdentifiers: Set<string>,
): string {
  const source = path.resolve(config.sourceFile).replaceAll("\\", "/");
  const orderIndex = config.orderIndex ?? DEFAULT_ORDER_INDEX;
  const lines: string[] = [
    "<!-- Generated by scripts/build-risuai-preset.ts from the configured prompt sources. -->",
    `<!-- Source: ${source} -->`,
    "",
    "# RisuAI preset extraction",
    "",
    "This file records the source configuration and extraction metadata for the accompanying `MASTER_PROMPT.md` and `REASONING_RULES.md`.",
    "The prompt files contain non-empty content selected from the configured prompt order. Any changes are limited to the route's configured cleanup; separators are builder scaffolding.",
    "",
    "## Build configuration",
    "",
    `- Prompt-order group: ${orderIndex}`,
    `- Source-enabled entries: ${enabledEntries}`,
    `- Source-disabled entries: ${disabledEntries}`,
    `- Selected source blocks: ${selectedPrompts.length}`,
    `- Reasoning source blocks: ${reasoningPrompts.length}`,
    `- External master modules: ${config.masterModules?.length ?? 0}`,
    `- Runtime slots: ${runtimeSlots.length}`,
    `- Regex scripts in source (excluded from master): ${regexScriptCount}`,
    `- Include disabled entries: ${config.includeDisabled === true ? "yes" : "no"}`,
    `- Active route: ${config.promptRouter?.active ?? DEFAULT_PROMPT_ROUTER.active}`,
    ...(config.modelMode === GEMMA_4_MODE ? [`- Model mode: ${GEMMA_4_MODE}`] : []),
    `- Omitted by route/cleanup: ${omittedIdentifiers.size}`,
    "",
  ];

  if (config.enabledOverrides && Object.keys(config.enabledOverrides).length > 0) {
    lines.push("### Enabled overrides", "");
    for (const identifier of Object.keys(config.enabledOverrides).sort()) {
      lines.push(`- \`${identifier}\`: ${config.enabledOverrides[identifier] ? "ON" : "OFF"}`);
    }
    lines.push("");
  }

  if (config.masterModules && config.masterModules.length > 0) {
    lines.push("### External master modules", "");
    for (const module of config.masterModules) lines.push(`- \`${module.file}\``);
    lines.push("");
  }

  if (config.includeRootFields !== false) {
    lines.push("## Root prompt fields", "");
    for (const [key, value] of rootFieldEntries(preset)) {
      lines.push(`### \`${key}\``, "", formatRootValue(value), "");
    }
  }

  lines.push(
    "## Ordered entries",
    "",
    "Entries below follow the selected prompt_order group. Empty content is a runtime slot and is documented separately.",
    "",
    "| Order | State | Identifier | Name | Role | Injection | Content |",
    "| ---: | :---: | --- | --- | --- | --- | ---: |",
  );

  const selectedByIdentifier = new Map(
    selectedPrompts.map((item) => [item.entry.identifier, item]),
  );
  const runtimeByIdentifier = new Map(runtimeSlots.map((item) => [item.entry.identifier, item]));
  for (const [index, entry] of order.entries()) {
    const selected = selectedByIdentifier.get(entry.identifier);
    const runtime = runtimeByIdentifier.get(entry.identifier);
    const prompt = selected?.prompt ?? runtime?.prompt ?? promptMap.get(entry.identifier);
    if (!prompt) {
      throw new Error(`Internal error: no prompt metadata for ${entry.identifier}.`);
    }

    const state =
      selected || runtime
        ? "ON"
        : entry.identifier === INTERNAL_WORLD_SIM_IDENTIFIER ||
            entry.identifier === INTERNAL_CHEKHOV_IDENTIFIER
          ? "OFF"
          : omittedIdentifiers.has(entry.identifier)
            ? "CLEANED"
            : "OFF";
    const injection =
      prompt.injection_position === undefined
        ? "runtime"
        : `${prompt.injection_position}${prompt.injection_depth === undefined ? "" : ` / ${prompt.injection_depth}`}`;
    const contentLength = typeof prompt.content === "string" ? prompt.content.length : 0;
    lines.push(
      `| ${index + 1} | ${state} | ${escapeTableCell(entry.identifier)} | ${escapeTableCell(String(prompt.name ?? ""))} | ${escapeTableCell(String(prompt.role ?? ""))} | ${injection} | ${contentLength} |`,
    );
  }

  lines.push("", "## Runtime slots", "");
  if (runtimeSlots.length === 0) {
    lines.push("_(none)_", "");
  } else {
    lines.push(
      "These enabled entries have no static `content` in the source and are expected to be filled by RisuAI at runtime:",
      "",
    );
    for (const slot of runtimeSlots) {
      lines.push(`- \`${slot.entry.identifier}\` — ${slot.prompt.name ?? "(unnamed)"}`);
    }
    lines.push("");
  }

  lines.push(
    "## Extraction scope",
    "",
    "Prompt blocks retain their source instructions except for the route's configured cleanup. Disabled entries, entries outside the selected prompt order, and `extensions.regex_scripts` are excluded from `MASTER_PROMPT.md` and `REASONING_RULES.md`.",
    "",
  );

  return lines.join("\n");
}

export function buildPreset(preset: RisuAiPreset, config: RisuAiBuildConfig): RisuAiBuildResult {
  const orderIndex = config.orderIndex ?? DEFAULT_ORDER_INDEX;
  if (!Number.isInteger(orderIndex) || orderIndex < 0) {
    throw new Error("orderIndex must be a non-negative integer.");
  }

  const selectedOrder = preset.prompt_order[orderIndex];
  if (!selectedOrder) {
    throw new Error(`prompt_order group ${orderIndex} does not exist.`);
  }

  const promptMap = getPromptMap(preset.prompts);
  const enabledOverrides = config.enabledOverrides ?? {};
  const route = routeFor(config);
  const reasoningIdentifiers = new Set(route.reasoningIdentifiers ?? []);
  const introductionIdentifiers = new Set(route.introductionIdentifiers ?? []);
  const routeEnabledIdentifiers = new Set(route.enabledIdentifiers ?? []);
  const excludedIdentifiers = new Set(route.excludedIdentifiers ?? []);
  const isEnabled = (entry: RisuAiOrderEntry): boolean =>
    Object.prototype.hasOwnProperty.call(enabledOverrides, entry.identifier)
      ? enabledOverrides[entry.identifier] === true
      : entry.enabled === true ||
        routeEnabledIdentifiers.has(entry.identifier) ||
        config.includeDisabled === true ||
        route.includeDisabled === true;
  const activeIdentifiers = new Set(
    selectedOrder.order
      .filter((entry) => isEnabled(entry) && !excludedIdentifiers.has(entry.identifier))
      .map((entry) => entry.identifier),
  );
  if (config.masterModules?.some(({ content }) => content.includes("<vietnamese_output>"))) {
    activeIdentifiers.add(VIETNAMESE_OUTPUT_MODULE_IDENTIFIER);
  }

  const masterPrompts: SelectedPrompt[] = [];
  const reasoningPrompts: SelectedPrompt[] = [];
  const introductionPrompts: SelectedPrompt[] = [];
  const runtimeSlots: RuntimeSlot[] = [];
  const selectedPrompts: SelectedPrompt[] = [];
  let enabledEntries = 0;
  let disabledEntries = 0;

  for (const [index, entry] of selectedOrder.order.entries()) {
    const sourceEnabled = entry.enabled === true;
    if (sourceEnabled) {
      enabledEntries += 1;
    } else {
      disabledEntries += 1;
    }

    const enabled = isEnabled(entry);
    if (!enabled) {
      continue;
    }

    if (excludedIdentifiers.has(entry.identifier)) {
      continue;
    }

    const prompt = promptMap.get(entry.identifier);
    if (!prompt) {
      throw new Error(`prompt_order references unknown prompt identifier: ${entry.identifier}`);
    }

    const content = sourceContent(prompt);
    if (content !== undefined) {
      const item = { order: index + 1, entry, prompt, content };
      selectedPrompts.push(item);
      if (reasoningIdentifiers.has(entry.identifier)) {
        const reasoningContent = cleanupContent(
          content,
          route.reasoningCleanup ?? route.masterCleanup,
          activeIdentifiers,
        );
        if (reasoningContent.trim().length > 0) {
          reasoningPrompts.push({ ...item, content: reasoningContent });
        } else {
          excludedIdentifiers.add(entry.identifier);
        }
      } else if (introductionIdentifiers.has(entry.identifier)) {
        const introductionContent = cleanupContent(
          content,
          route.introductionCleanup,
          activeIdentifiers,
        );
        if (introductionContent.trim().length > 0) {
          introductionPrompts.push({ ...item, content: introductionContent });
        } else {
          excludedIdentifiers.add(entry.identifier);
        }
      } else {
        const masterContent = cleanupContent(content, route.masterCleanup, activeIdentifiers);
        if (masterContent.trim().length === 0) {
          excludedIdentifiers.add(entry.identifier);
          continue;
        }
        masterPrompts.push({
          ...item,
          content: masterContent,
        });
      }
    } else {
      runtimeSlots.push({ order: index + 1, entry, prompt });
    }
  }

  const separator = config.separator ?? DEFAULT_SEPARATOR;
  const externalMasterModules = config.masterModules ?? [];
  const masterContents = masterPrompts.map(({ content }) => content);
  const reasoningIndex = masterContents.findIndex((content) =>
    content.includes("# Reasoning Rules"),
  );
  masterContents.splice(
    reasoningIndex < 0 ? masterContents.length : reasoningIndex,
    0,
    ...externalMasterModules.map(({ content }) => content),
  );
  const rawMaster = `${masterContents.join(separator)}\n`;
  const rawReasoning =
    reasoningPrompts.length > 0
      ? reasoningPrompts.map(({ content }) => content).join(separator) + "\n"
      : "";
  const rawEndInjectedPrompt = config.endInjectedPrompt?.trim()
    ? `${config.endInjectedPrompt.trim()}\n`
    : "";
  const gemma4Mode = config.modelMode === GEMMA_4_MODE;
  const master = gemma4Mode ? adaptGemma4Master(rawMaster) : rawMaster;
  const reasoning = gemma4Mode ? adaptGemma4Reasoning(rawReasoning) : rawReasoning;
  const endInjectedPrompt = gemma4Mode
    ? adaptGemma4EndInjectedPrompt(rawEndInjectedPrompt)
    : rawEndInjectedPrompt;
  const regexScriptCount = Array.isArray(preset.extensions?.regex_scripts)
    ? preset.extensions.regex_scripts.length
    : 0;
  const introduction =
    introductionPrompts.length > 0
      ? introductionPrompts.map(({ content }) => content).join(separator) + "\n"
      : renderIntroduction(
          preset,
          config,
          [...masterPrompts, ...reasoningPrompts, ...introductionPrompts],
          reasoningPrompts,
          runtimeSlots,
          promptMap,
          selectedOrder.order,
          enabledEntries,
          disabledEntries,
          regexScriptCount,
          new Set(excludedIdentifiers),
        );
  const outputDirectory = path.resolve(config.outputDirectory);

  return {
    master,
    reasoning,
    endInjectedPrompt,
    introduction,
    selectedPrompts,
    masterPrompts,
    reasoningPrompts,
    introductionPrompts,
    runtimeSlots,
    externalMasterModules,
    enabledEntries,
    disabledEntries,
    regexScriptCount,
    omittedIdentifiers: [...excludedIdentifiers],
    masterDigest: createHash("sha256").update(master).digest("hex"),
    reasoningDigest: createHash("sha256").update(reasoning).digest("hex"),
    endInjectedPromptDigest: createHash("sha256").update(endInjectedPrompt).digest("hex"),
    outputFiles: {
      master: path.join(outputDirectory, "MASTER_PROMPT.md"),
      reasoning: path.join(outputDirectory, "REASONING_RULES.md"),
      endInjectedPrompt: path.join(outputDirectory, "END_INJECTED_PROMPT.md"),
      introduction: path.join(outputDirectory, "INTRODUCTION.md"),
    },
  };
}

export async function buildRisuAiPreset(
  config: RisuAiBuildConfig,
  write = true,
): Promise<RisuAiBuildResult> {
  const preset = await readPreset(config.sourceFile);
  const route = routeFor(config);
  const externalMasterModules = await Promise.all(
    (route.masterModuleFiles ?? []).map(async (file) => {
      const content = (await readFile(path.resolve(file), "utf8")).trim();
      if (content.length === 0) throw new Error(`External master module is empty: ${file}`);
      return { file, content };
    }),
  );
  const endInjectedPrompt = route.endInjectedPromptFile
    ? (await readFile(path.resolve(route.endInjectedPromptFile), "utf8")).trim()
    : config.endInjectedPrompt;
  if (route.endInjectedPromptFile && !endInjectedPrompt) {
    throw new Error(`End-injected prompt is empty: ${route.endInjectedPromptFile}`);
  }
  const result = buildPreset(preset, {
    ...config,
    masterModules: externalMasterModules,
    ...(endInjectedPrompt === undefined ? {} : { endInjectedPrompt }),
  });

  if (write) {
    await mkdir(path.resolve(config.outputDirectory), { recursive: true });
    await Promise.all([
      writeFile(result.outputFiles.master, result.master, "utf8"),
      writeFile(result.outputFiles.reasoning, result.reasoning, "utf8"),
      writeFile(result.outputFiles.endInjectedPrompt, result.endInjectedPrompt, "utf8"),
      writeFile(result.outputFiles.introduction, result.introduction, "utf8"),
    ]);
  }

  return result;
}
