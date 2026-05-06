"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, BarChart3 } from "lucide-react";
import Link from "next/link";

interface Site { id: string; displayName?: string; name?: string; seoConfig?: { canonicalDomain?: string; searchConsoleVerified?: boolean; siteKeywords?: string[] }; stats?: { publishedPosts?: number } }

export function SeoOverview({ sites }: { sites: Record<string, unknown>[] }) {
  const siteList = sites as unknown as Site[];
  const verified = siteList.filter((s) => s.seoConfig?.searchConsoleVerified).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">운영 사이트</p><p className="text-2xl font-bold mt-1">{siteList.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Search Console 연동</p><p className="text-2xl font-bold mt-1 text-green-600">{verified}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">미연동</p><p className="text-2xl font-bold mt-1 text-amber-600">{siteList.length - verified}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">사이트별 SEO 현황</CardTitle></CardHeader>
        <CardContent className="p-0">
          {siteList.length === 0 ? (
            <div className="flex flex-col items-center py-12"><BarChart3 className="h-8 w-8 text-muted-foreground mb-3" /><p className="text-sm text-muted-foreground">운영 중인 사이트가 없습니다</p></div>
          ) : (
            <div className="divide-y">
              {siteList.map((site) => (
                <div key={site.id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{site.displayName ?? site.name ?? site.id}</p>
                    <p className="text-xs text-muted-foreground">{site.seoConfig?.canonicalDomain ?? "도메인 미설정"}</p>
                    {site.seoConfig?.siteKeywords && site.seoConfig.siteKeywords.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {site.seoConfig.siteKeywords.slice(0, 4).map((k) => (
                          <Badge key={k} variant="secondary" className="text-[10px] px-1 py-0">{k}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {site.seoConfig?.searchConsoleVerified
                      ? <CheckCircle className="h-4 w-4 text-green-500" />
                      : <XCircle className="h-4 w-4 text-muted-foreground" />}
                    <Link href={`/sites/${site.id}/seo`} className="text-xs text-muted-foreground hover:text-foreground">설정 →</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
