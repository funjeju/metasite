import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? "");

const LANG_LABEL: Record<string, string> = {
  ko: "한국어 (Korean)",
  en: "English",
  ja: "日本語 (Japanese)",
  zh: "中文 (Chinese)",
};

export async function POST(req: NextRequest) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, topic, language, description } = await req.json();
  if (!name || !topic || !language) {
    return NextResponse.json({ error: "name, topic, language are required" }, { status: 400 });
  }

  const lang = LANG_LABEL[language] ?? language;
  const userHint = description ? `\nUser's draft description: "${description}"` : "";

  const prompt = `You are an expert SEO strategist. Analyze the following website and provide SEO-optimized recommendations.

Site Name: ${name}
Topic/Niche: ${topic}
Language: ${lang}${userHint}

Provide the following in JSON format (no markdown, raw JSON only):
{
  "metaTitle": "SEO-optimized page title (50-60 chars, include primary keyword, compelling)",
  "description": "Meta description (140-160 chars, include 2-3 keywords naturally, call-to-action)",
  "keywords": ["10-15 keywords: mix of brand terms, short-tail (1-2 words), long-tail (3-5 words), all in ${lang}"],
  "sectionSuggestions": [
    {"name": "section name in ${lang}", "slug": "english-slug"},
    {"name": "section name in ${lang}", "slug": "english-slug"},
    {"name": "section name in ${lang}", "slug": "english-slug"},
    {"name": "section name in ${lang}", "slug": "english-slug"},
    {"name": "section name in ${lang}", "slug": "english-slug"}
  ]
}

Rules:
- All text content must be in ${lang}
- Keywords should be what users actually search for in ${lang}
- Section suggestions should match the topic niche
- metaTitle and description must be compelling and click-worthy`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();
    const json = raw.startsWith("{") ? raw : raw.replace(/^```json?\n?/, "").replace(/\n?```$/, "");
    const data = JSON.parse(json);

    return NextResponse.json({
      metaTitle: data.metaTitle ?? "",
      description: data.description ?? "",
      keywords: Array.isArray(data.keywords) ? data.keywords : [],
      sectionSuggestions: Array.isArray(data.sectionSuggestions) ? data.sectionSuggestions : [],
    });
  } catch (err) {
    console.error("seo-suggest error:", err);
    return NextResponse.json({ error: "AI 추천 생성 실패" }, { status: 500 });
  }
}
