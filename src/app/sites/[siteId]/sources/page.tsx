import { requireAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { serialize } from "@/lib/serialize";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { SiteSourcesManager } from "@/components/sources/SiteSourcesManager";

export default async function SiteSourcesPage({ params }: { params: Promise<{ siteId: string }> }) {
  await requireAuth();
  const { siteId } = await params;

  const siteDoc = await adminDb.collection("child_sites").doc(siteId).get();
  if (!siteDoc.exists) notFound();
  const site = serialize(siteDoc.data()!);

  const snap = await adminDb
    .collection("sites").doc(siteId).collection("sources")
    .orderBy("createdAt", "desc")
    .get();
  const sources = snap.docs.map((d) => serialize({ id: d.id, siteId, ...d.data() }));

  return (
    <AppShell title={`출처 관리 — ${site.displayName ?? site.name ?? siteId}`} description="RSS 피드 및 콘텐츠 출처 관리">
      <SiteSourcesManager siteId={siteId} initialSources={sources} />
    </AppShell>
  );
}
