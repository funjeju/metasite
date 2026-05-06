import { genAI } from "./gemini-client";
import { calcCost } from "./cost";
import type { GeneratedArticle, SiteContext, AiUsage } from "./types";

function buildSystemPrompt(ctx: SiteContext): string {
  const PERSONA_DESC: Record<string, string> = {
    friendly_expert: "You write as a friendly expert who makes complex topics approachable.",
    data_journalist: "You write as a data-driven journalist who backs every claim with numbers.",
    storyteller: "You write as a storyteller who hooks readers with narrative arcs.",
    critic: "You write as a sharp critic who challenges conventional wisdom.",
    curator: "You write as a trusted curator who synthesises the best information.",
  };
  const TONE_DESC: Record<string, string> = {
    friendly: "friendly and warm",
    professional: "professional and formal",
    casual: "casual and relaxed",
    academic: "academic and in-depth",
    news: "news article style",
  };

  let prompt = `You are the Writer agent for the "${ctx.name}" site about "${ctx.topic}".
Persona: ${PERSONA_DESC[ctx.persona] ?? ctx.persona}
Tone: ${TONE_DESC[ctx.tone] ?? ctx.tone}
Language: ${ctx.language === "ko" ? "Korean (한국어)" : "English"}
Site domain: ${ctx.canonicalDomain}

Your job is to write high-quality, SEO-optimised long-form articles.
Always respond with valid JSON matching the schema exactly.
Never fabricate citations — only include URLs you are confident are real.
Target 1200-2000 words for authority articles, 800-1200 for ongoing.`;

  if (ctx.promptOverrides?.writer) {
    prompt += `\n\nSITE-SPECIFIC INSTRUCTIONS:\n${ctx.promptOverrides.writer}`;
  }

  return prompt;
}

const ARTICLE_SCHEMA = `{
  "title": "string (H1, include primary keyword near start)",
  "slug": "string (lowercase-kebab-case, max 60 chars)",
  "excerpt": "string (150-160 chars, meta description quality)",
  "body": "string (full Markdown article)",
  "faq": [{"question":"string","answer":"string"}],
  "tags": ["string"],
  "citations": ["url-string"]
}`;

export async function writeArticle(
  ctx: SiteContext,
  title: string,
  angle: string,
  targetKeyword: string,
  summaries?: string[]
): Promise<GeneratedArticle & { _usage: AiUsage }> {
  const systemPrompt = buildSystemPrompt(ctx);

  const userContent = summaries?.length
    ? `Write a comprehensive article.\nTitle: ${title}\nAngle: ${angle}\nTarget keyword: ${targetKeyword}\n\nSource summaries to incorporate:\n${summaries.map((s, i) => `[${i + 1}] ${s}`).join("\n\n")}\n\nRespond ONLY with JSON matching this schema:\n${ARTICLE_SCHEMA}`
    : `Write a comprehensive authority article.\nTitle: ${title}\nAngle: ${angle}\nTarget keyword: ${targetKeyword}\n\nRespond ONLY with JSON matching this schema:\n${ARTICLE_SCHEMA}`;

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: systemPrompt,
  });

  const result = await model.generateContent(userContent);
  const text = result.response.text();
  const jsonStr = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const parsed = JSON.parse(jsonStr) as GeneratedArticle;
  parsed.wordCount = parsed.body.split(/\s+/).filter(Boolean).length;

  const meta = result.response.usageMetadata;
  const _usage = calcCost("gemini-2.5-flash", {
    input_tokens: meta?.promptTokenCount ?? 0,
    output_tokens: meta?.candidatesTokenCount ?? 0,
  });

  return { ...parsed, _usage };
}
