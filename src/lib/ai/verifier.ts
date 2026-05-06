import { genAI } from "./gemini-client";
import { calcCost } from "./cost";
import type { GeneratedArticle, VerifiedArticle, SiteContext, AiUsage } from "./types";

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

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM,
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const jsonStr = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  let parsed: { keepCitations: string[]; removedCitations: string[]; factCheckNotes: string };
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    parsed = { keepCitations: article.citations, removedCitations: [], factCheckNotes: "" };
  }

  const meta = result.response.usageMetadata;
  const _usage = calcCost("gemini-2.5-flash", {
    input_tokens: meta?.promptTokenCount ?? 0,
    output_tokens: meta?.candidatesTokenCount ?? 0,
  });

  return {
    ...article,
    citations: parsed.keepCitations ?? article.citations,
    removedCitations: parsed.removedCitations ?? [],
    factCheckNotes: parsed.factCheckNotes ?? "",
    _usage,
  };
}
