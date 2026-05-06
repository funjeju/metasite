"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, AlertCircle, Info, CheckCircle, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AlertItem {
  alertId: string;
  severity: string;
  category: string;
  title: string;
  message: string;
  siteId?: string;
  status: string;
  createdAt?: string;
}

const severityConfig: Record<string, { icon: React.ElementType; color: string; bg: string; badge: "info" | "warning" | "error" }> = {
  low: { icon: Info, color: "text-blue-500", bg: "bg-blue-50 border-blue-200", badge: "info" },
  medium: { icon: AlertCircle, color: "text-amber-500", bg: "bg-amber-50 border-amber-200", badge: "warning" },
  high: { icon: AlertTriangle, color: "text-orange-500", bg: "bg-orange-50 border-orange-200", badge: "warning" },
  critical: { icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50 border-red-200", badge: "error" },
};

const severityLabel: Record<string, string> = { low: "낮음", medium: "보통", high: "높음", critical: "긴급" };
const categoryLabel: Record<string, string> = {
  health: "헬스체크", publish_failure: "발행 실패", review_request: "검토 요청",
  budget: "예산 경고", security: "보안", source_dead: "출처 오류", fake_citation: "인용 오류",
};
const statusBadge: Record<string, { label: string; variant: "error" | "warning" | "success" | "secondary" }> = {
  open: { label: "미처리", variant: "error" },
  acknowledged: { label: "확인됨", variant: "warning" },
  resolved: { label: "해결됨", variant: "success" },
  archived: { label: "보관됨", variant: "secondary" },
};

function fmtRelative(iso?: string) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}시간 전`;
  return `${Math.round(hrs / 24)}일 전`;
}

export function AlertList() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(() => {
    fetch("/api/alerts?limit=50")
      .then((r) => r.json())
      .then((d) => setAlerts(d.alerts ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const updateStatus = async (alertId: string, status: string) => {
    await fetch("/api/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alertId, status }),
    });
    setAlerts((prev) => prev.map((a) => a.alertId === alertId ? { ...a, status } : a));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const open = alerts.filter((a) => a.status === "open" || a.status === "acknowledged");
  const resolved = alerts.filter((a) => a.status === "resolved" || a.status === "archived");

  return (
    <div className="space-y-4">
      {/* 통계 */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "미처리", count: alerts.filter((a) => a.status === "open").length, color: "text-red-500", bg: "bg-red-50" },
          { label: "긴급", count: alerts.filter((a) => a.severity === "critical").length, color: "text-orange-500", bg: "bg-orange-50" },
          { label: "확인됨", count: alerts.filter((a) => a.status === "acknowledged").length, color: "text-amber-500", bg: "bg-amber-50" },
          { label: "해결됨", count: alerts.filter((a) => a.status === "resolved").length, color: "text-green-500", bg: "bg-green-50" },
        ].map((s) => (
          <Card key={s.label} className={cn("", s.bg + "/40")}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={cn("text-2xl font-bold mt-1", s.color)}>{s.count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <CheckCircle className="h-12 w-12 text-green-400/50 mb-4" />
          <h3 className="text-base font-medium mb-1">알림이 없습니다</h3>
          <p className="text-sm text-muted-foreground">모든 시스템이 정상입니다</p>
        </div>
      ) : (
        <>
          {open.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold mb-2">처리 필요 ({open.length})</h2>
              <div className="space-y-2">
                {open.map((alert) => {
                  const cfg = severityConfig[alert.severity] ?? severityConfig.low;
                  const Icon = cfg.icon;
                  const sBadge = statusBadge[alert.status] ?? statusBadge.open;
                  return (
                    <div key={alert.alertId} className={cn("rounded-xl border p-4", cfg.bg)}>
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white">
                          <Icon className={cn("h-4 w-4", cfg.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold">{alert.title}</p>
                            <Badge variant={cfg.badge} className="text-[10px]">
                              {severityLabel[alert.severity] ?? alert.severity}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                              {categoryLabel[alert.category] ?? alert.category}
                            </Badge>
                            <Badge variant={sBadge.variant} className="text-[10px]">{sBadge.label}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                          <div className="flex items-center gap-3 mt-2">
                            {alert.siteId && <span className="text-xs text-muted-foreground">사이트: {alert.siteId}</span>}
                            <span className="text-xs text-muted-foreground">{fmtRelative(alert.createdAt)}</span>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {alert.status === "open" && (
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => updateStatus(alert.alertId, "acknowledged")}>
                              <Check className="h-3 w-3 mr-1" />확인
                            </Button>
                          )}
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => updateStatus(alert.alertId, "resolved")}>
                            <X className="h-3 w-3 mr-1" />닫기
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {resolved.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold mb-2 text-muted-foreground">해결됨 ({resolved.length})</h2>
              <Card>
                <CardContent className="p-0 divide-y">
                  {resolved.map((alert) => (
                    <div key={alert.alertId} className="flex items-center gap-3 px-4 py-3 opacity-60">
                      <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{alert.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{alert.message}</p>
                      </div>
                      <Badge variant="success" className="text-[10px] shrink-0">해결됨</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
