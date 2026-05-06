import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifySession, verifyInternal } from "@/lib/auth";
import { scoutSources, evaluateRelevance } from "@/lib/ai/scout";
import { runPipeline } from "@/lib/ai/pipeline";
import { getPublisher } from "@/lib/publishers/factory";
import { FieldValue } from "firebase-admin/firestore";
import { nanoid } from "nanoid";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// POST: run Phase 2 pipeline for a site
// Body: { siteId }
export async function POST(req: NextRequest) {
  const session = await verifySession();
  if (!session && !verifyInternal(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { siteId: string };
  if (!body.siteId) return NextResponse.json({ error: "siteId required" }, { status: 400 });

  const { siteId } = body;

  const siteDoc = await adminDb.collection("child_sites").doc(siteId).get();
  if (!siteDoc.exists) return NextResponse.json({ error: "Site not found" }, { status: 404 });
  const site = siteDoc.data()!;

  const ctx = {
    siteId,
    name: site.displayName ?? site.name ?? siteId,
    topic: site.topic ?? "",
    persona: site.persona ?? "curator",
    tone: site.tone ?? "professional",
    language: site.language ?? "ko",
    canonicalDomain: site.seoConfig?.canonicalDomain ?? "",
    promptOverrides: (site.promptOverrides as { writer?: string; verifier?: string; editor?: string }) ?? {},
  };

  // 1. Scout: fetch RSS feeds
  const sourcesSnap = await adminDb
    .collection("sites").doc(siteId).collection("sources")
    .where("type", "==", "rss")
    .limit(20)
    .get();

  const feedUrls = sourcesSnap.docs.map((d) => d.data().url as string).filter(Boolean);

  if (feedUrls.length === 0) {
    return NextResponse.json({ error: "No RSS sources configured" }, { status: 400 });
  }

  const allItems = await scoutSources(ctx, feedUrls);

  // 2. Evaluate: filter relevant items
  const relevant = await evaluateRelevance(allItems, ctx);

  if (relevant.length === 0) {
    return NextResponse.json({ skipped: true, reason: "No relevant items found" });
  }

  // 3. Summarise top 5 items with Claude
  const top5 = relevant.slice(0, 5);
  const summaries: string[] = [];

  for (const item of top5) {
    const res = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `Summarise this article in 2-3 sentences for use as a source:\nTitle: ${item.title}\nContent: ${item.contentSnippet}`,
        },
      ],
    });
    const text = res.content.find((b) => b.type === "text")?.text ?? "";
    summaries.push(`${item.title}: ${text}`);
  }

  // 4. Generate article
  const postId = nanoid(12);
  const postRef = adminDb.collection("sites").doc(siteId).collection("curated_posts").doc(postId);
  await postRef.set({
    postId,
    siteId,
    phase: "ongoing",
    publishStatus: "generating",
    sourceUrls: top5.map((i) => i.link),
    createdAt: FieldValue.serverTimestamp(),
  });

  try {
    const article = await runPipeline({
      ctx,
      title: `${ctx.topic} 최신 동향: ${new Date().toLocaleDateString("ko-KR")}`,
      angle: "Recent developments and what they mean for readers",
      targetKeyword: ctx.topic,
      summaries,
    });

    const aiUsage = (article as typeof article & { aiUsage?: { inputTokens: number; outputTokens: number; cacheReadTokens: number; costUsd: number } }).aiUsage;

    await postRef.update({
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      bodyMd: article.body,
      bodyHtml: article.bodyHtml,
      faq: article.faq,
      tags: article.tags,
      citations: article.citations,
      metaTitle: article.metaTitle,
      metaDescription: article.metaDescription,
      wordCount: article.wordCount,
      publishStatus: "approved",
      ...(aiUsage ? { aiUsage } : {}),
      generatedAt: FieldValue.serverTimestamp(),
    });

    const publisher = await getPublisher(siteId);
    const result = await publisher.publish({
      siteId,
      postId,
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      body: article.bodyHtml,
      tags: article.tags,
      publishedAt: new Date().toISOString(),
      aiUsage,
    });

    if (result.success) {
      await postRef.update({
        publishStatus: "published",
        publishedAt: FieldValue.serverTimestamp(),
        externalId: result.externalId ?? null,
        externalUrl: result.externalUrl ?? null,
      });
    } else {
      await postRef.update({ publishStatus: "failed", publishError: result.error });
    }

    return NextResponse.json({ postId, success: result.success });
  } catch (err) {
    console.error("generate pipeline:", err);
    await postRef.update({ publishStatus: "failed", publishError: String(err) });
    return NextResponse.json({ error: "Pipeline failed", detail: String(err) }, { status: 500 });
  }
}
