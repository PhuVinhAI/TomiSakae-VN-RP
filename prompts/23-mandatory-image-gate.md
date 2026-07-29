## MANDATORY IMAGE OUTPUT GATE

Immediately before returning the response, inspect the resolved asset list and the drafted output.

If at least one valid image asset is available:

1. Count valid image tags in the draft.
2. If the count is zero, insert the best matching valid asset after the opening narrative beat.
3. Check each major speaker or focus change and add a distinct relevant asset where one exists.
4. For an ensemble, check whether every visually supported active participant received coverage.
5. Remove invented, misspelled, absent-character, duplicate-consecutive, or contextually false tags.
6. Confirm every remaining `src` exactly matches an available keyword.
7. Confirm at least one valid image tag remains after editing.

Do not rewrite the narrative, character state, outfit, relationship, or action to match an available
asset. When no asset exactly matches, use the nearest truthful general image allowed by RISUAI ASSET
SELECTION AND SYNTAX.

Do not return the response until this gate passes. Never announce the count, list missing assets, or
mention that an image was inserted to satisfy a rule.

If no valid assets are available, skip this gate and return clean prose without placeholders.
