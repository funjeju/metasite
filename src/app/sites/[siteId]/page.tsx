import Link from "next/link";
import {
  ArrowLeft,
  Globe,
  Settings,
  FileText,
  BarChart3,
  Rss,
  ExternalLink,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface SiteDetailPageProps {
  params: Promise<{ siteId: string }>;
}

const MOCK_SITE = {
  siteId: "travel-kr",
  displayName: "Travel KR",
  topic: "여행",
  language: "ko",
  hostingType: "nextjs",
  currentPhase: "authority",
  status: "active",
  healthStatus: {
    overall: "healthy",
    issues: [],
  },
  stats: {
    totalPosts: 28,
    publishedPosts: 24,
    draftPosts: 3,
    failedPosts: 1,
    weeklyTrafficEstimate: 3240,
  },
  seoConfig: {
    canonicalDomain: "travel-kr.com",
    searchConsoleVerified: true,
    siteKeywords: ["여행", "해외여행", "국내여행", "여행정보"],
    siteDescription: "국내외 여행 정보를 AI가 자동으로 큐레이션하는 여행 블로그",
  },
  monetization: {
    enabled: true,
    adsenseId: "pub-XXXXXXXX",
  },
  sections: [
    { sectionId: "s1", name: "국내 여행", enabled: true, publishFrequency: "weekly" },
    { sectionId: "s2", name: "해외 여행", enabled: true, publishFrequency: "thrice_weekly" },
    { sectionId: "s3", name: "여행 팁", enabled: false, publishFrequency: "weekly" },
  ],
};

const NAV_TABS = [
  { label: "개요", href: "", icon: Globe },
  { label: "발행 큐", href: "/queue", icon: FileText },
  { label: "아웃라인", href: "/outline", icon: BarChart3 },
  { label: "소스", href: "/sources", icon: Rss },
  { label: "SEO", href: "/seo", icon: BarChart3 },
  { label: "설정", href: "/settings", icon: Settings },
];

export default async function SiteDetailPage({ params }: SiteDetailPageProps) {
  const { siteId } = await params;
  const site = MOCK_SITE;

  const phaseLabel = site.currentPhase === "authority" ? "Phase 1: 권위 구축" : "Phase 2: 지속 발행";
  const healthColor =
    site.healthStatus.overall === "healthy"
      ? "text-green-500"
      : site.healthStatus.overall === "warning"
      ? "text-amber-500"
      : "text-red-500";

  return (
    <AppShell
      title={site.displayName}
      description={site.seoConfig.canonicalDomain}
    >
      <div className="space-y-6">
        {/* Back + Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" className="h-8 w-8 -mt-0.5" asChild>
              <Link href="/sites">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{site.displayName}</h2>
                <Badge variant="active" className="text-xs">활성</Badge>
                <Badge variant="authority" className="text-xs">{phaseLabel}</Badge>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <a
                  href={`https://${site.seoConfig.canonicalDomain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {site.seoConfig.canonicalDomain}
                  <ExternalLink className="h-3 w-3" />
                </a>
                <span className="text-muted-foreground/40">·</span>
                <div className={`flex items-center gap-1 text-sm ${healthColor}`}>
                  {site.healthStatus.overall === "healthy" ? (
                    <CheckCircle className="h-3.5 w-3.5" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5" />
                  )}
                  <span>{site.healthStatus.overall === "healthy" ? "정상" : "경고"}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Settings className="h-3.5 w-3.5 mr-1.5" />
              설정
            </Button>
            <Button size="sm">
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              발행 큐
            </Button>
          </div>
        </div>

        {/* Sub-nav tabs */}
        <div className="flex gap-0 border-b overflow-x-auto">
          {NAV_TABS.map((tab) => (
            <Link
              key={tab.label}
              href={tab.href ? `/sites/${siteId}${tab.href}` : `/sites/${siteId}`}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-muted-foreground border-b-2 border-transparent hover:text-foreground hover:border-border transition-colors whitespace-nowrap first:border-primary first:text-foreground"
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">총 글</p>
              <p className="text-2xl font-bold mt-1">{site.stats.totalPosts}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">발행됨</p>
              <p className="text-2xl font-bold mt-1 text-green-600">{site.stats.publishedPosts}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">임시저장</p>
              <p className="text-2xl font-bold mt-1 text-amber-600">{site.stats.draftPosts}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">실패</p>
              <p className="text-2xl font-bold mt-1 text-red-500">{site.stats.failedPosts}</p>
            </CardContent>
          </Card>
        </div>

        {/* Detail cards */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Sections */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">섹션 (Section)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {site.sections.map((section) => (
                  <div key={section.sectionId} className="flex items-center justify-between px-6 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${section.enabled ? "bg-green-400" : "bg-gray-300"}`} />
                      <span className="text-sm">{section.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {section.publishFrequency === "daily"
                          ? "매일"
                          : section.publishFrequency === "thrice_weekly"
                          ? "주 3회"
                          : "주 1회"}
                      </span>
                      <Badge variant={section.enabled ? "success" : "secondary"} className="text-[10px]">
                        {section.enabled ? "활성" : "비활성"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* SEO & Monetization */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">SEO 설정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">GSC 인증</span>
                <span className={site.seoConfig.searchConsoleVerified ? "text-green-600" : "text-muted-foreground"}>
                  {site.seoConfig.searchConsoleVerified ? "✓ 완료" : "미완료"}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">AdSense</span>
                <span className="text-xs font-mono text-muted-foreground">
                  {site.monetization.adsenseId ?? "-"}
                </span>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">키워드</p>
                <div className="flex flex-wrap gap-1.5">
                  {site.seoConfig.siteKeywords.map((kw) => (
                    <Badge key={kw} variant="secondary" className="text-[10px]">
                      {kw}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
