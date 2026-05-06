import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifySession } from "@/lib/auth";
import { serialize } from "@/lib/serialize";
import { generateComments } from "@/lib/ai/comment-generator";
import { FieldValue } from "firebase-admin/firestore";
import { nanoid } from "nanoid";

type Params = { params: Promise<{ siteId: string; postId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { siteId, postId } = await params;
  const snap = await adminDb
    .collection("sites").doc(siteId).collection("curated_posts").doc(postId).collection("comments")
    .orderBy("createdAt", "asc")
    .get();

  return NextResponse.json({ comments: snap.docs.map((d) => serialize({ id: d.id, ...d.data() })) });
}

// POST with action: "generate" | "add"
export async function POST(req: NextRequest, { params }: Params) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { siteId, postId } = await params;
  const body = await req.json() as { action?: string; count?: number; content?: string; author?: string };

  if (body.action === "generate") {
    const postDoc = await adminDb.collection("sites").doc(siteId).collection("curated_posts").doc(postId).get();
    if (!postDoc.exists) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    const siteDoc = await adminDb.collection("child_sites").doc(siteId).get();
    const site = siteDoc.data()!;

    const ctx = {
      siteId,
      name: site.displayName ?? site.name ?? siteId,
      topic: site.topic ?? "",
      persona: site.persona ?? "curator",
      tone: site.tone ?? "professional",
      language: site.language ?? "ko",
      canonicalDomain: site.seoConfig?.canonicalDomain ?? "",
    };

    const post = postDoc.data()!;
    const count = Math.min(Math.max(body.count ?? 3, 2), 5) as 2 | 3 | 4 | 5;
    const generated = await generateComments(ctx, {
      title: post.title as string ?? "",
      excerpt: post.excerpt as string ?? "",
      body: post.bodyMd as string ?? post.bodyHtml as string ?? "",
    }, count);

    const batch = adminDb.batch();
    const commentsRef = adminDb.collection("sites").doc(siteId).collection("curated_posts").doc(postId).collection("comments");
    for (const comment of generated) {
      const commentId = `c_${nanoid(8)}`;
      batch.set(commentsRef.doc(commentId), {
        commentId,
        ...comment,
        approved: true,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();

    return NextResponse.json({ generated: generated.length, comments: generated });
  }

  // Manual comment add
  const commentId = `c_${nanoid(8)}`;
  await adminDb
    .collection("sites").doc(siteId).collection("curated_posts").doc(postId).collection("comments")
    .doc(commentId).set({
      commentId,
      content: body.content ?? "",
      personaName: body.author ?? "독자",
      isAi: false,
      approved: true,
      createdAt: FieldValue.serverTimestamp(),
    });

  return NextResponse.json({ commentId }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { siteId, postId } = await params;
  const commentId = req.nextUrl.searchParams.get("commentId");
  if (!commentId) return NextResponse.json({ error: "commentId required" }, { status: 400 });

  await adminDb
    .collection("sites").doc(siteId).collection("curated_posts").doc(postId).collection("comments")
    .doc(commentId).delete();

  return NextResponse.json({ ok: true });
}
