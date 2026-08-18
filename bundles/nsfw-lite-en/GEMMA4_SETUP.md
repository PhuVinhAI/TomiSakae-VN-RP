# Gemma 4 31B runtime setup

This file contains deployment requirements, not roleplay instructions. Do not append it to the system prompt.

## Chat template

- Use a Gemma 4 chat template or the provider's native Gemma 4 Chat Completion path.
- Send `MASTER_PROMPT.md` through the native `system` role.
- Do not use a Gemma 2 or Gemma 3 context template.
- Do not manually add raw control tokens when the tokenizer already applies the chat template.
- Treat repeated braces, repeated syllables, pseudo-words, corrupted HTML breaks, or language-like gibberish as a template/backend failure before changing the roleplay prompt.
- Verify Jinja/template selection, tokenizer version, backend compatibility, and state-cache features when corrupted output appears.

## Thinking mode

- Start with thinking disabled for ordinary character chat, prose-first roleplay, and uncomplicated ERP.
- Enable thinking only for rule-heavy RPG state, complex multi-character mechanics, or tasks that measurably benefit from it.
- Set a bounded reasoning budget when thinking is enabled.
- Disable thinking when regeneration loops through draft/rewrite cycles, consumes the output budget, or makes prose dry and repetitive.
- Do not add repeated “think step by step” instructions to user messages.

## Effective context

- Start evaluation around 16K–32K context rather than assuming the full advertised context is the best roleplay context.
- Use `ROLEPLAY_CHANGE_ROUTE.md` to retain compact active state when history grows.
- Keep current character anchors, unresolved causal chains, spatial state, and active preferences close to the response instruction.
- Increase context only after testing character fidelity, prose quality, and scene continuity at the smaller setting.

## Checkpoint, quantization, and sampling

- Record the exact checkpoint, provider, quantization, template, sampler, and context settings for every comparison.
- Do not assume behavior from one abliterated, tuned, or quantized build represents the base instruction checkpoint.
- Do not treat higher temperature alone as a reliable fix for semantically identical swipes.
- Evaluate swipe diversity by trajectory, initiative, and consequence rather than wording changes.
- Treat persistent personality flattening or narrow trajectories as a checkpoint limitation if the template and prompt contract are already correct.
