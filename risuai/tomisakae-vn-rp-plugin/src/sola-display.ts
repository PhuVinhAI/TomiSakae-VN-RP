/** Resolve Vietnamese scene values on a render copy; never rewrite saved RP. */
export function adaptSolaSceneHeaderForDisplay(input: string): string {
  return input.replace(/<scene_header\b[^>]*\/?>/gi, (tag) => {
    if (/\bsky\s*=/.test(tag)) return tag;
    const time = tag.match(/\btime="([^"]+)"/i)?.[1] ?? "";
    const atmosphere = tag.match(/\b(?:atmosphere|weather|mood)="([^"]+)"/i)?.[1] ?? "";
    const clock = time.match(/\b(\d{1,2}):(\d{2})(?:\s*(SA|CH))?(?!\s*[ap]\.?m)/i);
    const vietnameseWeather = /mưa|bão|giông|dông|sấm|mưa đá|sương mù dày/i.test(atmosphere);
    if (!clock && !vietnameseWeather) return tag;
    let hour = clock ? Number(clock[1]) : undefined;
    if (clock?.[3]) hour = (hour! % 12) + (clock[3].toUpperCase() === "CH" ? 12 : 0);
    const sky = vietnameseWeather
      ? "noir"
      : hour === undefined || hour >= 20 || hour < 5
        ? "night"
        : hour < 9
          ? "dawn"
          : hour >= 17
            ? "dusk"
            : "day";
    return tag.replace(/\s*\/?>(?=$)/, ` sky="${sky}" />`);
  });
}
