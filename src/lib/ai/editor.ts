import Anthropic from "@anthropic-ai/sdk";
import { marked } from "marked";
import { calcCost } from "./cost";
import type { VerifiedArticle, EditedArticle, SiteContext, AiUsage } from "./types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    system: SYSTEM,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content.find((b) => b.type === "text")?.text ?? "{}";
  const jsonStr = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  let edits: {
    metaTitle: string;
    metaDescription: string;
    internalLinkMarkers: string[];
    adSlots: number[];
  };
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

  const _usage = calcCost("claude-sonnet-4-6", {
    input_tokens: response.usage.input_tokens,
    output_tokens: response.usage.output_tokens,
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
