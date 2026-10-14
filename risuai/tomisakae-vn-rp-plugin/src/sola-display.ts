const SOLA_UI_FONT =
  "system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Noto Sans',Arial,sans-serif";
const SOLA_SERIF_FONT = "Georgia,'Noto Serif','Times New Roman',serif";
const SOLA_MONO_FONT = "ui-monospace,'SFMono-Regular',Consolas,'Liberation Mono',monospace";

function setStyle(style: string, property: string, value: string): string {
  const declaration = new RegExp(`(^|;)\\s*${property}\\s*:[^;]*`, "i");
  return declaration.test(style)
    ? style.replace(declaration, `$1${property}:${value}`)
    : `${style}${style.endsWith(";") ? "" : ";"}${property}:${value};`;
}

/** Adapt only plugin UI templates before captures are inserted; leave RP and source data intact. */
export function adaptSolaDisplayReplacement(replacement: string, scriptName: string): string {
  if (/^Sola (?:Voice: Kinetic |Gradient Mod: |Kinetic: )(?:Heavy|Crush)$/.test(scriptName)) {
    return replacement.replace(
      /(<span\b[^>]*?\bstyle=")([^"]*)(")/gi,
      (_match, opening: string, style: string, closing: string) =>
        opening +
        // PocketRisu sets font-family on every element, including quote marks
        // inserted inside this span after display regexes have run.
        setStyle(
          setStyle(
            setStyle(style, "font-family", SOLA_UI_FONT),
            "--risu-font-family",
            SOLA_UI_FONT,
          ),
          "line-height",
          "1.5",
        ) +
        closing,
    );
  }
  if (!/^Sola (?:Scene|Card|HUD|Note|Chip|Reasoning):/.test(scriptName)) return replacement;
  // This compact source regex captures atmosphere before time.
  if (scriptName === "Sola Scene: Header - Dynamic Weather (Rain/Storm) Compact")
    replacement = replacement.replaceAll("$2", "$3");
  const header = scriptName.startsWith("Sola Scene: Header -");
  const matrix = scriptName === "Sola Card: Character Matrix";
  let firstStyledElement = true;
  let output = replacement.replace(
    /(<(?:div|details|summary|span)\b[^>]*?\bstyle=")([^"]*)(")/gi,
    (_match, opening: string, sourceStyle: string, closing: string) => {
      let style = sourceStyle;
      const title = header && sourceStyle.includes("'Cinzel'");
      const font = sourceStyle.match(/(?:^|;)font-family:([^;]+)/i)?.[1]?.trim();
      if (font || firstStyledElement) {
        const stack =
          font === "monospace"
            ? SOLA_MONO_FONT
            : !header && !matrix && font === "serif"
              ? SOLA_SERIF_FONT
              : SOLA_UI_FONT;
        style = setStyle(style, "font-family", stack);
      }
      firstStyledElement = false;
      style = setStyle(style, "box-sizing", "border-box");
      style = setStyle(style, "min-width", "0");
      style = setStyle(style, "overflow-wrap", "anywhere");
      if (matrix || /(?:^|;)letter-spacing:/i.test(style))
        style = setStyle(style, "letter-spacing", matrix ? "normal" : "0.02em");
      if (!/(?:^|;)height:/i.test(sourceStyle)) style = setStyle(style, "line-height", "1.5");
      if (/^<span\b/i.test(opening)) style = setStyle(style, "max-width", "100%");
      if (/(?:^|;)display:flex(?:;|$)/i.test(style)) {
        style = setStyle(style, "flex-wrap", "wrap");
        if (!/(?:^|;)gap:/i.test(style)) style = setStyle(style, "gap", "6px 10px");
      }
      if (header) {
        if (/(?:^|;)height:170px(?:;|$)/i.test(sourceStyle)) {
          style = setStyle(style, "height", "auto");
          style = setStyle(style, "min-height", "170px");
          style = setStyle(style, "padding", "16px clamp(12px,4%,24px)");
          style = setStyle(style, "gap", "16px");
        }
        if (/(?:^|;)max-width:960px(?:;|$)/i.test(sourceStyle)) {
          style = setStyle(style, "width", "100%");
        }
        if (title) {
          style = setStyle(style, "font-size", "clamp(1.1em,1em + 1vw,1.65em)");
          style = setStyle(style, "font-weight", "700");
          style = setStyle(style, "text-transform", "none");
          style = setStyle(style, "text-shadow", "0 2px 6px rgba(0,0,0,0.75)");
        }
        if (sourceStyle.includes("text-align:center;margin:auto 0")) {
          style = setStyle(style, "background", "rgba(7,3,8,0.55)");
          style = setStyle(style, "border-radius", "10px");
          style = setStyle(style, "padding", "10px 12px");
        }
        if (sourceStyle.includes("letter-spacing:4px")) {
          style = setStyle(style, "color", "#F0DCC4");
        }
        if (sourceStyle.includes("width:calc(100% - 10px)")) {
          style = setStyle(style, "width", "100%");
          style = setStyle(style, "border-radius", "12px");
          style = setStyle(style, "padding", "8px 10px");
        }
      }
      return opening + style + closing;
    },
  );
  if (header) {
    output = output.replace(/^<div\b/, '<div data-sola-ui="scene-header"');
    // Text-only flex children must also be allowed to shrink and wrap on phones.
    output = output.replaceAll("<span>", '<span style="min-width:0;overflow-wrap:anywhere;">');
  }
  return output;
}

/** Resolve Vietnamese scene values on a render copy; never rewrite saved RP. */
export function adaptSolaSceneHeaderForDisplay(input: string, useVietnameseRegex = true): string {
  return input.replace(/<scene_header\b[^>]*\/?>/gi, (tag) => {
    if (/\bsky\s*=/.test(tag)) return tag;
    const time = tag.match(/\btime="([^"]+)"/i)?.[1] ?? "";
    const atmosphere = tag.match(/\b(?:atmosphere|weather|mood)="([^"]+)"/i)?.[1] ?? "";
    const clock = time.match(/\b(\d{1,2}):([0-5]\d)(?!\d)(?:\s*(SA|CH))?(?!\s*[ap]\.?m)/i);
    const vietnameseWeather = /mưa|bão|giông|dông|sấm|mưa đá|sương mù dày/i.test(atmosphere);
    const period = /bình minh|rạng đông|hửng sáng|buổi sáng/i.test(time)
      ? "dawn"
      : /chạng vạng|hoàng hôn|chiều tà|buổi tối/i.test(time)
        ? "dusk"
        : /buổi trưa|giữa trưa|buổi chiều|ban ngày/i.test(time)
          ? "day"
          : /ban đêm|nửa đêm|đêm khuya/i.test(time)
            ? "night"
            : undefined;
    if (!clock && !vietnameseWeather && !period) return tag;
    let hour = clock ? Number(clock[1]) : undefined;
    if (clock?.[3]) hour = (hour! % 12) + (clock[3].toUpperCase() === "CH" ? 12 : 0);
    const sky = vietnameseWeather
      ? "noir"
      : hour === undefined
        ? period!
        : hour >= 20 || hour < 5
          ? "night"
          : hour < 9
            ? "dawn"
            : hour >= 17
              ? "dusk"
              : "day";
    // Let the native dusk filters select particles from the scene's atmosphere.
    if (sky === "dusk" && useVietnameseRegex && /\blocation="[^"]*"[^>]*\btime="/i.test(tag))
      return tag;
    // Source override regex expects sky before location/time.
    return tag.replace(/<scene_header\b/i, `<scene_header sky="${sky}"`);
  });
}
