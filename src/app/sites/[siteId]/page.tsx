import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft, Globe, Settings, FileText, BarChart3,
  Rss, ExternalLink, CheckCircle, AlertCircle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { requireAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { serialize } from "@/lib/serialize";
import { SiteDetailTabs } from "@/components/sites/SiteDetailTabs";

interface Props {
  params: Promise<{ siteId: string }>;
}

const NAV_TABS = [
  { label: "개요", href: "", icon: Globe },
  { label: "발행 큐", href: "/queue", icon: FileText },
  { label: "글 목록", href: "/posts", icon: FileText },
  { label: "아웃라인", href: "/outline", icon: BarChart3 },
  { label: "소스", href: "/sources", icon: Rss },
  { label: "분석", href: "/analytics", icon: BarChart3 },
  { label: "SEO", href: "/seo", icon: BarChart3 },
  { label: "설정", href: "/settings", icon: Settings },
];

export default async function SiteDetailPage({ params }: Props) {
  await requireAuth();
  const { siteId } = await params;

  const doc = await adminDb.collection("child_sites").doc(siteId).get();
  if (!doc.exists) notFound();

  const site = serialize(doc.data()!);

  const phase = (site.currentPhase as string) ?? "authority";
  const phaseLabel = phase === "authority" ? "Phase 1: 권위 구축" : "Phase 2: 지속 발행";
  const health = ((site.healthStatus as { overall?: string })?.overall) ?? "healthy";
  const healthColor = health === "healthy" ? "text-green-500" : health === "warning" ? "text-amber-500" : "text-red-500";
  const stats = (site.stats as { totalPosts?: number; publishedPosts?: number; draftPosts?: number; failedPosts?: number; weeklyTrafficEstimate?: number }) ?? {};
  const seoConfig = (site.seoConfig as { canonicalDomain?: string; searchConsoleVerified?: boolean; siteKeywords?: string[] }) ?? {};
  const monetization = (site.monetization as { enabled?: boolean; adsenseId?: string }) ?? {};
  const sections = (site.sections as { sectionId: string; name: string; enabled: boolean; publishFrequency: string }[]) ?? [];

  return (
    <AppShell title={site.displayName as string} description={seoConfig.canonicalDomain}>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" className="h-8 w-8 -mt-0.5" asChild>
              <Link href="/sites"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{site.displayName as string}</h2>
                <Badge variant="active" className="text-xs">활성</Badge>
                <Badge variant="authority" className="text-xs">{phaseLabel}</Badge>
              </div>
              <div className="flex items-center gap-2 mt-1">
                {seoConfig.canonicalDomain && (
                  <a
                    href={`https://${seoConfig.canonicalDomain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {seoConfig.canonicalDomain}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                <span className="text-muted-foreground/40">·</span>
                <div className={`flex items-center gap-1 text-sm ${healthColor}`}>
                  {health === "healthy" ? <CheckCircle className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                  <span>{health === "healthy" ? "정상" : health === "warning" ? "경고" : "오류"}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/sites/${siteId}/settings`}><Settings className="h-3.5 w-3.5 mr-1.5" />설정</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href={`/sites/${siteId}/queue`}><FileText className="h-3.5 w-3.5 mr-1.5" />발행 큐</Link>
            </Button>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <SiteDetailTabs siteId={siteId} tabs={NAV_TABS} />

        {/* 통계 */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: "총 글", value: stats.totalPosts ?? 0, color: "" },
            { label: "발행됨", value: stats.publishedPosts ?? 0, color: "text-green-600" },
            { label: "임시저장", value: stats.draftPosts ?? 0, color: "text-amber-600" },
            { label: "실패", value: stats.failedPosts ?? 0, color: "text-red-500" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* 섹션 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">섹션</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {sections.length === 0 ? (
                <p className="px-6 py-4 text-sm text-muted-foreground">등록된 섹션이 없습니다</p>
              ) : (
                <div className="divide-y">
                  {sections.map((sec) => (
                    <div key={sec.sectionId} className="flex items-center justify-between px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${sec.enabled ? "bg-green-400" : "bg-gray-300"}`} />
                        <span className="text-sm">{sec.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {sec.publishFrequency === "daily" ? "매일" : sec.publishFrequency === "thrice_weekly" ? "주 3회" : "주 1회"}
                        </span>
                        <Badge variant={sec.enabled ? "success" : "secondary"} className="text-[10px]">
                          {sec.enabled ? "활성" : "비활성"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* SEO */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">SEO 설정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">GSC 인증</span>
                <span className={seoConfig.searchConsoleVerified ? "text-green-600" : "text-muted-foreground"}>
                  {seoConfig.searchConsoleVerified ? "✓ 완료" : "미완료"}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">AdSense</span>
                <span className="text-xs font-mono text-muted-foreground">{monetization.adsenseId ?? "-"}</span>
              </div>
              {(seoConfig.siteKeywords?.length ?? 0) > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">키워드</p>
                    <div className="flex flex-wrap gap-1.5">
                      {seoConfig.siteKeywords!.map((kw) => (
                        <Badge key={kw} variant="secondary" className="text-[10px]">{kw}</Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
