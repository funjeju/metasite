import { AppShell } from "@/components/layout/AppShell";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { SiteListCard, type SiteListItem } from "@/components/dashboard/SiteListCard";
import { SystemStatusChart } from "@/components/dashboard/SystemStatusChart";
import { PublishActivityChart } from "@/components/dashboard/PublishActivityChart";
import { RecentAlertsCard, type AlertItem } from "@/components/dashboard/RecentAlertsCard";
import { Globe, FileText, DollarSign, TrendingUp, Clock } from "lucide-react";

const MOCK_SITES: SiteListItem[] = [
  {
    siteId: "travel-kr",
    displayName: "Travel KR",
    status: "active",
    currentPhase: "authority",
    healthOverall: "healthy",
    canonicalDomain: "travel-kr.com",
    publishedPosts: 24,
  },
  {
    siteId: "ai-news-en",
    displayName: "AI News EN",
    status: "active",
    currentPhase: "ongoing",
    healthOverall: "warning",
    canonicalDomain: "ainews.tistory.com",
    publishedPosts: 142,
  },
  {
    siteId: "finance-kr",
    displayName: "Finance KR",
    status: "paused",
    currentPhase: "authority",
    healthOverall: "critical",
    canonicalDomain: "finance-kr.blogspot.com",
    publishedPosts: 38,
  },
];

const MOCK_ALERTS: AlertItem[] = [
  {
    alertId: "a1",
    severity: "high",
    category: "publish_failure",
    siteId: "ai-news-en",
    title: "Tistory API 요청 실패",
    message: "Rate limit 초과: 5건의 발행이 실패했습니다",
    status: "open",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    alertId: "a2",
    severity: "medium",
    category: "budget",
    title: "일일 AI 예산 80% 도달",
    message: "오늘 AI 사용량이 $40에 달했습니다",
    status: "open",
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    alertId: "a3",
    severity: "low",
    category: "source_dead",
    siteId: "travel-kr",
    title: "RSS 피드 응답 없음",
    message: "travel-blog.com RSS가 2시간째 응답하지 않습니다",
    status: "acknowledged",
    createdAt: new Date(Date.now() - 10800000).toISOString(),
  },
];

const ACTIVITY_DATA = [
  { date: "04/30", published: 8, failed: 1 },
  { date: "05/01", published: 12, failed: 0 },
  { date: "05/02", published: 6, failed: 2 },
  { date: "05/03", published: 15, failed: 1 },
  { date: "05/04", published: 9, failed: 0 },
  { date: "05/05", published: 11, failed: 3 },
  { date: "05/06", published: 7, failed: 1 },
];

const STATUS_DATA = [
  { name: "정상", value: 6, color: "#22c55e" },
  { name: "경고", value: 2, color: "#f59e0b" },
  { name: "오류", value: 1, color: "#ef4444" },
  { name: "일시정지", value: 1, color: "#94a3b8" },
];

export default function DashboardPage() {
  return (
    <AppShell title="대시보드" description="META-SITE 전체 현황">
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <KpiCard
            title="운영 사이트"
            value={10}
            change={2}
            changeLabel="이번 달"
            icon={Globe}
            color="purple"
          />
          <KpiCard
            title="총 발행 글"
            value={1284}
            change={18}
            changeLabel="이번 주"
            icon={FileText}
            color="cyan"
          />
          <KpiCard
            title="오늘 발행"
            value={23}
            change={-5}
            changeLabel="어제 대비"
            icon={Clock}
            color="emerald"
          />
          <KpiCard
            title="주간 트래픽"
            value="24.5K"
            change={12}
            changeLabel="지난주 대비"
            icon={TrendingUp}
            color="amber"
          />
          <KpiCard
            title="이번달 AI 비용"
            value="$38.2"
            change={-8}
            changeLabel="예산 대비"
            icon={DollarSign}
            color="rose"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <PublishActivityChart data={ACTIVITY_DATA} />
          </div>
          <SystemStatusChart data={STATUS_DATA} total={10} />
        </div>

        {/* Site List + Alerts */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SiteListCard sites={MOCK_SITES} />
          <RecentAlertsCard alerts={MOCK_ALERTS} />
        </div>
      </div>
    </AppShell>
  );
}
