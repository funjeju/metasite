import { requireAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { serialize } from "@/lib/serialize";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { SiteAnalytics } from "@/components/analytics/SiteAnalytics";

export default async function SiteAnalyticsPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  await requireAuth();
  const { siteId } = await params;

  const siteDoc = await adminDb.collection("child_sites").doc(siteId).get();
  if (!siteDoc.exists) notFound();

  const site = serialize({ id: siteDoc.id, ...siteDoc.data()! }) as Record<string, unknown>;
  const siteName = ((site.displayName ?? site.name ?? siteId) as string);

  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [snapshotsSnap, reportsSnap] = await Promise.all([
    adminDb
      .collection("analytics_snapshots")
      .where("siteId", "==", siteId)
      .where("date", ">=", cutoff)
      .orderBy("date", "asc")
      .limit(90)
      .get(),
    adminDb
      .collection("analytics_reports")
      .where("siteId", "==", siteId)
      .orderBy("createdAt", "desc")
      .limit(4)
      .get(),
  ]);

  const snapshots = snapshotsSnap.docs.map((d) => serialize(d.data()));
  const reports = reportsSnap.docs.map((d) => serialize({ id: d.id, ...d.data() }));

  return (
    <AppShell title={`${siteName} — 분석`} description="30일 트래픽 및 AI 인사이트">
      <SiteAnalytics siteId={siteId} snapshots={snapshots} reports={reports} />
    </AppShell>
  );
}
