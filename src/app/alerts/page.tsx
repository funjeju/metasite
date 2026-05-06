import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, AlertCircle, Info, CheckCircle, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

const MOCK_ALERTS = [
  {
    alertId: "a1",
    severity: "critical",
    category: "publish_failure",
    title: "Tistory 연속 5회 발행 실패",
    message: "ai-news-en 사이트에서 Tistory API가 rate limit으로 5건이 실패했습니다. 큐에 14건이 대기 중입니다.",
    siteId: "ai-news-en",
    status: "open",
    createdAt: new Date(Date.now() - 1800000),
  },
  {
    alertId: "a2",
    severity: "high",
    category: "budget",
    title: "일일 AI 예산 95% 도달",
    message: "오늘 AI 사용량이 $47.5에 달했습니다. 일일 한도 $50까지 $2.5 남았습니다.",
    status: "open",
    createdAt: new Date(Date.now() - 3600000),
  },
  {
    alertId: "a3",
    severity: "medium",
    category: "source_dead",
    title: "RSS 피드 응답 없음",
    message: "travel-kr 사이트의 travel-blog.com RSS가 3시간째 응답하지 않습니다.",
    siteId: "travel-kr",
    status: "acknowledged",
    createdAt: new Date(Date.now() - 10800000),
  },
  {
    alertId: "a4",
    severity: "medium",
    category: "fake_citation",
    title: "인용 검증 실패",
    message: "finance-kr의 글 'ETF 투자 전략'에서 출처 확인 불가 인용이 2개 발견됐습니다. 검토가 필요합니다.",
    siteId: "finance-kr",
    status: "open",
    createdAt: new Date(Date.now() - 7200000),
  },
  {
    alertId: "a5",
    severity: "low",
    category: "health",
    title: "사이트 헬스 체크 완료",
    message: "10개 사이트 모두 정상 확인됨.",
    status: "resolved",
    createdAt: new Date(Date.now() - 86400000),
  },
];

const severityConfig = {
  low: { icon: Info, color: "text-blue-500", bg: "bg-blue-50 border-blue-200", badge: "info" as const },
  medium: { icon: AlertCircle, color: "text-amber-500", bg: "bg-amber-50 border-amber-200", badge: "warning" as const },
  high: { icon: AlertTriangle, color: "text-orange-500", bg: "bg-orange-50 border-orange-200", badge: "warning" as const },
  critical: { icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50 border-red-200", badge: "error" as const },
};

const severityLabel = { low: "낮음", medium: "보통", high: "높음", critical: "긴급" };
const categoryLabel: Record<string, string> = {
  health: "헬스체크",
  publish_failure: "발행 실패",
  review_request: "검토 요청",
  budget: "예산 경고",
  security: "보안",
  source_dead: "출처 오류",
  fake_citation: "인용 오류",
};

const statusBadge = {
  open: { label: "미처리", variant: "error" as const },
  acknowledged: { label: "확인됨", variant: "warning" as const },
  resolved: { label: "해결됨", variant: "success" as const },
  archived: { label: "보관됨", variant: "secondary" as const },
};

export default function AlertsPage() {
  const open = MOCK_ALERTS.filter((a) => a.status === "open" || a.status === "acknowledged");
  const resolved = MOCK_ALERTS.filter((a) => a.status === "resolved" || a.status === "archived");

  return (
    <AppShell title="알림" description="시스템 상태 알림 및 오류 내역">
      <div className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "미처리", count: MOCK_ALERTS.filter((a) => a.status === "open").length, color: "text-red-500", bg: "bg-red-50" },
            { label: "긴급", count: MOCK_ALERTS.filter((a) => a.severity === "critical").length, color: "text-orange-500", bg: "bg-orange-50" },
            { label: "확인됨", count: MOCK_ALERTS.filter((a) => a.status === "acknowledged").length, color: "text-amber-500", bg: "bg-amber-50" },
            { label: "해결됨", count: MOCK_ALERTS.filter((a) => a.status === "resolved").length, color: "text-green-500", bg: "bg-green-50" },
          ].map((s) => (
            <Card key={s.label} className={cn("", s.bg + "/40")}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={cn("text-2xl font-bold mt-1", s.color)}>{s.count}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Open alerts */}
        <div>
          <h2 className="text-sm font-semibold mb-2">처리 필요 ({open.length})</h2>
          <div className="space-y-2">
            {open.map((alert) => {
              const cfg = severityConfig[alert.severity as keyof typeof severityConfig];
              const Icon = cfg.icon;
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
                          {severityLabel[alert.severity as keyof typeof severityLabel]}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {categoryLabel[alert.category] || alert.category}
                        </Badge>
                        <Badge variant={statusBadge[alert.status as keyof typeof statusBadge].variant} className="text-[10px]">
                          {statusBadge[alert.status as keyof typeof statusBadge].label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                      <div className="flex items-center gap-3 mt-2">
                        {alert.siteId && (
                          <span className="text-xs text-muted-foreground">사이트: {alert.siteId}</span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Intl.RelativeTimeFormat("ko").format(
                            Math.round((alert.createdAt.getTime() - Date.now()) / 60000),
                            "minute"
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {alert.status === "open" && (
                        <Button variant="outline" size="sm" className="h-7 text-xs">
                          <Check className="h-3 w-3 mr-1" />
                          확인
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="h-7 text-xs">
                        <X className="h-3 w-3 mr-1" />
                        닫기
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Resolved */}
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
      </div>
    </AppShell>
  );
}
