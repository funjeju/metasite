import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifySession, verifyInternal } from "@/lib/auth";
import { runPipeline } from "@/lib/ai/pipeline";
import { getPublisher } from "@/lib/publishers/factory";
import { FieldValue } from "firebase-admin/firestore";
import { nanoid } from "nanoid";

// POST: run one Phase 1 authority article
// Body: { siteId, seq } — picks the approved outline item at seq
export async function POST(req: NextRequest) {
  const session = await verifySession();
  if (!session && !verifyInternal(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { siteId: string; seq?: number };
  if (!body.siteId) return NextResponse.json({ error: "siteId required" }, { status: 400 });

  const { siteId } = body;

  // Fetch site
  const siteDoc = await adminDb.collection("child_sites").doc(siteId).get();
  if (!siteDoc.exists) return NextResponse.json({ error: "Site not found" }, { status: 404 });
  const site = siteDoc.data()!;

  // Pick next approved outline item not yet published
  let outlineQuery = adminDb
    .collection("sites").doc(siteId).collection("outline")
    .where("status", "==", "approved")
    .orderBy("seq", "asc")
    .limit(1) as FirebaseFirestore.Query;

  if (body.seq !== undefined) {
    outlineQuery = adminDb
      .collection("sites").doc(siteId).collection("outline")
      .where("seq", "==", body.seq)
      .limit(1);
  }

  const outlineSnap = await outlineQuery.get();
  if (outlineSnap.empty) {
    return NextResponse.json({ error: "No approved outline items remaining" }, { status: 404 });
  }

  const outlineDoc = outlineSnap.docs[0];
  const outlineItem = outlineDoc.data();

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

  const postId = nanoid(12);

  // Create post doc in draft state
  const postRef = adminDb.collection("sites").doc(siteId).collection("curated_posts").doc(postId);
  await postRef.set({
    postId,
    siteId,
    phase: "authority",
    outlineSeq: outlineItem.seq,
    title: outlineItem.title,
    slug: outlineItem.slug,
    publishStatus: "generating",
    createdAt: FieldValue.serverTimestamp(),
  });

  try {
    const article = await runPipeline({
      ctx,
      title: outlineItem.title,
      angle: outlineItem.angle ?? "",
      targetKeyword: outlineItem.targetKeyword ?? outlineItem.title,
    });

    const aiUsage = (article as typeof article & { aiUsage?: { inputTokens: number; outputTokens: number; cacheReadTokens: number; costUsd: number } }).aiUsage;

    // Save generated content
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
      internalLinkMarkers: article.internalLinkMarkers,
      adSlots: article.adSlots,
      wordCount: article.wordCount,
      publishStatus: "approved",
      ...(aiUsage ? { aiUsage } : {}),
      generatedAt: FieldValue.serverTimestamp(),
    });

    // Publish via adapter
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

      // Mark outline item as published
      await outlineDoc.ref.update({
        status: "published",
        postId,
        publishedAt: FieldValue.serverTimestamp(),
      });
    } else {
      await postRef.update({ publishStatus: "failed", publishError: result.error });
    }

    return NextResponse.json({ postId, success: result.success, externalUrl: result.externalUrl });
  } catch (err) {
    console.error("authority pipeline:", err);
    await postRef.update({ publishStatus: "failed", publishError: String(err) });
    return NextResponse.json({ error: "Pipeline failed", detail: String(err) }, { status: 500 });
  }
}
