// Fold placement into each module's own wording, including its existing macro reminder.
export const SOLA_SOUND_REPLACEMENTS: ReadonlyArray<readonly [string, string]> = [
  [
    "Reflect acoustic friction:",
    "Reflect acoustic friction, with vocalizations on separate lines:",
  ],
  [
    "fragments between breaths, never monologues.",
    "fragments between breaths, vocal sounds on their own lines, never monologues.",
  ],
  [
    "Write vocal sounds phonetically instead of using descriptive summary tags:",
    "Write vocal sounds phonetically on their own lines instead of using descriptive summary tags:",
  ],
  [
    "Integrate realistic disfluency, throat sounds, gasps, and non-verbal vocal texture where earned.",
    "Integrate realistic disfluency, throat sounds, gasps, and non-verbal vocal texture where earned, with vocal sounds on separate lines.",
  ],
  [
    "using the speaker's signature gradient:",
    "using the speaker's signature gradient, isolating vocal sounds on new lines:",
  ],
  ["prose and sound effects).", "prose and sound effects, each sound effect on its own line)."],
  [
    "acoustic dynamics through expressive typographic tags.",
    "acoustic dynamics through expressive typographic tags, separating vocal sounds onto new lines.",
  ],
  ["- Standard Gradient:", "- Standard Gradient (sound effects on standalone lines):"],
  [
    "- Standalone (Prose & Sound Beats):",
    "- Standalone (Prose & Sound Beats, each sound on its own line):",
  ],
  [
    "Give physical weight to tactile prose, impacts, and sounds (",
    "Give physical weight to tactile prose, impacts, and standalone sound lines (",
  ],
  [
    "kettle, ambient sound, the adjustment of a sleeve.",
    "kettle, ambient sound on its own line, the adjustment of a sleeve.",
  ],
  [
    "mundane rhythm; unhurried pacing",
    "mundane rhythm with sounds on separate lines; unhurried pacing",
  ],
  [
    "Speech drops in volume and fluency: low, broken, breathy.",
    "Speech drops in volume and fluency: low, broken, breathy, with breath sounds on separate lines.",
  ],
  [
    "thought dissolves into gasped words, stutters, and broken breath.",
    "thought dissolves into gasped words, stutters, and broken breath on separate lines.",
  ],
  [
    "Every sound has a physical cause and syncs with the action producing it",
    "Every sound occupies its own line, has a physical cause, and syncs with the action producing it",
  ],
  [
    "Render ALL character dialogue in their assigned gradient, compounding freely",
    "Render ALL character dialogue in their assigned gradient, vocal sounds on separate lines, compounding freely",
  ],
  [
    "Keep recurring NPCs in their assigned colors.",
    "Keep recurring NPCs in their assigned colors, vocal sounds on separate lines.",
  ],
  [
    "Enrich spoken delivery with emotional tone tags (",
    "Enrich spoken delivery with vocal sounds on separate lines and emotional tone tags (",
  ],
  [
    "Bathe resonant dialogue or reflections in gradient duos (",
    "Bathe resonant dialogue or reflections in gradient duos, sound effects on their own lines (",
  ],
];

export function adaptSolaSoundPlacement(content: string): string {
  for (const [source, replacement] of SOLA_SOUND_REPLACEMENTS)
    content = content.replaceAll(source, replacement);
  return content;
}
