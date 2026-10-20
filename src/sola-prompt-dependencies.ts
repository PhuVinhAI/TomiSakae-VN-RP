const COLORS =
  "marigold|amber|cider|coral|copper|terracotta|sage|rose|denim|slate|indigo|heather|ash|mist|pine|obsidian";
const GRADIENTS = "dusk|solstice|eclipse|wildwood|hearth|mistveil";
const TONES = new Set(["whisper", "bite", "tremble", "steady"]);
const KINETICS = new Set(["heavy", "stretch", "tilt", "echo", "crush", "fracture"]);

export function solaList(items: string[]): string {
  if (items.length < 2) return items.join("");
  if (items.length === 2) return items.join(" and ");
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

/** Remove cross-module instructions before setvar stores their reasoning reminders. */
export function adaptSolaStyleDependencies(content: string, modules: ReadonlySet<string>): string {
  const color = modules.has("mod_color");
  const gradient = modules.has("mod_gradient");
  const tone = modules.has("mod_tone");
  const kinetic = modules.has("mod_kinetic");
  if (color && gradient && tone && kinetic) return content;

  // A syntax bullet and its indented examples belong to the same dependency.
  content = content.replace(
    /^([ \t]*)- Mixed with (NPC Colors|Chromatic Gradients|Emotional Tone|Tonal Inflection|Tonal Delivery|Kinetic Impact):[^\n]*(?:\n\1[ \t]+[^\n]+)*/gm,
    (block, _indent: string, kind: string) => {
      const enabled =
        kind === "NPC Colors"
          ? color
          : kind === "Chromatic Gradients"
            ? gradient
            : kind === "Kinetic Impact"
              ? kinetic
              : tone;
      return enabled ? block : "";
    },
  );

  const mixes: Array<[string, string, Array<[boolean, string]>]> = [
    [
      " Consistently mix with tones or kinetics: <color:tone> (e.g. <copper:whisper>, <amber:bite>) or <color:kinetic> (e.g. <coral:heavy>, <cider:stretch>, <denim:tilt>).",
      " Consistently mix with ",
      [
        [tone, "tones: <color:tone> (e.g. <copper:whisper>, <amber:bite>)"],
        [kinetic, "kinetics: <color:kinetic> (e.g. <coral:heavy>, <cider:stretch>, <denim:tilt>)"],
      ],
    ],
    [
      " Consistently mix freely into colors (<copper:whisper>, <amber:bite>) or gradients (<dusk:bite>, <solstice:whisper>).",
      " Consistently mix freely into ",
      [
        [color, "colors (<copper:whisper>, <amber:bite>)"],
        [gradient, "gradients (<dusk:bite>, <solstice:whisper>)"],
      ],
    ],
    [
      " Consistently mix with tones or kinetics (<dusk:bite>, <solstice:heavy>, <hearth:echo>).",
      " Consistently mix with ",
      [
        [tone, "tones (<dusk:bite>)"],
        [kinetic, "kinetics (<solstice:heavy>, <hearth:echo>)"],
      ],
    ],
    [
      " Consistently mix into colors (<coral:heavy>, <amber:stretch>) or gradients (<solstice:heavy>, <hearth:echo>).",
      " Consistently mix into ",
      [
        [color, "colors (<coral:heavy>, <amber:stretch>)"],
        [gradient, "gradients (<solstice:heavy>, <hearth:echo>)"],
      ],
    ],
  ];
  for (const [source, prefix, choices] of mixes) {
    if (choices.every(([enabled]) => enabled)) continue;
    const kept = choices.filter(([enabled]) => enabled).map(([, text]) => text);
    content = content.replace(source, kept.length ? `${prefix}${kept.join(" or ")}.` : "");
  }
  if (!tone || !kinetic) {
    const suffix = tone
      ? ", compounding freely with tone tags (<dusk:whisper>)"
      : kinetic
        ? ", compounding freely with kinetic tags (<solstice:heavy>)"
        : "";
    content = content.replace(
      ", compounding freely with tone or kinetic tags (<dusk:whisper>, <solstice:heavy>)",
      suffix,
    );
    const examples = [
      "<copper>",
      ...(tone ? ["<copper:whisper>"] : []),
      ...(kinetic ? ["<coral:heavy>"] : []),
    ];
    content = content.replace(
      "Write `<copper>`, `<copper:whisper>`, or `<coral:heavy>` directly!",
      `Write ${examples.map((tag) => `\`${tag}\``).join(" or ")} directly!`,
    );
  }
  if (!gradient || !kinetic) {
    const names = [
      ...(gradient ? ["Chromatic Gradients"] : []),
      ...(kinetic ? ["Kinetic Emphasis"] : []),
    ];
    content = content.replace(
      " (Stylistic modules like Chromatic Gradients and Kinetic Emphasis govern prose and sound effects).",
      names.length
        ? ` (${names[0]} ${gradient ? "govern" : "governs"} prose and sound effects).`
        : ".",
    );
  }
  if (!(color || gradient)) {
    content = content.replace("standard colored or untagged dialogue", "untagged dialogue");
  }
  if (!(color || gradient) || !(tone || kinetic))
    content = content.replace(/^[ \t]*- Mix with styles for unique blends\.\n?/gm, "");

  // Stylistic Overload increases enabled effects; it must not re-enable disabled ones.
  if (!color) content = content.replace(/^- Saturate the scene:[^\n]*\n/gm, "");
  else if (!tone)
    content = content.replace(
      ", and mix them freely with tonal inflection (<amber:whisper>,<slate:steady>)",
      "",
    );
  if (!gradient) content = content.replace(/^- Bathe pivotal reflections[^\n]*\n/gm, "");
  if (!kinetic) content = content.replace(/^- Give visceral weight to impacts[^\n]*\n/gm, "");
  const overload = [
    ...(color ? ["color"] : []),
    ...(gradient ? ["gradient"] : []),
    ...(kinetic ? ["kinetic emphasis"] : []),
  ];
  if (!overload.length) {
    content = content.replace(
      /\{\{setvar::(style_override|sola_color)::[\s\S]*?\}\}/g,
      "{{setvar::$1::}}",
    );
  } else {
    content = content.replace(
      "all color, gradient, and kinetic emphasis tags",
      `all ${solaList(overload)} tags`,
    );
  }

  // Keep the enabled part of a combined example, with a matching closing tag.
  content = content.replace(
    new RegExp(`<(${COLORS}|${GRADIENTS})(:[^>\\s]+)?>([\\s\\S]*?)<\\/\\1>`, "g"),
    (_tag, base: string, suffix: string | undefined, body: string) => {
      const baseEnabled = new RegExp(`^(?:${COLORS})$`).test(base) ? color : gradient;
      const effect = suffix?.slice(1).split(":")[0];
      const effectEnabled = effect && (TONES.has(effect) ? tone : KINETICS.has(effect) && kinetic);
      if (baseEnabled) return `<${base}${effectEnabled ? suffix : ""}>${body}</${base}>`;
      return effectEnabled ? `<${suffix!.slice(1)}>${body}</${effect}>` : body;
    },
  );
  // Reminders and overload also cite opening tags without a matching body.
  return content.replace(
    new RegExp(`<(${COLORS}|${GRADIENTS})(:[^>\\s]+)?>`, "g"),
    (_tag, base: string, suffix: string | undefined) => {
      const baseEnabled = new RegExp(`^(?:${COLORS})$`).test(base) ? color : gradient;
      const effect = suffix?.slice(1).split(":")[0];
      const effectEnabled = effect && (TONES.has(effect) ? tone : KINETICS.has(effect) && kinetic);
      if (baseEnabled) return `<${base}${effectEnabled ? suffix : ""}>`;
      return effectEnabled ? `<${suffix!.slice(1)}>` : "";
    },
  );
}

export function adaptSolaHudDependencies(content: string, modules: ReadonlySet<string>): string {
  const trackerTags: Array<[string, string]> = [
    ["mod_track_seed", "story_notes"],
    ["mod_track_date", "date"],
    ["mod_track_bond", "bond"],
    ["mod_track_fengine", "fengine"],
    ["mod_track_thought", "thought_engine"],
    ["mod_track_charmatrix", "char_matrix"],
    ["mod_track_wardrobe", "wardrobe"],
    ["mod_track_inventory", "inventory"],
    ["mod_track_cast", "scene_cast"],
    ["mod_track_arrow", "arrow"],
    ["mod_track_omen", "omen"],
    ["mod_track_dossier", "scene_state"],
    ["mod_track_nsfw", "nsfw_nsfl_ban_list"],
    ["mod_track_sex", "sex_tracker"],
  ];
  const tags = trackerTags.filter(([key]) => modules.has(key)).map(([, tag]) => `<${tag}>`);
  // Only the HUD's example lists other trackers; each standalone schema owns its own fields.
  if (
    modules.has("mod_track_nsfw") ||
    modules.has("mod_track_sex") ||
    trackerTags.slice(0, 7).some(([key]) => !modules.has(key))
  )
    content = content.replace(
      "[Append all active tracker blocks here: <story_notes>, <date>, <bond>, <fengine>, <thought_engine>, <char_matrix>, <wardrobe>, etc.]",
      tags.length ? `[Append all active tracker blocks here: ${tags.join(", ")}.]` : "",
    );
  const trackerReminders = [
    ...(modules.has("mod_track_nsfw") ? ["{{getvar::mod_track_nsfw}}"] : []),
    ...(modules.has("mod_track_sex") ? ["{{getvar::mod_track_sex}}"] : []),
  ];
  if (trackerReminders.length)
    content = content.replaceAll(
      "{{getvar::mod_solahud}}",
      `${trackerReminders.join("")}{{getvar::mod_solahud}}`,
    );
  if (!modules.has("mod_tempo")) content = content.replaceAll(" · [GEAR]", "");
  if (!modules.has("mod_track_fengine")) {
    content = content
      .replace(" · [NPC 1]: T# F# D# Y# · [NPC 2]: T# F# D# Y#", "")
      .replace(
        /^- Inside the `digest=[\s\S]*?(?=\n\n\{\{setvar::tracker_location)/m,
        '- Inside the `digest="..."` attribute, provide one glanceable summary line of in-world day and time (keep under ~25 words).',
      );
  }
  return content;
}

/** Add Sex Tracker's final Character Matrix audit without modifying the frozen source JSON. */
export function adaptSolaCharacterMatrixSexCheck(
  content: string,
  modules: ReadonlySet<string>,
  vietnamese: boolean,
): string {
  if (
    !modules.has("mod_track_charmatrix") ||
    !modules.has("mod_track_sex") ||
    !/<char_matrix\b/i.test(content) ||
    /(?:Sex Check|Kiểm tra tình dục):\s*\[/i.test(content)
  )
    return content;

  const field = vietnamese
    ? "Kiểm tra tình dục: [Bối cảnh tình dục, ranh giới, nhận thức nguy cơ sinh sản và lựa chọn/hành động hiện tại; đối chiếu <sex_tracker>]"
    : "Sex Check: [Sexual context, boundaries, reproductive-risk awareness, and current sexual choice/action; cross-check <sex_tracker>]";
  return content.replace(/(\n(?:Audit|Kiểm tra):[^\n]*\n)(<\/char_matrix>)/i, `$1${field}\n$2`);
}
