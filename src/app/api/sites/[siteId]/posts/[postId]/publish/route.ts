import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifySession } from "@/lib/auth";
import { getPublisher } from "@/lib/publishers/factory";
import { FieldValue } from "firebase-admin/firestore";

// POST /api/sites/[siteId]/posts/[postId]/publish
// Manually publish an approved post
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string; postId: string }> }
) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { siteId, postId } = await params;

  const postRef = adminDb.collection("sites").doc(siteId).collection("curated_posts").doc(postId);
  const postDoc = await postRef.get();
  if (!postDoc.exists) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const post = postDoc.data()!;
  if (!["approved", "draft"].includes(post.publishStatus)) {
    return NextResponse.json({ error: `Cannot publish post in status: ${post.publishStatus}` }, { status: 400 });
  }

  const publisher = await getPublisher(siteId);
  const result = await publisher.publish({
    siteId,
    postId,
    title: post.title ?? "",
    slug: post.slug ?? postId,
    excerpt: post.excerpt ?? "",
    body: post.bodyHtml ?? "",
    tags: post.tags ?? [],
    publishedAt: new Date().toISOString(),
    aiUsage: post.aiUsage,
  });

  if (result.success) {
    await postRef.update({
      publishStatus: "published",
      publishedAt: FieldValue.serverTimestamp(),
      externalId: result.externalId ?? null,
      externalUrl: result.externalUrl ?? null,
    });
    return NextResponse.json({ ok: true, externalUrl: result.externalUrl });
  } else {
    await postRef.update({ publishStatus: "failed", publishError: result.error });
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
}
