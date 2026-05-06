import { genAI } from "./gemini-client";
import { marked } from "marked";
import { calcCost } from "./cost";
import type { VerifiedArticle, EditedArticle, SiteContext, AiUsage } from "./types";

const BASE_SYSTEM = `You are the Editor agent. You perform two tasks simultaneously:
1. Generate SEO meta tags for the article.
2. Optimize the article body for on-page SEO without changing its meaning or tone.

Body optimization rules:
- First paragraph MUST naturally mention the targetKeyword within the first 100 characters.
- Add LSI (Latent Semantic Indexing) keywords naturally into H2 headings where they fit without sounding forced.
- Insert {{ARTICLE:slug}} markers in the body where internal links to related articles are relevant. Place the marker inline within a natural sentence, like: "As explained in {{ARTICLE:related-slug}}, ...". Only use slugs provided in internalLinkSlugs list — do not invent new slugs.
- Do NOT rewrite or restructure the article — only make targeted keyword/link insertions.
- Keep all existing markdown formatting intact.

Respond ONLY with valid JSON.`;

export async function editArticle(
  article: VerifiedArticle,
  ctx: SiteContext,
  targetKeyword: string
): Promise<EditedArticle & { _usage: AiUsage }> {
  const SYSTEM = ctx.promptOverrides?.editor
    ? `${BASE_SYSTEM}\n\nSITE-SPECIFIC INSTRUCTIONS:\n${ctx.promptOverrides.editor}`
    : BASE_SYSTEM;

  const prompt = `Optimize this article for SEO.

Target keyword: ${targetKeyword}
Site topic: ${ctx.topic}
Site keywords: ${ctx.siteKeywords?.join(", ") ?? ""}
Internal link slugs available: ${JSON.stringify((article as { internalLinkMarkers?: string[] }).internalLinkMarkers ?? [])}

Article title: ${article.title}
Article excerpt: ${article.excerpt}
Article slug: ${article.slug}

Full article body (Markdown):
\`\`\`markdown
${article.body}
\`\`\`

Respond ONLY with JSON:
{
  "metaTitle": "50-60 char title with keyword near start",
  "metaDescription": "150-160 char description with keyword and CTA",
  "internalLinkMarkers": ["slugs you inserted as {{ARTICLE:slug}} in optimizedBody"],
  "adSlots": [2, 6, 10],
  "optimizedBody": "full markdown with keyword in first paragraph, LSI in H2s, and {{ARTICLE:slug}} markers inserted"
}`;

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM,
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const jsonStr = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  let edits: {
    metaTitle: string;
    metaDescription: string;
    internalLinkMarkers: string[];
    adSlots: number[];
    optimizedBody?: string;
  };
  try {
    edits = JSON.parse(jsonStr);
  } catch {
    edits = {
      metaTitle: article.title.slice(0, 60),
      metaDescription: article.excerpt.slice(0, 160),
      internalLinkMarkers: [],
      adSlots: [2, 6],
      optimizedBody: article.body,
    };
  }

  const finalBody = edits.optimizedBody?.trim() || article.body;
  const bodyHtml = await marked(finalBody);

  const meta = result.response.usageMetadata;
  const _usage = calcCost("gemini-2.5-flash", {
    input_tokens: meta?.promptTokenCount ?? 0,
    output_tokens: meta?.candidatesTokenCount ?? 0,
  });

  return {
    ...article,
    body: finalBody,
    bodyHtml,
    metaTitle: edits.metaTitle ?? article.title.slice(0, 60),
    metaDescription: edits.metaDescription ?? article.excerpt.slice(0, 160),
    internalLinkMarkers: edits.internalLinkMarkers ?? [],
    adSlots: edits.adSlots ?? [2, 6],
    _usage,
  };
}
