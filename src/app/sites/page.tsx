import Link from "next/link";
import { Plus, Globe } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { serialize } from "@/lib/serialize";
import { SitesFilter } from "@/components/sites/SitesFilter";
import { Suspense } from "react";

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

function fmtRelative(isoStr: string) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}시간 전`;
  return `${Math.round(hrs / 24)}일 전`;
}

export default async function SitesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; phase?: string; health?: string }>;
}) {
  await requireAuth();
  const { status: filterStatus, phase: filterPhase, health: filterHealth } = await searchParams;

  const snapshot = await adminDb.collection("child_sites").orderBy("createdAt", "desc").get();
  let sites = snapshot.docs
    .map((d) => serialize(d.data()))
    .filter((s) => s.status !== "archived");

  if (filterStatus) sites = sites.filter((s) => (s.status as string) === filterStatus);
  if (filterPhase) sites = sites.filter((s) => (s.currentPhase as string) === filterPhase);
  if (filterHealth) sites = sites.filter((s) => ((s.healthStatus as { overall?: string })?.overall ?? "healthy") === filterHealth);

  return (
    <AppShell title="사이트 목록" description="관리 중인 자식 사이트 전체 목록">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Suspense>
              <SitesFilter />
            </Suspense>
            <span className="text-sm text-muted-foreground">총 {sites.length}개 사이트</span>
          </div>
          <Button asChild size="sm">
            <Link href="/sites/new">
              <Plus className="h-4 w-4" />
              새 사이트
            </Link>
          </Button>
        </div>

        {sites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Globe className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-base font-medium mb-1">
              {filterStatus || filterPhase || filterHealth ? "필터 조건에 맞는 사이트가 없습니다" : "사이트가 없습니다"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {filterStatus || filterPhase || filterHealth ? "필터를 변경하거나 초기화해보세요." : "첫 번째 자식 사이트를 만들어 보세요"}
            </p>
            {!filterStatus && !filterPhase && !filterHealth && (
              <Button asChild>
                <Link href="/sites/new">
                  <Plus className="h-4 w-4 mr-1.5" />
                  새 사이트 만들기
                </Link>
              </Button>
            )}
          </div>
        ) : (
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
                    {sites.map((site) => {
                      const status = (site.status as string) ?? "active";
                      const phase = (site.currentPhase as string) ?? "authority";
                      const health = ((site.healthStatus as { overall?: string })?.overall) ?? "healthy";
                      const cfg = statusConfig[status] ?? statusConfig.active;
                      const phaseCfg = phaseConfig[phase] ?? phaseConfig.authority;
                      const stats = (site.stats as { totalPosts?: number; publishedPosts?: number; failedPosts?: number }) ?? {};
                      const domain = (site.seoConfig as { canonicalDomain?: string })?.canonicalDomain ?? "";
                      return (
                        <tr key={site.siteId as string} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            <Link href={`/sites/${site.siteId}`} className="flex items-center gap-2.5 group">
                              <div className={`h-2 w-2 rounded-full shrink-0 ${healthDot[health] ?? "bg-gray-300"}`} />
                              <div>
                                <p className="text-sm font-medium group-hover:text-primary transition-colors">
                                  {(site.displayName ?? site.name) as string}
                                </p>
                                <p className="text-xs text-muted-foreground">{domain}</p>
                              </div>
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-muted-foreground">
                              {hostingLabel[site.hostingType as string] ?? site.hostingType as string}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={phaseCfg.variant} className="text-[10px]">{phaseCfg.label}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={cfg.variant} className="text-[10px]">{cfg.label}</Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-sm font-medium tabular-nums">{stats.totalPosts ?? 0}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-sm text-green-600 font-medium tabular-nums">{stats.publishedPosts ?? 0}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`text-sm font-medium tabular-nums ${(stats.failedPosts ?? 0) > 0 ? "text-red-500" : "text-muted-foreground"}`}>
                              {stats.failedPosts ?? 0}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-muted-foreground">
                              {site.lastActivityAt ? fmtRelative(site.lastActivityAt as string) : "-"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
