"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, MousePointer, Eye, Activity, Loader2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

interface Snapshot { date: string; clicks?: number; impressions?: number; sessions?: number; ctr?: number; source?: string }
interface Report { id: string; totalClicks?: number; totalSessions?: number; avgCtr?: number; insight?: string; period?: string }

export function SiteAnalytics({
  siteId,
  snapshots = [],
  reports = [],
}: {
  siteId: string;
  snapshots?: Record<string, unknown>[];
  reports?: Record<string, unknown>[];
}) {
  const snapList = snapshots as unknown as Snapshot[];
  const reportList = reports as unknown as Report[];
  const [generating, setGenerating] = useState(false);
  const [localReports, setLocalReports] = useState(reportList);

  const totalClicks = snapList.reduce((s, r) => s + (r.clicks ?? 0), 0);
  const totalImpressions = snapList.reduce((s, r) => s + (r.impressions ?? 0), 0);
  const totalSessions = snapList.reduce((s, r) => s + (r.sessions ?? 0), 0);
  const avgCtr = snapList.length ? snapList.reduce((s, r) => s + (r.ctr ?? 0), 0) / snapList.length : 0;

  const chartData = snapList.map((s) => ({
    date: s.date.slice(5),
    clicks: s.clicks ?? 0,
    sessions: s.sessions ?? 0,
    impressions: s.impressions ?? 0,
  }));

  const generateReport = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/analytics/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId }),
      });
      const data = await res.json() as { insight?: string };
      if (data.insight) {
        setLocalReports((prev) => [{ id: "new", insight: data.insight, period: new Date().toISOString().slice(0, 10) }, ...prev]);
      }
    } finally {
      setGenerating(false);
    }
  };

  const hasData = snapList.length > 0 && totalClicks > 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-start gap-2"><MousePointer className="h-4 w-4 text-muted-foreground mt-3 shrink-0" /><div><p className="text-xs text-muted-foreground">30일 클릭</p><p className="text-2xl font-bold mt-1">{totalClicks > 0 ? totalClicks.toLocaleString() : "—"}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-start gap-2"><Eye className="h-4 w-4 text-muted-foreground mt-3 shrink-0" /><div><p className="text-xs text-muted-foreground">30일 노출</p><p className="text-2xl font-bold mt-1">{totalImpressions > 0 ? (totalImpressions / 1000).toFixed(1) + "K" : "—"}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-start gap-2"><Activity className="h-4 w-4 text-muted-foreground mt-3 shrink-0" /><div><p className="text-xs text-muted-foreground">30일 세션</p><p className="text-2xl font-bold mt-1">{totalSessions > 0 ? totalSessions.toLocaleString() : "—"}</p></div></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">평균 CTR</p><p className="text-2xl font-bold mt-1">{avgCtr > 0 ? `${avgCtr.toFixed(2)}%` : "—"}</p></CardContent></Card>
      </div>

      {hasData ? (
        <>
          <Card>
            <CardHeader><CardTitle className="text-sm">일별 클릭 추이</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} width={35} />
                  <Tooltip />
                  <Line type="monotone" dataKey="clicks" stroke="#6366f1" strokeWidth={2} dot={false} name="클릭" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {totalSessions > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">세션 추이</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={chartData}>
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} width={30} />
                    <Tooltip />
                    <Bar dataKey="sessions" fill="#a78bfa" name="세션" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p>Google Search Console / GA4 연동 후 실제 데이터가 표시됩니다.</p>
            <p className="text-xs mt-1">사이트 설정에서 통합 토큰을 설정하거나, 수동으로 스냅샷을 가져오세요.</p>
          </CardContent>
        </Card>
      )}

      {/* AI 인사이트 리포트 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />AI 주간 인사이트
          </CardTitle>
          <Button size="sm" variant="outline" onClick={generateReport} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
            {generating ? "생성 중..." : "리포트 생성"}
          </Button>
        </CardHeader>
        <CardContent>
          {localReports.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">아직 생성된 인사이트가 없습니다</p>
          ) : (
            <div className="space-y-4">
              {localReports.map((r, i) => (
                <div key={r.id ?? i} className="space-y-1">
                  {r.period && <p className="text-[11px] text-muted-foreground">기간: {r.period}</p>}
                  <pre className="text-sm whitespace-pre-wrap text-foreground/80">{r.insight}</pre>
                  {i < localReports.length - 1 && <div className="border-t mt-3" />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
