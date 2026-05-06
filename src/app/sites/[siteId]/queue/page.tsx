import { requireAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { serialize } from "@/lib/serialize";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { SiteQueueBoard } from "@/components/queue/SiteQueueBoard";

export default async function SiteQueuePage({ params }: { params: Promise<{ siteId: string }> }) {
  await requireAuth();
  const { siteId } = await params;

  const siteDoc = await adminDb.collection("child_sites").doc(siteId).get();
  if (!siteDoc.exists) notFound();
  const site = serialize(siteDoc.data()!);

  const snap = await adminDb
    .collection("sites").doc(siteId).collection("curated_posts")
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();
  const posts = snap.docs.map((d) => serialize({ id: d.id, siteId, ...d.data() }));

  return (
    <AppShell title={`발행 큐 — ${site.displayName ?? site.name ?? siteId}`} description="사이트별 발행 큐 관리">
      <SiteQueueBoard siteId={siteId} initialPosts={posts} />
    </AppShell>
  );
}
