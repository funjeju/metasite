import type { AiUsage } from "./types";

// Per-million-token pricing (USD)
const PRICING: Record<string, { input: number; output: number; cacheRead: number }> = {
  // Anthropic (kept for historical cost records)
  "claude-opus-4-7-20251101":  { input: 15,   output: 75,  cacheRead: 3.75 },
  "claude-sonnet-4-6":         { input: 3,    output: 15,  cacheRead: 0.30 },
  "claude-haiku-4-5-20251001": { input: 0.80, output: 4,   cacheRead: 0.08 },
  // Gemini
  "gemini-2.5-flash":          { input: 0.075, output: 0.30, cacheRead: 0 },
  "gemini-2.5-pro":            { input: 1.25,  output: 10,   cacheRead: 0 },
};

export function calcCost(
  model: string,
  usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number }
): AiUsage {
  const p = PRICING[model] ?? PRICING["gemini-2.5-flash"];
  const inputTokens = usage.input_tokens;
  const outputTokens = usage.output_tokens;
  const cacheReadTokens = usage.cache_read_input_tokens ?? 0;
  const billableInput = inputTokens - cacheReadTokens;

  const costUsd =
    (billableInput / 1_000_000) * p.input +
    (cacheReadTokens / 1_000_000) * p.cacheRead +
    (outputTokens / 1_000_000) * p.output;

  return {
    inputTokens,
    outputTokens,
    cacheReadTokens,
    costUsd: Math.round(costUsd * 1_000_000) / 1_000_000,
  };
}

export function sumUsage(usages: AiUsage[]): AiUsage {
  return usages.reduce(
    (acc, u) => ({
      inputTokens: acc.inputTokens + u.inputTokens,
      outputTokens: acc.outputTokens + u.outputTokens,
      cacheReadTokens: acc.cacheReadTokens + u.cacheReadTokens,
      costUsd: Math.round((acc.costUsd + u.costUsd) * 1_000_000) / 1_000_000,
    }),
    { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, costUsd: 0 }
  );
}
