import { AppShell } from "@/components/layout/AppShell";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { SiteListCard, type SiteListItem } from "@/components/dashboard/SiteListCard";
import { SystemStatusChart } from "@/components/dashboard/SystemStatusChart";
import { PublishActivityChart } from "@/components/dashboard/PublishActivityChart";
import { RecentAlertsCard, type AlertItem } from "@/components/dashboard/RecentAlertsCard";
import { Globe, FileText, DollarSign, TrendingUp, Clock } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { serialize } from "@/lib/serialize";

export default async function DashboardPage() {
  await requireAuth();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [sitesSnap, alertsSnap] = await Promise.all([
    adminDb.collection("child_sites").orderBy("createdAt", "desc").get(),
    adminDb.collection("alerts").orderBy("createdAt", "desc").limit(5).get(),
  ]);

  const sites = sitesSnap.docs.map((d) => serialize(d.data()));
  const activeSites = sites.filter((s) => s.status !== "archived");

  // Fetch activity chart (last 7 days) + today count + monthly AI cost
  let todayPublished = 0;
  let monthCostUsd = 0;
  const activityByDay: Record<string, { published: number; failed: number }> = {};

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  await Promise.all(
    sitesSnap.docs
      .filter((d) => d.data().status !== "archived")
      .map(async (siteDoc) => {
        // Activity chart: last 7 days
        const recentSnap = await adminDb
          .collection("sites").doc(siteDoc.id).collection("curated_posts")
          .where("publishedAt", ">=", sevenDaysAgo.toISOString())
          .get();

        for (const postDoc of recentSnap.docs) {
          const data = postDoc.data();
          const pubAt = data.publishedAt as string | undefined;
          if (!pubAt) continue;
          const dayKey = pubAt.slice(0, 10);
          if (!activityByDay[dayKey]) activityByDay[dayKey] = { published: 0, failed: 0 };
          if (data.publishStatus === "published") {
            activityByDay[dayKey].published++;
            if (pubAt >= todayStart.toISOString()) todayPublished++;
          } else if (data.publishStatus === "failed") {
            activityByDay[dayKey].failed++;
          }
        }

        // Monthly AI cost: from the 1st of this month
        const monthSnap = await adminDb
          .collection("sites").doc(siteDoc.id).collection("curated_posts")
          .where("generatedAt", ">=", monthStart.toISOString())
          .get();

        for (const postDoc of monthSnap.docs) {
          monthCostUsd += ((postDoc.data().aiUsage as { costUsd?: number })?.costUsd ?? 0);
        }
      })
  );

  const totalPosts = activeSites.reduce((sum, s) => sum + ((s.stats as { publishedPosts?: number })?.publishedPosts ?? 0), 0);
  const weeklyTraffic = activeSites.reduce((sum, s) => sum + ((s.stats as { weeklyTrafficEstimate?: number })?.weeklyTrafficEstimate ?? 0), 0);

  const healthCounts = { healthy: 0, warning: 0, critical: 0, paused: 0 };
  for (const s of activeSites) {
    if (s.status === "paused") healthCounts.paused++;
    else {
      const h = (s.healthStatus as { overall?: string })?.overall ?? "healthy";
      if (h in healthCounts) healthCounts[h as keyof typeof healthCounts]++;
    }
  }

  const siteListItems: SiteListItem[] = activeSites.slice(0, 6).map((s) => ({
    siteId: s.siteId as string,
    displayName: (s.displayName ?? s.name) as string,
    status: (s.status as "active" | "paused" | "archived") ?? "active",
    currentPhase: (s.currentPhase as "authority" | "ongoing" | "paused") ?? "authority",
    healthOverall: (((s.healthStatus as { overall?: string })?.overall ?? "healthy") as "healthy" | "warning" | "critical"),
    canonicalDomain: ((s.seoConfig as { canonicalDomain?: string })?.canonicalDomain ?? "") as string,
    publishedPosts: ((s.stats as { publishedPosts?: number })?.publishedPosts ?? 0) as number,
  }));

  const alertItems: AlertItem[] = alertsSnap.docs.map((d) => {
    const a = serialize(d.data());
    return {
      alertId: a.alertId as string,
      severity: (a.severity as "low" | "medium" | "high" | "critical") ?? "low",
      category: a.category as string,
      siteId: a.siteId as string | undefined,
      title: a.title as string,
      message: a.message as string,
      status: (a.status as "open" | "acknowledged" | "resolved" | "archived") ?? "open",
      createdAt: (a.createdAt ?? new Date().toISOString()) as string,
    };
  });

  const statusData = [
    { name: "정상", value: healthCounts.healthy, color: "#22c55e" },
    { name: "경고", value: healthCounts.warning, color: "#f59e0b" },
    { name: "오류", value: healthCounts.critical, color: "#ef4444" },
    { name: "일시정지", value: healthCounts.paused, color: "#94a3b8" },
  ].filter((s) => s.value > 0);

  const activityData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    return {
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      published: activityByDay[key]?.published ?? 0,
      failed: activityByDay[key]?.failed ?? 0,
    };
  });

  return (
    <AppShell title="대시보드" description="META-SITE 전체 현황">
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <KpiCard title="운영 사이트" value={activeSites.length} icon={Globe} color="purple" />
          <KpiCard title="총 발행 글" value={totalPosts} icon={FileText} color="cyan" />
          <KpiCard title="오늘 발행" value={todayPublished} icon={Clock} color="emerald" />
          <KpiCard
            title="주간 트래픽"
            value={weeklyTraffic > 0 ? `${(weeklyTraffic / 1000).toFixed(1)}K` : "0"}
            icon={TrendingUp}
            color="amber"
          />
          <KpiCard title="이번달 AI 비용" value={`$${monthCostUsd.toFixed(2)}`} icon={DollarSign} color="rose" />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <PublishActivityChart data={activityData} />
          </div>
          <SystemStatusChart data={statusData} total={activeSites.length} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SiteListCard sites={siteListItems} />
          <RecentAlertsCard alerts={alertItems} />
        </div>
      </div>
    </AppShell>
  );
}
