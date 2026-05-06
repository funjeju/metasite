"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Loader2 } from "lucide-react";

interface SiteCost { siteId: string; siteName: string; inputTokens: number; outputTokens: number; costUsd: number; postCount: number }
interface CostData { sites: SiteCost[]; total: { inputTokens: number; outputTokens: number; costUsd: number; postCount: number } }

export function CostsDashboard() {
  const [data, setData] = useState<CostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  useEffect(() => {
    setLoading(true);
    fetch(`/api/costs?month=${month}`)
      .then((r) => r.json() as Promise<CostData>)
      .then(setData)
      .finally(() => setLoading(false));
  }, [month]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
          className="border rounded-md px-3 py-1.5 text-sm bg-background" />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "총 비용", value: `$${data.total.costUsd.toFixed(4)}` },
              { label: "발행 글", value: `${data.total.postCount}편` },
              { label: "입력 토큰", value: data.total.inputTokens.toLocaleString() },
              { label: "출력 토큰", value: data.total.outputTokens.toLocaleString() },
            ].map((s) => (
              <Card key={s.label}><CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-xl font-bold mt-1">{s.value}</p>
              </CardContent></Card>
            ))}
          </div>

          {data.sites.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">사이트별 비용</CardTitle></CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-muted-foreground text-xs">
                    <th className="text-left px-4 py-3 font-medium">사이트</th>
                    <th className="text-right px-4 py-3 font-medium">글 수</th>
                    <th className="text-right px-4 py-3 font-medium">비용</th>
                    <th className="text-right px-4 py-3 font-medium">입력 토큰</th>
                    <th className="text-right px-4 py-3 font-medium">출력 토큰</th>
                  </tr></thead>
                  <tbody className="divide-y">
                    {data.sites.map((s) => (
                      <tr key={s.siteId} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{s.siteName}</td>
                        <td className="px-4 py-3 text-right">{s.postCount}</td>
                        <td className="px-4 py-3 text-right">${s.costUsd.toFixed(4)}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{s.inputTokens.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{s.outputTokens.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {data.sites.every((s) => s.costUsd === 0) && (
            <Card><CardContent className="flex flex-col items-center py-12 text-center">
              <DollarSign className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">이 기간의 AI 비용 데이터가 없습니다<br />글 발행 후 aiUsage 필드가 기록됩니다</p>
            </CardContent></Card>
          )}
        </>
      ) : null}
    </div>
  );
}
