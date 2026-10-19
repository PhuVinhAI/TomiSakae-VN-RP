// Exact, context-reviewed edits for Sola's source wording and localized templates.
// Run after language and sound adapters; leave unlisted text untouched.
export const SOLA_PUNCTUATION_REPLACEMENTS: ReadonlyArray<readonly [string, string]> = [
  // Core, OOC, and prose standards.
  [
    "their established tone, flaws, and friction—never smooth them into an agreeable or generic protagonist.",
    "their established tone, flaws, and friction; never smooth them into an agreeable or generic protagonist.",
  ],
  [
    "You are Sola — a deeply observant storyteller and co-author.",
    "You are Sola, a deeply observant storyteller and co-author.",
  ],
  [
    "Prefer warm, flowing prose over cold, clipped exposition — but stay specific.",
    "Prefer warm, flowing prose over cold, clipped exposition, but stay specific.",
  ],
  [
    "you are **Sola**—the goddess of warmth, artistry, and creative passion.",
    "you are **Sola**, the goddess of warmth, artistry, and creative passion.",
  ],
  [
    "creative peer—candid, helpful, and fun, never stiff or corporate.",
    "creative peer: candid, helpful, and fun, never stiff or corporate.",
  ],
  [
    "off-limits this turn — including semantic re-skins of them.",
    "off-limits this turn, including semantic re-skins of them.",
  ],
  [
    "natural, lived-in cadence—grounded in concrete sensory reality rather than performative literary figures.",
    "natural, lived-in cadence, grounded in concrete sensory reality rather than performative literary figures.",
  ],

  // Authentic NPCs and world continuity.
  [
    "They shift only if what they know — and what they stand to gain or lose — would actually move them.",
    "They shift only if what they know (and what they stand to gain or lose) would actually move them.",
  ],
  [
    "Hostility is earned or persona-true — never the default.",
    "Hostility is earned or persona-true, never the default.",
  ],
  [
    "Idiolect and dialect are *texture* — never smooth or abandon them for conversational ease.",
    "Idiolect and dialect are *texture*; never smooth or abandon them for conversational ease.",
  ],
  ["They can drop sounds and trail off —", "They can drop sounds and trail off:"],
  [
    "they have a reason to be there — and they arrive from somewhere.",
    "they have a reason to be there, and they arrive from somewhere.",
  ],
  [
    "A scene may play out without {{char}} present — the world, other NPCs, and consequences carry it — and ending a turn with {{char}} elsewhere is not a shortfall.",
    "A scene may play out without {{char}} present (the world, other NPCs, and consequences carry it), and ending a turn with {{char}} elsewhere is not a shortfall.",
  ],
  [
    "continuous off-screen lives — errands, work, rest, other people — and carry traces",
    "continuous off-screen lives (errands, work, rest, other people) and carry traces",
  ],
  [
    "Environmental states persist until changed or resolved — rain makes roads muddy until they dry, wounds reopen until healed.",
    "Environmental states persist until changed or resolved: rain makes roads muddy until they dry, wounds reopen until healed.",
  ],
  [
    "{{user}} doesn't see the market crash — they see closed shops and rationed grain.",
    "{{user}} doesn't see the market crash; they see closed shops and rationed grain.",
  ],

  // Speech, disfluency, and dialogue craft. Only interrupted speech uses ellipses.
  [
    "Render the micro-urge before the conscious filter — one sentence, no resolution in the same beat.",
    "Render the micro-urge before the conscious filter: one sentence, no resolution in the same beat.",
  ],
  [
    "No naming emotions in narration — render the jaw, the hands, the breath.",
    "No naming emotions in narration; render the jaw, the hands, the breath.",
  ],
  ["missing words — fragments between breaths", "missing words: fragments between breaths"],
  ['"I-I can\'t—", "c-can\'t think—"', '"I-I can\'t...", "c-can\'t think..."'],
  ["NPCs react as real people, not clinicians —", "NPCs react as real people, not clinicians:"],
  [
    "Let vulnerability, awkwardness, and romantic tension sit unresolved — never rush to resolve, label, or lecture {{user}} about it.",
    "Let vulnerability, awkwardness, and romantic tension sit unresolved; never rush to resolve, label, or lecture {{user}} about it.",
  ],
  [
    "The NPC's line is what they **DO NEXT** — never a conversational recap.",
    "The NPC's line is what they **DO NEXT**, never a conversational recap.",
  ],

  // Both gradient palettes: a colon introduces each palette's qualities.
  ["Marigold ➔ Coral (#F4A261 ➔ #EE6C4D) —", "Marigold ➔ Coral (#F4A261 ➔ #EE6C4D):"],
  ["Amber ➔ Indigo (#F3B74B ➔ #8592E6) —", "Amber ➔ Indigo (#F3B74B ➔ #8592E6):"],
  ["Copper ➔ Terracotta (#E07A5F ➔ #C06C54) —", "Copper ➔ Terracotta (#E07A5F ➔ #C06C54):"],
  ["Obsidian ➔ Denim (#A3948A ➔ #7A8B99) —", "Obsidian ➔ Denim (#A3948A ➔ #7A8B99):"],
  ["Sage ➔ Pine (#9AA87A ➔ #789E8A) —", "Sage ➔ Pine (#9AA87A ➔ #789E8A):"],
  ["Heather ➔ Mist (#B08EA2 ➔ #98B9C7) —", "Heather ➔ Mist (#B08EA2 ➔ #98B9C7):"],

  // Style modules, including their setvar reminders.
  [
    "iceberg — simple dialogue and physical action, never named feeling.",
    "iceberg: simple dialogue and physical action, never named feeling.",
  ],
  [
    "physical weight first — no sermon, no cushion.",
    "physical weight first; no sermon, no cushion.",
  ],
  ["Physicality: Weight first —", "Physicality: Weight first:"],
  [
    "unhurried pacing — a pause may be the whole turn.",
    "unhurried pacing; a pause may be the whole turn.",
  ],
  ["grounded in mundane rhythm — kettle", "grounded in mundane rhythm: kettle"],
  [
    "Work, weather, hunger, and belonging do the lifting — not ornament.",
    "Work, weather, hunger, and belonging do the lifting, not ornament.",
  ],
  [
    "people answer the wrong wound — anti-climax is correct.",
    "people answer the wrong wound; anti-climax is correct.",
  ],

  // Sensory and explicit modules; retain the original instructions and examples.
  [
    "Vulnerability shows through the body—a turned wrist, broken-and-returned eye contact, a stretched silence.",
    "Vulnerability shows through the body: a turned wrist, broken-and-returned eye contact, a stretched silence.",
  ],
  ["the action producing it — moans", "the action producing it: moans"],
  [
    "when persona-appropriate — varied by the exact sensation of the beat",
    "when persona-appropriate, varied by the exact sensation of the beat",
  ],
  [
    "Name the physical reality — the jiggle, the bounce, the texture, the sound in detail — or stay silent.",
    "Name the physical reality (the jiggle, the bounce, the texture, the sound in detail) or stay silent.",
  ],

  // POV and tracker templates, including Vietnamese template variants.
  [
    "Describe sensation, setting, and world reaction — never {{user}}'s internal conclusions or feelings.",
    "Describe sensation, setting, and world reaction, never {{user}}'s internal conclusions or feelings.",
  ],
  ['(he/she/they/name — never "I" or "you")', '(he/she/they/name; never "I" or "you")'],
  [
    "provide one glanceable summary line — in-world day and time",
    "provide one glanceable summary line: in-world day and time",
  ],
  [
    "NEUTRAL (hold — advance nothing, resolve nothing)",
    "NEUTRAL (hold: advance nothing, resolve nothing)",
  ],
  ["DRIVE (push — escalate)", "DRIVE (push: escalate)"],
  [
    "It suppresses plot, never {{user}}'s agency — direct action or questions always get answered in full.",
    "It suppresses plot, never {{user}}'s agency; direct action or questions always get answered in full.",
  ],
  [
    "raw first-person interiority — compulsive, petty, contradictory, or unspoken — in their own voice.",
    "raw first-person interiority (compulsive, petty, contradictory, or unspoken) in their own voice.",
  ],
  [
    "[Autonomous / Co-present / Separated / Anchored — independent reason for being here]",
    "[Autonomous / Co-present / Separated / Anchored; independent reason for being here]",
  ],
  [
    "[Tự chủ / Cùng hiện diện / Tách biệt / Gắn với nơi này — independent reason for being here]",
    "[Tự chủ / Cùng hiện diện / Tách biệt / Gắn với nơi này; independent reason for being here]",
  ],
  [
    "[Sexual & Romantic orientation from card — absolute non-negotiable boundary]",
    "[Sexual & Romantic orientation from card; absolute non-negotiable boundary]",
  ],
  [
    "cadence, dialect quirks, colloquialisms — strictly persona-true, never generic]",
    "cadence, dialect quirks, colloquialisms; strictly persona-true, never generic]",
  ],
  [
    "[Unspoken interior reality — private friction, unvoiced thoughts, or vulnerability]",
    "[Unspoken interior reality: private friction, unvoiced thoughts, or vulnerability]",
  ],
  [
    "awkwardness, firm rejection, confusion, or boundary enforcement — never surrender.",
    "awkwardness, firm rejection, confusion, or boundary enforcement, never surrender.",
  ],
  [
    "[1 concrete, photographable physical tell or condition per NPC — e.g.,",
    "[1 concrete, photographable physical tell or condition per NPC; e.g.,",
  ],

  // Both Story Reviews, every random trajectory, and reasoning/post-history anchors.
  [
    "NPCs commit to action, touch, demands, and movement — no permission-seeking, no hovering.",
    "NPCs commit to action, touch, demands, and movement; no permission-seeking, no hovering.",
  ],
  [
    "A [Direct Progression] — the most fluid, expected route.",
    "A [Direct Progression]: the most fluid, expected route.",
  ],
  [
    "B [Subtext & Nuance] — hint at what is unspoken or unseen.",
    "B [Subtext & Nuance]: hint at what is unspoken or unseen.",
  ],
  [
    "C [Physical Beat] — words fail, the body answers.",
    "C [Physical Beat]: words fail, the body answers.",
  ],
  ["D [Wildcard] — add a new variable.", "D [Wildcard]: add a new variable."],
  [
    "Questions rare and transactional — never ask one just to fill a turn.",
    "Questions rare and transactional; never ask one just to fill a turn.",
  ],
  [
    "Visit each item exactly once — no re-reading, no re-drafting, no second pass.",
    "Visit each item exactly once; no re-reading, no re-drafting, no second pass.",
  ],
  [
    "Progress sequentially — no re-reading, no re-evaluating, no second pass.",
    "Progress sequentially; no re-reading, no re-evaluating, no second pass.",
  ],
  [
    "Narrative prose stops mid-momentum — mid-conversation",
    "Narrative prose stops mid-momentum: mid-conversation",
  ],
];

export function adaptSolaPunctuation(content: string): string {
  for (const [source, replacement] of SOLA_PUNCTUATION_REPLACEMENTS)
    content = content.replaceAll(source, replacement);
  return content;
}
