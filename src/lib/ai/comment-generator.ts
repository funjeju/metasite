import Anthropic from "@anthropic-ai/sdk";
import type { SiteContext } from "./types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface GeneratedComment {
  personaName: string;
  personaType: string;
  content: string;
  isAi: true;
}

const COMMENT_PERSONAS = [
  {
    type: "curious_reader",
    name: "궁금한 독자",
    prompt: (lang: string) =>
      `You are a curious reader who just read the article. Write 1-2 sentences asking a thoughtful follow-up question or sharing genuine curiosity. ${lang === "ko" ? "Answer in Korean." : "Answer in English."} Be natural, not promotional.`,
  },
  {
    type: "expert_agree",
    name: "업계 전문가",
    prompt: (lang: string) =>
      `You are an industry expert who agrees with the article. Add 1-2 sentences of supporting insight or a related example from your experience. ${lang === "ko" ? "Answer in Korean." : "Answer in English."} Sound knowledgeable but conversational.`,
  },
  {
    type: "skeptic",
    name: "비판적 독자",
    prompt: (lang: string) =>
      `You are a thoughtful skeptic. Raise 1 polite counterpoint or ask for more evidence on a specific claim. ${lang === "ko" ? "Answer in Korean." : "Answer in English."} Be respectful, not hostile.`,
  },
  {
    type: "practical",
    name: "실용적 독자",
    prompt: (lang: string) =>
      `You are a practical reader. Share how you might apply this information or ask about a specific practical scenario. ${lang === "ko" ? "Answer in Korean." : "Answer in English."} Keep it brief and actionable.`,
  },
  {
    type: "appreciator",
    name: "감사하는 독자",
    prompt: (lang: string) =>
      `You are a grateful reader who found the article very helpful. Write 1-2 sentences of genuine appreciation and mention what specifically helped you. ${lang === "ko" ? "Answer in Korean." : "Answer in English."} Avoid generic praise.`,
  },
];

export async function generateComments(
  ctx: SiteContext,
  article: { title: string; excerpt: string; body: string },
  count: 2 | 3 | 4 | 5 = 3
): Promise<GeneratedComment[]> {
  const selectedPersonas = COMMENT_PERSONAS.slice(0, count);
  const articleSummary = `Title: ${article.title}\nExcerpt: ${article.excerpt}\nContent snippet: ${article.body.slice(0, 600)}`;

  const comments = await Promise.all(
    selectedPersonas.map(async (persona) => {
      const res = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        messages: [
          {
            role: "user",
            content: `${persona.prompt(ctx.language)}\n\nArticle:\n${articleSummary}\n\nWrite your comment:`,
          },
        ],
      });
      const content = res.content.find((b) => b.type === "text")?.text?.trim() ?? "";
      return {
        personaName: persona.name,
        personaType: persona.type,
        content,
        isAi: true as const,
      };
    })
  );

  return comments;
}
