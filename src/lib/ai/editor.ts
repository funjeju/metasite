import { genAI } from "./gemini-client";
import { marked } from "marked";
import { calcCost } from "./cost";
import type { VerifiedArticle, EditedArticle, SiteContext, AiUsage } from "./types";

const BASE_SYSTEM = `You are the Editor agent. Your job is to apply SEO optimizations and mark internal link opportunities.
Rules:
1. metaTitle: 50-60 chars, includes primary keyword.
2. metaDescription: 150-160 chars, compelling CTA.
3. internalLinkMarkers: slugs of articles on the same site this article should link to (leave empty if unknown).
4. adSlots: paragraph indices (0-based) where display ads would be natural (after intro, mid-article, near end).
Respond ONLY with valid JSON.`;

export async function editArticle(
  article: VerifiedArticle,
  ctx: SiteContext
): Promise<EditedArticle & { _usage: AiUsage }> {
  const SYSTEM = ctx.promptOverrides?.editor
    ? `${BASE_SYSTEM}\n\nSITE-SPECIFIC INSTRUCTIONS:\n${ctx.promptOverrides.editor}`
    : BASE_SYSTEM;

  const prompt = `Optimize this article for SEO.

Title: ${article.title}
Excerpt: ${article.excerpt}
Slug: ${article.slug}
Site topic: ${ctx.topic}

Respond ONLY with JSON:
{
  "metaTitle": "string",
  "metaDescription": "string",
  "internalLinkMarkers": ["slug1", "slug2"],
  "adSlots": [2, 6, 10]
}`;

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM,
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const jsonStr = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  let edits: { metaTitle: string; metaDescription: string; internalLinkMarkers: string[]; adSlots: number[] };
  try {
    edits = JSON.parse(jsonStr);
  } catch {
    edits = {
      metaTitle: article.title.slice(0, 60),
      metaDescription: article.excerpt.slice(0, 160),
      internalLinkMarkers: [],
      adSlots: [2, 6],
    };
  }

  const bodyHtml = await marked(article.body);

  const meta = result.response.usageMetadata;
  const _usage = calcCost("gemini-2.5-flash", {
    input_tokens: meta?.promptTokenCount ?? 0,
    output_tokens: meta?.candidatesTokenCount ?? 0,
  });

  return {
    ...article,
    bodyHtml,
    metaTitle: edits.metaTitle ?? article.title.slice(0, 60),
    metaDescription: edits.metaDescription ?? article.excerpt.slice(0, 160),
    internalLinkMarkers: edits.internalLinkMarkers ?? [],
    adSlots: edits.adSlots ?? [2, 6],
    _usage,
  };
}
