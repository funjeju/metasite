import { requireAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { serialize } from "@/lib/serialize";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PostsTable } from "@/components/posts/PostsTable";
import { PostsStatusTabs } from "@/components/posts/PostsStatusTabs";

type Status = "published" | "draft" | "approved" | "failed" | "all";

export default async function SitePostsPage({
  params,
  searchParams,
}: {
  params: Promise<{ siteId: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAuth();
  const { siteId } = await params;
  const { status: rawStatus } = await searchParams;
  const status: Status = (["published", "draft", "approved", "failed", "all"].includes(rawStatus ?? "")
    ? rawStatus
    : "all") as Status;

  const siteDoc = await adminDb.collection("child_sites").doc(siteId).get();
  if (!siteDoc.exists) notFound();

  const site = siteDoc.data()!;
  const siteName: string = site.displayName ?? site.name ?? siteId;

  let q = adminDb
    .collection("sites").doc(siteId).collection("curated_posts")
    .orderBy("createdAt", "desc")
    .limit(200);

  if (status !== "all") {
    q = adminDb
      .collection("sites").doc(siteId).collection("curated_posts")
      .where("publishStatus", "==", status)
      .orderBy(status === "published" ? "publishedAt" : "createdAt", "desc")
      .limit(200);
  }

  const snap = await q.get();
  const posts = snap.docs.map((d) =>
    serialize({ id: d.id, siteId, siteName, ...d.data() })
  );

  return (
    <AppShell title={`${siteName} — 글 목록`} description={`${posts.length}편`}>
      <div className="space-y-4">
        <PostsStatusTabs current={status} basePath={`/sites/${siteId}/posts`} />
        <PostsTable initialPosts={posts} showExport />
      </div>
    </AppShell>
  );
}
