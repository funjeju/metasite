"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign } from "lucide-react";
import Link from "next/link";

interface Site { id: string; displayName?: string; name?: string; monetization?: { enabled?: boolean; adsenseId?: string; affiliateLinks?: string[] } }

export function MonetizationOverview({ sites }: { sites: Record<string, unknown>[] }) {
  const siteList = sites as unknown as Site[];
  const enabled = siteList.filter((s) => s.monetization?.enabled).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">수익화 활성 사이트</p><p className="text-2xl font-bold mt-1 text-green-600">{enabled}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">총 사이트</p><p className="text-2xl font-bold mt-1">{siteList.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">이번달 예상 수익</p><p className="text-2xl font-bold mt-1">$0</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">사이트별 수익화 현황</CardTitle></CardHeader>
        <CardContent className="p-0">
          {siteList.length === 0 ? (
            <div className="flex flex-col items-center py-12"><DollarSign className="h-8 w-8 text-muted-foreground mb-3" /><p className="text-sm text-muted-foreground">운영 중인 사이트가 없습니다</p></div>
          ) : (
            <div className="divide-y">
              {siteList.map((site) => (
                <div key={site.id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{site.displayName ?? site.name ?? site.id}</p>
                    {site.monetization?.adsenseId && (
                      <p className="text-xs text-muted-foreground">AdSense: {site.monetization.adsenseId}</p>
                    )}
                    {site.monetization?.affiliateLinks && site.monetization.affiliateLinks.length > 0 && (
                      <Badge variant="secondary" className="text-[10px] mt-1">제휴링크 {site.monetization.affiliateLinks.length}개</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={site.monetization?.enabled ? "default" : "secondary"} className="text-[10px]">
                      {site.monetization?.enabled ? "활성" : "비활성"}
                    </Badge>
                    <Link href={`/sites/${site.id}/settings`} className="text-xs text-muted-foreground hover:text-foreground">설정 →</Link>
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
