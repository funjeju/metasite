import Link from "next/link";
import { Plus, Globe, Filter } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const MOCK_SITES = [
  {
    siteId: "travel-kr",
    displayName: "Travel KR",
    topic: "여행",
    hostingType: "nextjs",
    currentPhase: "authority",
    status: "active",
    healthStatus: { overall: "healthy" },
    stats: { totalPosts: 28, publishedPosts: 24, failedPosts: 1 },
    seoConfig: { canonicalDomain: "travel-kr.com" },
    lastActivityAt: new Date(Date.now() - 3600000),
  },
  {
    siteId: "ai-news-en",
    displayName: "AI News EN",
    topic: "AI/테크",
    hostingType: "tistory",
    currentPhase: "ongoing",
    status: "active",
    healthStatus: { overall: "warning" },
    stats: { totalPosts: 156, publishedPosts: 142, failedPosts: 6 },
    seoConfig: { canonicalDomain: "ainews.tistory.com" },
    lastActivityAt: new Date(Date.now() - 1800000),
  },
  {
    siteId: "finance-kr",
    displayName: "Finance KR",
    topic: "금융",
    hostingType: "blogger",
    currentPhase: "authority",
    status: "paused",
    healthStatus: { overall: "critical" },
    stats: { totalPosts: 42, publishedPosts: 38, failedPosts: 12 },
    seoConfig: { canonicalDomain: "finance-kr.blogspot.com" },
    lastActivityAt: new Date(Date.now() - 86400000),
  },
];

const statusConfig: Record<string, { label: string; variant: "active" | "paused" | "error" }> = {
  active: { label: "활성", variant: "active" },
  paused: { label: "일시정지", variant: "paused" },
  archived: { label: "보관됨", variant: "error" },
};

const phaseConfig: Record<string, { label: string; variant: "authority" | "ongoing" | "paused" }> = {
  authority: { label: "Phase 1", variant: "authority" },
  ongoing: { label: "Phase 2", variant: "ongoing" },
  paused: { label: "정지됨", variant: "paused" },
};

const healthDot: Record<string, string> = {
  healthy: "bg-green-400",
  warning: "bg-amber-400 animate-pulse",
  critical: "bg-red-400 animate-pulse",
};

const hostingLabel: Record<string, string> = {
  nextjs: "Next.js",
  tistory: "Tistory",
  blogger: "Blogger",
};

export default function SitesPage() {
  return (
    <AppShell title="사이트 목록" description="관리 중인 자식 사이트 전체 목록">
      <div className="space-y-4">
        {/* Header actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Filter className="h-3.5 w-3.5" />
              필터
            </Button>
            <span className="text-sm text-muted-foreground">
              총 {MOCK_SITES.length}개 사이트
            </span>
          </div>
          <Button asChild size="sm">
            <Link href="/sites/new">
              <Plus className="h-4 w-4" />
              새 사이트
            </Link>
          </Button>
        </div>

        {/* Sites Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">사이트</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">호스팅</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">단계</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">상태</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">총 글</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">발행</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">실패</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">마지막 활동</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {MOCK_SITES.map((site) => (
                    <tr key={site.siteId} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/sites/${site.siteId}`} className="flex items-center gap-2.5 group">
                          <div className={`h-2 w-2 rounded-full shrink-0 ${healthDot[site.healthStatus.overall]}`} />
                          <div>
                            <p className="text-sm font-medium group-hover:text-primary transition-colors">
                              {site.displayName}
                            </p>
                            <p className="text-xs text-muted-foreground">{site.seoConfig.canonicalDomain}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">{hostingLabel[site.hostingType]}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={phaseConfig[site.currentPhase].variant} className="text-[10px]">
                          {phaseConfig[site.currentPhase].label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusConfig[site.status].variant} className="text-[10px]">
                          {statusConfig[site.status].label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-medium tabular-nums">{site.stats.totalPosts}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm text-green-600 font-medium tabular-nums">{site.stats.publishedPosts}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-sm font-medium tabular-nums ${site.stats.failedPosts > 0 ? "text-red-500" : "text-muted-foreground"}`}>
                          {site.stats.failedPosts}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">
                          {new Intl.RelativeTimeFormat("ko").format(
                            Math.round((site.lastActivityAt.getTime() - Date.now()) / 3600000),
                            "hour"
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Empty state */}
        {MOCK_SITES.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Globe className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-base font-medium mb-1">사이트가 없습니다</h3>
            <p className="text-sm text-muted-foreground mb-4">
              첫 번째 자식 사이트를 만들어 보세요
            </p>
            <Button asChild>
              <Link href="/sites/new">
                <Plus className="h-4 w-4 mr-1.5" />
                새 사이트 만들기
              </Link>
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
