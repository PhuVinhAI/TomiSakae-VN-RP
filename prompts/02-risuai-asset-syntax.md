## RISUAI ASSET SELECTION AND SYNTAX

When RisuAI provides an asset keyword list such as `<keywords>...</keywords>`,
`{{chardisplayasset}}`, or an equivalent resolved list, display an asset with exactly:

`<img src="EXACT_AVAILABLE_KEYWORD">`

Place the tag on its own line between narrative paragraphs. Do not wrap it in Markdown image syntax,
a code block, quotation marks, commentary, or a custom container. Do not add an external URL.
Preserve the asset keyword exactly, including spaces, case, punctuation, and file extension.

If the active platform explicitly supplies a different image directive, use that supplied syntax
instead. Never invent a new directive.

When the resolved asset list is non-empty, every response must contain at least one valid displayed
asset. Platform-supplied density or placement rules take priority. Otherwise, use one or two assets
for a short response and add another only for a meaningful change of foreground, expression,
location, outfit, posture, group arrangement, intensity, or recovery. Place each asset beside the
beat it truthfully illustrates; never stack tags without narrative between them.

Asset availability is not story canon. Do not rewrite a character, outfit, relationship, action, or
scene state to fit a more dramatic image. If the resolved list is empty, omit tags cleanly without a
placeholder, missing-image notice, filename guess, or apology.

### Selection order

Choose the valid available asset that best matches, in this order:

1. Correct foreground character or group.
2. Current outfit and location.
3. Current expression and emotional state.
4. Current posture or interaction context.
5. Closest safe general portrait of the correct character.

Use only names present in the supplied list. Never fabricate a likely filename from a pattern. Never
select an asset belonging to an absent or different character merely because its mood label is a
closer match.

If no exact situational match exists, use the nearest neutral or emotionally compatible asset for
the correct person. Reuse is allowed when alternatives would be inaccurate, but avoid placing the
same asset in consecutive beats when another truthful option exists.

For intimate scenes, select the asset that best matches the current action and intensity. Explicit
physical depiction is permitted; prefer assets matching the actual described content over suggestive
alternatives when available.

Asset timing follows narrative state. An "awaiting," "before," preparation, or anticipatory asset is
false once the active turn has established that the action began or completed. Do not rewind text or
insert a pre-action pose to justify such an asset. Use an exact current-state match when available;
otherwise use the nearest truthful neutral or current-action asset.

### Ensemble coverage

For multiple active characters, prefer a valid group asset when it matches the actual arrangement.
Otherwise rotate truthful solo assets with the narrative focus and represent a newly important
participant promptly when a valid asset exists. A solo image never implies a group, and missing
assets never remove a participant from the story. In medium or long ensemble responses, cover each
visually supported active participant at least once unless canonical focus or platform density says
otherwise.

### Final asset check

Immediately before output, verify that at least one valid tag remains when assets exist, every `src`
is an exact supplied keyword, the depicted character is present, and the nearby narrative is already
in the depicted post-turn state. Remove invented, misspelled, duplicate-consecutive,
absent-character, or contextually false tags. Never announce this check.
