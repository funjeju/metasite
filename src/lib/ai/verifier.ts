import Anthropic from "@anthropic-ai/sdk";
import { calcCost } from "./cost";
import type { GeneratedArticle, VerifiedArticle, SiteContext, AiUsage } from "./types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const BASE_SYSTEM = `You are the Verifier agent. Your job is to fact-check articles and remove fabricated citations.
Rules:
1. Remove any citation URL you cannot verify as a real, accessible URL.
2. Flag claims that appear fabricated or statistically impossible.
3. Do not rewrite the body — only note issues.
Respond ONLY with valid JSON.`;

export async function verifyArticle(
  article: GeneratedArticle,
  ctx?: Pick<SiteContext, "promptOverrides">
): Promise<VerifiedArticle & { _usage: AiUsage }> {
  const SYSTEM = ctx?.promptOverrides?.verifier
    ? `${BASE_SYSTEM}\n\nSITE-SPECIFIC INSTRUCTIONS:\n${ctx.promptOverrides.verifier}`
    : BASE_SYSTEM;
  const prompt = `Verify this article and return the corrected data.

Title: ${article.title}
Citations to check: ${JSON.stringify(article.citations)}
Body excerpt (first 500 chars): ${article.body.slice(0, 500)}

Respond ONLY with JSON:
{
  "keepCitations": ["array of citation URLs that are likely real"],
  "removedCitations": ["array of citation URLs that appear fabricated"],
  "factCheckNotes": "brief summary of any factual concerns found"
}`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: SYSTEM,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content.find((b) => b.type === "text")?.text ?? "{}";
  const jsonStr = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  let result: { keepCitations: string[]; removedCitations: string[]; factCheckNotes: string };
  try {
    result = JSON.parse(jsonStr);
  } catch {
    result = { keepCitations: article.citations, removedCitations: [], factCheckNotes: "" };
  }

  const _usage = calcCost("claude-sonnet-4-6", {
    input_tokens: response.usage.input_tokens,
    output_tokens: response.usage.output_tokens,
  });

  return {
    ...article,
    citations: result.keepCitations ?? article.citations,
    removedCitations: result.removedCitations ?? [],
    factCheckNotes: result.factCheckNotes ?? "",
    _usage,
  };
}
