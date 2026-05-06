"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, BarChart3, MousePointer, Eye } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface Site { id: string; displayName?: string; name?: string; stats?: { publishedPosts?: number; weeklyTrafficEstimate?: number }; seoConfig?: { canonicalDomain?: string } }
interface Snapshot { date: string; siteId: string; clicks?: number; impressions?: number; sessions?: number; ctr?: number; source?: string }
interface Report { id: string; siteId: string; totalClicks?: number; totalSessions?: number; avgCtr?: number; insight?: string; period?: string }

export function AnalyticsOverview({
  sites,
  snapshots = [],
  reports = [],
}: {
  sites: Record<string, unknown>[];
  snapshots?: Record<string, unknown>[];
  reports?: Record<string, unknown>[];
}) {
  const siteList = sites as unknown as Site[];
  const snapList = snapshots as unknown as Snapshot[];
  const reportList = reports as unknown as Report[];

  const totalPosts = siteList.reduce((sum, s) => sum + (s.stats?.publishedPosts ?? 0), 0);

  const totalClicks = snapList.reduce((s, r) => s + (r.clicks ?? 0), 0);
  const totalImpressions = snapList.reduce((s, r) => s + (r.impressions ?? 0), 0);

  // Aggregate daily clicks across all sites
  const dailyMap = snapList.reduce<Record<string, number>>((acc, s) => {
    acc[s.date] = (acc[s.date] ?? 0) + (s.clicks ?? 0);
    return acc;
  }, {});
  const chartData = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([date, clicks]) => ({ date: date.slice(5), clicks }));

  const latestReport = reportList[0];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">운영 사이트</p><p className="text-2xl font-bold mt-1">{siteList.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">총 발행 글</p><p className="text-2xl font-bold mt-1">{totalPosts}</p></CardContent></Card>
        <Card><CardContent className="p-4 flex items-start gap-2"><MousePointer className="h-4 w-4 text-muted-foreground mt-3.5 shrink-0" /><div><p className="text-xs text-muted-foreground">30일 클릭</p><p className="text-2xl font-bold mt-1">{totalClicks > 0 ? totalClicks.toLocaleString() : "—"}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-start gap-2"><Eye className="h-4 w-4 text-muted-foreground mt-3.5 shrink-0" /><div><p className="text-xs text-muted-foreground">30일 노출</p><p className="text-2xl font-bold mt-1">{totalImpressions > 0 ? (totalImpressions / 1000).toFixed(1) + "K" : "—"}</p></div></CardContent></Card>
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">일별 클릭 추이 (최근 14일)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={35} />
                <Tooltip />
                <Line type="monotone" dataKey="clicks" stroke="#6366f1" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {latestReport?.insight && (
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4" />AI 주간 인사이트</CardTitle></CardHeader>
          <CardContent>
            <pre className="text-sm whitespace-pre-wrap text-foreground/80">{latestReport.insight}</pre>
            {latestReport.period && <p className="text-xs text-muted-foreground mt-2">기간: {latestReport.period}</p>}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-sm">사이트별 현황</CardTitle></CardHeader>
        <CardContent className="p-0">
          {siteList.length === 0 ? (
            <div className="flex flex-col items-center py-12"><BarChart3 className="h-8 w-8 text-muted-foreground mb-3" /><p className="text-sm text-muted-foreground">운영 중인 사이트가 없습니다</p></div>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="border-b text-muted-foreground text-xs">
                <th className="text-left px-4 py-3 font-medium">사이트</th>
                <th className="text-right px-4 py-3 font-medium">발행 글</th>
                <th className="text-right px-4 py-3 font-medium">주간 트래픽</th>
                <th className="text-left px-4 py-3 font-medium">도메인</th>
              </tr></thead>
              <tbody className="divide-y">
                {siteList.map((site) => (
                  <tr key={site.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{site.displayName ?? site.name ?? site.id}</td>
                    <td className="px-4 py-3 text-right">{site.stats?.publishedPosts ?? 0}</td>
                    <td className="px-4 py-3 text-right">
                      {site.stats?.weeklyTrafficEstimate ? `${(site.stats.weeklyTrafficEstimate / 1000).toFixed(1)}K` : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{site.seoConfig?.canonicalDomain ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {totalClicks === 0 && (
        <Card>
          <CardContent className="p-4 text-center text-sm text-muted-foreground">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            Google Search Console 연동 후 실제 클릭수·노출수 데이터가 표시됩니다
          </CardContent>
        </Card>
      )}
    </div>
  );
}
