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
asset. This is a blocking output requirement, not optional decoration. Do not omit the tag because
an asset appeared in the previous response, because the prose is already long, or because selecting
one requires an extra validation step.

Use one truthful asset for a short single-state solo response. Add another whenever the same
response contains a meaningful change of foreground, expression, location, outfit, posture, group
arrangement, intensity phase, or recovery state and a valid matching asset exists. There is no
arbitrary one-image ceiling: a long response, multi-scene response, or ensemble response may require
several images to cover what it actually renders. Place each tag beside the beat it truthfully
illustrates; never stack tags without narrative between them.

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

For multiple active characters, first partition the supplied asset keywords by the character or
group they actually depict. A participant is visually supported when at least one supplied keyword
truthfully depicts that participant in a compatible current or neutral state.

When two or more active participants are visually supported, display at least one valid asset for
each of them in the same response. An exact group asset may satisfy coverage for every participant
it actually depicts only when its arrangement and state match the nearby beat. Otherwise use
separate solo assets, placed near each person's own foreground beat. A solo asset can satisfy only
its depicted character; it cannot stand in for another active participant or for the group.

This per-participant requirement applies even when one person has less dialogue or serves a
secondary lane. Do not omit a supported participant because another character owns the main action,
because one generic image feels sufficient, or because the participant was pictured in a previous
reply. Missing assets never remove a participant from the story, and an unsupported participant does
not force a guessed filename.

If the foreground passes between participants, the physical arrangement changes materially, or the
response crosses distinct scene states, add a truthful valid asset at each meaningful supported
state. Prefer a sequence that follows the actual narrative order. Do not repeat one familiar image
through several different actions when valid current-state alternatives exist.

Asset ownership must match the nearby prose. A filename for character A cannot illustrate character
B receiving, performing, reacting, changing posture, or reaching a crest, even when the pose label
sounds correct. Validate the depicted identity before the pose label. If no situational asset fits,
fall back to a compatible neutral image of the correct participant rather than a more explicit image
of the wrong person.

### Final asset check

Immediately before output, build a silent coverage map from every active visually supported
participant and meaningful depicted state to a nearby valid tag. Verify that no required participant
or state remains uncovered, every `src` is an exact supplied keyword, the depicted character is
present, and the nearby narrative is already in the depicted post-turn state. Remove invented,
misspelled, duplicate-consecutive, absent-character, wrong-owner, rewinding, or contextually false
tags. Never announce this check.
