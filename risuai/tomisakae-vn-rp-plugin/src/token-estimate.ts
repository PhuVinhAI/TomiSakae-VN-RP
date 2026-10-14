import { countTokens, setMergeCacheSize } from "gpt-tokenizer/encoding/o200k_base";
import {
  composePresetPrompts,
  expandHostMacros,
  type FfGlobalSettings,
  type FfPreset,
  type HostMacroContext,
} from "./core.js";
import { vietnameseOutputFor } from "./preset-family.js";
import { GEMMA_FIX_PROMPT } from "./gemma-fix.js";

// Literal tokenizer markers in a card or prompt are ordinary text here.
const TEXT_OPTIONS = { allowedSpecial: new Set<string>(), disallowedSpecial: new Set<string>() };
setMergeCacheSize(5000);

export interface PromptTokenEntry {
  identifier: string;
  tokens: number;
}

export interface PluginTokenEstimate {
  tokens: number;
  contentTokens: number;
  framingTokens: number;
  messageCount: number;
  entries: PromptTokenEntry[];
}

/** Estimates only the prompts added by this plugin, using its real composer. */
export async function estimatePluginPromptTokens(
  preset: FfPreset,
  settings: FfGlobalSettings,
  hostContext: HostMacroContext,
): Promise<PluginTokenEstimate> {
  const estimate: PluginTokenEstimate = {
    tokens: 0,
    contentTokens: 0,
    framingTokens: 0,
    messageCount: 0,
    entries: [],
  };
  if (!settings.enabled) return estimate;

  const cache = new Map<string, number>();
  const count = (text: string) => {
    const cached = cache.get(text);
    if (cached !== undefined) return cached;
    const tokens = countTokens(text, TEXT_OPTIONS);
    cache.set(text, tokens);
    return tokens;
  };
  const composed = await composePresetPrompts(
    preset,
    settings,
    async (content) => expandHostMacros(content, hostContext),
    // Preview must not roll dice or affect the values used for actual generation.
    {
      randomInt: (minimum) => minimum,
      ...(hostContext.dialogueTheme ? { dialogueTheme: hostContext.dialogueTheme } : {}),
    },
    (message, prompt) => {
      const existing = estimate.entries.find((entry) => entry.identifier === prompt.identifier);
      if (existing) existing.tokens += count(message.content);
      else estimate.entries.push({ identifier: prompt.identifier, tokens: count(message.content) });
    },
  );
  const messages = [...composed.leading, ...composed.absolute, ...composed.trailing];
  const imagePrompt = composed.leading.find((message) =>
    String(message.memo).endsWith(":image-optimization"),
  );
  if (imagePrompt) {
    estimate.entries.push({ identifier: "image-optimization", tokens: count(imagePrompt.content) });
  }
  if (settings.vietnameseOutputEnabled) {
    const outputPrompt = vietnameseOutputFor(preset);
    messages.push({ role: "system", content: outputPrompt });
    estimate.entries.push({
      identifier: "vietnamese-output",
      tokens: count(outputPrompt),
    });
  }
  if (settings.gemmaFixEnabled) {
    const suffix = `\n\n${expandHostMacros(GEMMA_FIX_PROMPT, hostContext)}`;
    const tokens = count(suffix);
    estimate.contentTokens += tokens;
    estimate.entries.push({ identifier: "gemma-fix", tokens });
  }
  for (const message of messages) {
    estimate.contentTokens += count(message.content);
    // Approximate chat framing; the actual provider may merge or wrap messages differently.
    estimate.framingTokens += 3 + count(message.role);
  }
  estimate.messageCount = messages.length;
  estimate.tokens = estimate.contentTokens + estimate.framingTokens;
  return estimate;
}
