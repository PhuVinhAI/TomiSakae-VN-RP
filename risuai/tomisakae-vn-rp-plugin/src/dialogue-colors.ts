export interface DialogueTheme {
  type: "dark" | "light";
  background: string;
}

export const DIALOGUE_COLORS: Readonly<Record<string, string>> = {
  cyan: "#00ffff",
  pink: "#ffc0cb",
  teal: "#008080",
  orange: "#ffa500",
  gold: "#ffd700",
  violet: "#ee82ee",
  salmon: "#fa8072",
  orchid: "#da70d6",
  yellow: "#ffff00",
  plum: "#dda0dd",
  royalblue: "#4169e1",
  mediumblue: "#0000cd",
  navy: "#000080",
  darkcyan: "#008b8b",
  darkgreen: "#006400",
  forestgreen: "#228b22",
  seagreen: "#2e8b57",
  firebrick: "#b22222",
  crimson: "#dc143c",
  sienna: "#a0522d",
  saddlebrown: "#8b4513",
  darkmagenta: "#8b008b",
  darkorchid: "#9932cc",
  darkviolet: "#9400d3",
  blueviolet: "#8a2be2",
  indigo: "#4b0082",
  slateblue: "#6a5acd",
  rebeccapurple: "#663399",
  mediumvioletred: "#c71585",
  skyblue: "#87ceeb",
  lightskyblue: "#87cefa",
  cornflowerblue: "#6495ed",
  aquamarine: "#7fffd4",
  turquoise: "#40e0d0",
  springgreen: "#00ff7f",
  lightgreen: "#90ee90",
  coral: "#ff7f50",
  tomato: "#ff6347",
  lightsalmon: "#ffa07a",
  hotpink: "#ff69b4",
  palevioletred: "#db7093",
  khaki: "#f0e68c",
  lightsteelblue: "#b0c4de",
  black: "#000000",
  white: "#ffffff",
};

const SOURCE_NAMED_COLORS = "cyan|pink|teal|orange|gold|violet|salmon|orchid|yellow|plum";

/** Extend only the source dialogue matchers; existing styles/toggles still apply. */
export function adaptDialogueColorRegex(findRegex: string): string {
  return findRegex.replaceAll(
    `(${SOURCE_NAMED_COLORS})`,
    `(${Object.keys(DIALOGUE_COLORS).join("|")})`,
  );
}

function normalizeHex(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const hex = value.trim();
  if (/^#[\da-f]{6}$/i.test(hex)) return hex.toLowerCase();
  if (/^#[\da-f]{3}$/i.test(hex))
    return `#${[...hex.slice(1)].map((digit) => digit + digit).join("")}`.toLowerCase();
  return undefined;
}

export function resolveDialogueTheme(scheme: unknown): DialogueTheme | undefined {
  if (!scheme || typeof scheme !== "object") return undefined;
  const { type, bgcolor } = scheme as Record<string, unknown>;
  if (type !== "dark" && type !== "light") return undefined;
  return {
    type,
    background: normalizeHex(bgcolor) ?? (type === "dark" ? "#282a36" : "#f5f5f5"),
  };
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}

const MINIMUM_TEXT_CONTRAST = 4.5;

export function textContrast(color: string, background: string): number {
  const foreground = luminance(color);
  const behind = luminance(background);
  return (Math.max(foreground, behind) + 0.05) / (Math.min(foreground, behind) + 0.05);
}

/** Keep Sola's palette names; adjust only their native swatches for the host background. */
export const SOLA_DIALOGUE_COLORS: Readonly<Record<string, string>> = {
  marigold: "#F4A261",
  amber: "#F3B74B",
  cider: "#E9A036",
  coral: "#EE6C4D",
  copper: "#E07A5F",
  terracotta: "#C06C54",
  sage: "#9AA87A",
  rose: "#F4845F",
  denim: "#7A8B99",
  slate: "#8FA4B2",
  indigo: "#8592E6",
  heather: "#B08EA2",
  ash: "#BAC3C7",
  mist: "#98B9C7",
  pine: "#789E8A",
  obsidian: "#A3948A",
};

function readableSwatch(hex: string, theme: DialogueTheme): string {
  if (textContrast(hex, theme.background) >= MINIMUM_TEXT_CONTRAST) return hex;
  const destination =
    textContrast("#000000", theme.background) >= textContrast("#ffffff", theme.background)
      ? 0
      : 255;
  const channels = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
  for (let step = 1; step <= 20; step += 1) {
    const adjusted = `#${channels
      .map((value) =>
        Math.round(value + ((destination - value) * step) / 20)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")}`;
    if (textContrast(adjusted, theme.background) >= MINIMUM_TEXT_CONTRAST) return adjusted;
  }
  return hex;
}

export function adaptSolaDialogueColors(content: string, theme?: DialogueTheme): string {
  if (!theme) return content;
  const swatches = new Map(
    Object.values(SOLA_DIALOGUE_COLORS).map((hex) => [
      hex.toLowerCase(),
      readableSwatch(hex, theme),
    ]),
  );
  return content.replace(/#[\da-f]{6}\b/gi, (hex) => swatches.get(hex.toLowerCase()) ?? hex);
}

/** Apply the adjusted Sola swatches to renderer templates before captures are inserted. */
export function adaptSolaDialogueReplacement(
  replacement: string,
  scriptName: string,
  theme?: DialogueTheme,
): string {
  const isSolaRenderer =
    scriptName.startsWith("Sola Voice:") ||
    scriptName.startsWith("Sola Gradient:") ||
    scriptName.startsWith("Sola Gradient Mod:") ||
    scriptName.startsWith("Sola Kinetic:");
  if (!isSolaRenderer) return replacement;
  let output = adaptSolaDialogueColors(replacement, theme);
  // Theme-aware swatches are selected for readable text; don't dim them again.
  if (theme && /^(?:Sola Voice|Sola Gradient Mod|Sola Kinetic):/.test(scriptName))
    output = output.replace(/(^|;)\s*opacity\s*:[^;"']+/gi, "$1opacity:1");
  return output.replace(
    /<font color="(#[\da-f]{6})">/gi,
    (_match, color: string) =>
      `<font color="${color}" style="color:${color};--FontColorStandard:${color};--FontColorItalic:${color};--FontColorBold:${color};--FontColorItalicBold:${color};--FontColorQuote1:${color};--FontColorQuote2:${color};">`,
  );
}

/** Change the palette in place; do not add prompt rules or rank NPC colors. */
export function adaptDialogueColors(content: string, theme?: DialogueTheme): string {
  if (!theme) return content;
  return content.replace(/<colored_dialogue>[\s\S]*?<\/colored_dialogue>/g, (block) => {
    const line = block.match(/^(Must replace color in tag with:|Palette:)[ \t]*([^\r\n]+)$/m);
    if (!line) return block;
    const palette = line[2]!;
    const background = luminance(theme.background);
    const contrast = (hex: string) => {
      const color = luminance(hex);
      return (Math.max(color, background) + 0.05) / (Math.min(color, background) + 0.05);
    };
    const colors = palette.split(",").map((color) => color.trim());
    if (colors.some((color) => !DIALOGUE_COLORS[color] && !normalizeHex(color))) return block;
    const named = line[1] !== "Palette:";
    const additions = named ? Object.keys(DIALOGUE_COLORS) : Object.values(DIALOGUE_COLORS);
    const candidates = [
      ...new Map([...colors, ...additions].map((color) => [color.toLowerCase(), color])).values(),
    ];
    const readable = candidates.filter(
      (color) => contrast(DIALOGUE_COLORS[color] ?? normalizeHex(color)!) >= MINIMUM_TEXT_CONTRAST,
    );
    if (readable.length === 0) return block;
    let output = block.replace(palette, readable.join(", "));
    // Keep the existing example consistent with the palette, including light mode.
    if (named) {
      output = output.replace(/^Example: (.+)$/m, (example) =>
        example.replace(
          /<(\/?)([a-z]+)(:[a-z]+)?>/g,
          (tag, closing: string, color: string, tone: string | undefined) =>
            readable.includes(color) ? tag : `<${closing}${readable[0]}${tone ?? ""}>`,
        ),
      );
    }
    return output;
  });
}
