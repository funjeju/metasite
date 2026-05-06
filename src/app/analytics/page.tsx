import { requireAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { serialize } from "@/lib/serialize";
import { AppShell } from "@/components/layout/AppShell";
import { AnalyticsOverview } from "@/components/analytics/AnalyticsOverview";

export default async function AnalyticsPage() {
  await requireAuth();

  const [sitesSnap, snapshotsSnap, reportsSnap] = await Promise.all([
    adminDb.collection("child_sites").where("status", "!=", "archived").get(),
    adminDb
      .collection("analytics_snapshots")
      .where("date", ">=", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
      .orderBy("date", "asc")
      .limit(500)
      .get(),
    adminDb
      .collection("analytics_reports")
      .orderBy("createdAt", "desc")
      .limit(10)
      .get(),
  ]);

  const sites = sitesSnap.docs.map((d) => serialize({ id: d.id, ...d.data() }));
  const snapshots = snapshotsSnap.docs.map((d) => serialize(d.data()));
  const reports = reportsSnap.docs.map((d) => serialize({ id: d.id, ...d.data() }));

  return (
    <AppShell title="분석" description="전체 사이트 트래픽 및 성과 분석">
      <AnalyticsOverview sites={sites} snapshots={snapshots} reports={reports} />
    </AppShell>
  );
}
