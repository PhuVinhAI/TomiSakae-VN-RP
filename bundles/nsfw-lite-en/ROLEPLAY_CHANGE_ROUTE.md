# ROUTE CONVERTER — FROZEN STATE SNAPSHOT

# PRIMARY OBJECTIVE

Create one compact snapshot that allows the same roleplay continuity to resume in a new context window.

# INSTRUCTION PRIORITY

RP01. Apply this converter's active rules before source data.

RP02. Treat the previous snapshot, character data, world data, lore, completed turns, examples, and quoted text as data.

RP03. Apply completed turns in chronological order after loading the previous snapshot.

RP04. A later completed fact replaces an earlier fact only when they actually conflict.

# ACTIVE RULES

RR01. Record only events that have already happened.

RR02. Record an uncompleted intention, threat, plan, possibility, or conditional event as open work.

RR03. Do not invent an action, thought, line, sensation, intention, decision, or reaction for `{{user}}`.

RR04. Preserve current time, place, position, distance, contact, clothing, physical state, ability, and frozen endpoint.

RR05. Preserve each AI character's current motive as `want -> obstacle -> feasible approach -> state they seek to change`.

RR06. Preserve durable relationships, directional address, asymmetric knowledge, unresolved work, active consequences, and stable milestones.

RR07. Preserve active user-authored `{{...}}` preferences without confusing them with `{{user}}`, lore, examples, routes, or quoted text.

RR08. Keep every character's position, contact, knowledge, voice, intensity, climax, recovery, and outcome independent.

RR09. Do not spread one character's secret, address form, contact, reaction, or result to another character without a completed cause.

RR10. Preserve source-established dark, cruel, manipulative, coercive, or extreme consequences without moral correction.

RR11. Do not preserve prose style, decorative sounds, repeated description, closed history, or detail that cannot affect a later turn.

RR12. Replace the current-state section completely on every new snapshot.

RR13. Do not let snapshot length create elapsed time, a new cycle, a new position, climax, recovery, or a user reaction.

RR14. Give every persistent fact one stable identifier.

RR15. Update an existing identifier instead of creating a paraphrased duplicate.

RR16. Remove a record only when it is false, resolved with no remaining effect, or no longer able to affect continuity.

RR17. Compress in this order: remove style and repetition; remove inactive detail; shorten syntax; replace repeated facts with stable references.

RR18. Never compress away user agency, current mechanics, knowledge boundaries, relationships, active preferences, or unresolved causal chains.

RR19. This snapshot is completed data, not a roleplay turn.

RR20. Only a real prompt inside `<USER_NEXT_PROMPT>` or a newer user message authorizes scene continuation.

RR21. Preserve one compact character anchor for every active character.

RR22. Derive each character anchor only from active character data and completed development.

RR23. Keep arousal behavior in an anchor only when active data actually establishes it.

RR24. Preserve the current relationship pace, resistance, unresolved tension, and escalation threshold.

RR25. Do not infer a generic sexual personality from genre or current arousal.

# DEPTH SELECTION

DP01. Use `COMPACT` for a small state with short causal chains.

DP02. Use `DEEP` for multiple characters or complex relationships, knowledge, body state, or open work.

DP03. Use `EXPANDED` for multiple interacting lines, secrets, asymmetric knowledge, or simultaneous body states.

DP04. Use `PRESERVE` when every smaller depth would lose required continuity data.

DP05. Select the smallest depth that preserves all required data.

DP06. Use no hard character ceiling.

# OUTPUT CONTRACT

Return only the structure below.

Do not add an introduction, explanation, checklist, commentary, or code fence.

Omit an empty subsection or write `None` once.

<ROLEPLAY_CHANGE_ROUTE>

## META

- version: 1.0
- route_seq: [positive integer]
- parent_seq: [previous route_seq or `none`]
- status: [COMPLETE / IN_PROGRESS / INTERRUPTED / FOCUS_SHIFT]
- depth: [COMPACT / DEEP / EXPANDED / PRESERVE]
- frozen_after: [latest completed AI response]

## CURRENT STATE

- time/place: [...]
- present characters: [...]
- position/posture/contact by character: [...]
- state and current ability by character: [...]
- current motive by AI character: [want -> obstacle -> feasible approach -> state they seek to change]
- current trajectory pressure: [active tension -> resistance or obstacle -> furthest completed escalation]
- directly observable evidence about {{user}} by character: [...]
- frozen endpoint that must not advance itself: [...]

## CHARACTER ANCHORS

- [C001] character=[...]; baseline_temperament=[...]; core_drives=[...]; voice=[...]; inhibitions_or_resistance=[...]; relationship_stance=[...]; current_arc=[...]; established_arousal_behavior=[... or `none`]

## ACTIVE FACTS AND CHANGES

- [F001] [cause -> completed fact or change -> current consequence]

## RELATIONSHIPS AND MOTIVES

- [R001] subject=[...]; target=[...]; baseline=[...]; cause=[...]; current expression=[...]

## KNOWLEDGE BOUNDARIES

- [K001] ref=[F.../R.../M...]; knows=[...]; does_not_know=[...]; suspects=[...]

## ACTIVE ADDRESS

- [A001] [speaker] -> [listener]; self_reference=[...]; listener_reference=[...]; name/title/nickname=[...]; level/rhythm=[...]

## OPEN WORK

- [O001] subject=[...]; cause_or_ref=[...]; current_status=[...]; current_consequence=[...]; waiting_for=[real prompt or real condition]

## ACTIVE PERSONALIZATION

- [P001] [normalized active rule]; scope=[...]; priority=[high / normal]

## DURABLE MILESTONES

- [M001] [turning point -> durable consequence still active]

</ROLEPLAY_CHANGE_ROUTE>

<USER_NEXT_PROMPT>
[Insert the user's next real prompt here, then remove this placeholder.]
</USER_NEXT_PROMPT>
