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
