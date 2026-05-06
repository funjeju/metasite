import { genAI } from "./gemini-client";
import type { OutlineItem, SiteContext } from "./types";

const BASE_SYSTEM = `You are an SEO content strategist. Your job is to create comprehensive authority content outlines.
Rules:
1. Generate 28-42 article ideas that together cover the topic comprehensively.
2. Each article should target a distinct keyword cluster.
3. Mix pillar articles (broad) with cluster articles (specific).
4. Slugs must be unique lowercase-kebab-case.
Respond ONLY with a JSON array.`;

export async function generateOutline(ctx: SiteContext): Promise<OutlineItem[]> {
  const SYSTEM = ctx.promptOverrides?.outlineGenerator
    ? `${BASE_SYSTEM}\n\nSITE-SPECIFIC INSTRUCTIONS:\n${ctx.promptOverrides.outlineGenerator}`
    : BASE_SYSTEM;

  const lang = ctx.language === "ko" ? "Korean" : "English";

  const prompt = `Generate a 28-42 article outline for an authority site.

Site name: ${ctx.name}
Topic: ${ctx.topic}
Language: ${lang}
Persona: ${ctx.persona}

Respond ONLY with a JSON array where each item matches:
{
  "seq": number,
  "title": "string",
  "slug": "string",
  "angle": "string (1-line hook/angle)",
  "targetKeyword": "string"
}`;

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM,
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const jsonStr = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  return JSON.parse(jsonStr) as OutlineItem[];
}
