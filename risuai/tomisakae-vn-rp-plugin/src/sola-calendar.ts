export const SOLA_CALENDAR_ID = "01a0c1ff-4ecf-7021-a569-56ddfda40b76";

/** Move chronology into the opening header without changing the source preset. */
export function adaptSolaCalendarPrompt(
  content: string,
  calendarEnabled: boolean,
  vietnamese: boolean,
): string {
  const date = vietnamese ? "[Ngày trong truyện · Ngày tháng năm]" : "[Story day · Calendar date]";
  if (content.includes("## Calendar & Chronology Tracker")) {
    const location = vietnamese ? "[Địa điểm trong cảnh]" : "[Scene location]";
    const time = vietnamese ? "[Giờ hoặc buổi trong ngày]" : "[Time of day]";
    return `{{// Tracks calendar date, elapsed time, and seasonal progression in the opening scene header.}}
{{trim}}
{{setvar::mod_track_date::
- Chronology (<scene_header>): Track story day and calendar date in date, time of day in time; advance by elapsed duration.}}
## Calendar & Chronology Tracker
At the start of every response, after any reasoning and before narration or dialogue, include the current chronology in the scene header:
<scene_header location="${location}" date="${date}" time="${time}" />

Rules:
- date: Include the story/campaign day and known weekday, day, month, year, or in-universe calendar. Retain known seasonal context; omit unknown calendar details rather than inventing them.
- Advance time logically. Travel, labor, research, and rest consume real hours.
- Short verbal exchanges take minutes; journeys and rests advance hours or days.
- Ground season, temperature, and lighting in the current calendar date.
- Keep calendar and time in the opening header, outside the trailing HUD and its digest; do not append a separate <date> tracker.`;
  }
  if (calendarEnabled && content.includes("## Cinematic Establishing Headers")) {
    content = content
      .replace(/(<scene_header location="[^"]*") time=/, `$1 date="${date}" time=`)
      .replace(
        "- `time`: Natural time of day or chronology",
        "- `date`: Current story day and known calendar date, following Calendar & Chronology.\n- `time`: Natural time of day",
      );
  }
  return content
    .replaceAll("Day [N] · [Time of Day] · ", "")
    .replaceAll("Day [N] · [Time] · ", "")
    .replaceAll("Day 42 · Dusk · ", "")
    .replaceAll("Ngày [N] · [Thời gian trong ngày] · ", "")
    .replaceAll("Ngày [N] · [Thời gian] · ", "")
    .replaceAll("Ngày 42 · Chạng vạng · ", "")
    .replaceAll("<story_notes>, <date>,", "<story_notes>,")
    .replace(
      "Ensure you encapsulate all trackers within the hud.",
      "Ensure you encapsulate all state trackers within the HUD; chronology belongs in the opening scene header.",
    )
    .replace(
      "Wrap all active tracker blocks at the end of your response inside a single, unified HUD container:",
      "Wrap all active state tracker blocks, excluding chronology, at the end of your response inside a single, unified HUD container:",
    )
    .replace(
      "- Consolidate all active trackers inside the single `<sola_hud>` container.",
      "- Consolidate all active state trackers inside the single `<sola_hud>` container; keep calendar and time in the opening header.",
    )
    .replace(
      "in-world day and time, followed by active telemetry scores",
      "active tempo gear and telemetry scores",
    );
}
