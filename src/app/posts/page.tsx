import { requireAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { serialize } from "@/lib/serialize";
import { AppShell } from "@/components/layout/AppShell";
import { PostsTable } from "@/components/posts/PostsTable";
import { PostsStatusTabs } from "@/components/posts/PostsStatusTabs";

type Status = "published" | "draft" | "approved" | "failed" | "all";

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAuth();
  const { status: rawStatus } = await searchParams;
  const status: Status = (["published", "draft", "approved", "failed", "all"].includes(rawStatus ?? "") ? rawStatus : "published") as Status;

  const sitesSnap = await adminDb.collection("child_sites").where("status", "!=", "archived").get();

  const postArrays = await Promise.all(
    sitesSnap.docs.map(async (siteDoc) => {
      let q = adminDb
        .collection("sites").doc(siteDoc.id).collection("curated_posts")
        .orderBy("createdAt", "desc")
        .limit(50);
      if (status !== "all") {
        q = adminDb
          .collection("sites").doc(siteDoc.id).collection("curated_posts")
          .where("publishStatus", "==", status)
          .orderBy(status === "published" ? "publishedAt" : "createdAt", "desc")
          .limit(50);
      }
      const snap = await q.get();
      return snap.docs.map((d) =>
        serialize({ id: d.id, siteId: siteDoc.id, siteName: siteDoc.data().displayName ?? siteDoc.id, ...d.data() })
      );
    })
  );

  const posts = (postArrays.flat() as Record<string, unknown>[])
    .sort((a, b) => {
      const key = status === "published" ? "publishedAt" : "createdAt";
      const aT = typeof a[key] === "string" ? new Date(a[key] as string).getTime() : 0;
      const bT = typeof b[key] === "string" ? new Date(b[key] as string).getTime() : 0;
      return bT - aT;
    })
    .slice(0, 100);

  const statusLabel: Record<Status, string> = {
    published: "발행된 글",
    draft: "임시저장",
    approved: "승인됨",
    failed: "실패",
    all: "전체 글",
  };

  return (
    <AppShell title={statusLabel[status]} description="전체 사이트 글 목록">
      <div className="space-y-4">
        <PostsStatusTabs current={status} basePath="/posts" />
        <PostsTable initialPosts={posts} />
      </div>
    </AppShell>
  );
}
