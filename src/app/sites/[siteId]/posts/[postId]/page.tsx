import { requireAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { serialize } from "@/lib/serialize";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PostDetail } from "@/components/posts/PostDetail";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ siteId: string; postId: string }>;
}) {
  await requireAuth();
  const { siteId, postId } = await params;

  const [postDoc, siteDoc] = await Promise.all([
    adminDb.collection("sites").doc(siteId).collection("curated_posts").doc(postId).get(),
    adminDb.collection("child_sites").doc(siteId).get(),
  ]);

  if (!postDoc.exists) notFound();

  const post = serialize({ id: postDoc.id, siteId, ...postDoc.data()! }) as Record<string, unknown>;
  const site = siteDoc.exists ? serialize(siteDoc.data()!) as Record<string, unknown> : {} as Record<string, unknown>;

  const commentsSnap = await adminDb
    .collection("sites").doc(siteId).collection("curated_posts").doc(postId).collection("comments")
    .orderBy("createdAt", "asc")
    .get();
  const comments = commentsSnap.docs.map((d) => serialize({ id: d.id, ...d.data() }));

  return (
    <AppShell
      title={post.title as string ?? "글 상세"}
      description={(site.displayName as string) ?? siteId}
    >
      <PostDetail post={post} siteId={siteId} initialComments={comments} />
    </AppShell>
  );
}
