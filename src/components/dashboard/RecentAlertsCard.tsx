import Link from "next/link";
import { AlertTriangle, AlertCircle, Info, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

export interface AlertItem {
  alertId: string;
  severity: "low" | "medium" | "high" | "critical";
  category: string;
  siteId?: string;
  postId?: string;
  title: string;
  message: string;
  status: "open" | "acknowledged" | "resolved" | "archived";
  createdAt: string; // ISO string for serializable
}

interface RecentAlertsCardProps {
  alerts: AlertItem[];
  loading?: boolean;
}

const severityConfig = {
  low: { icon: Info, color: "text-blue-500", bg: "bg-blue-50", badge: "info" as const },
  medium: { icon: AlertCircle, color: "text-amber-500", bg: "bg-amber-50", badge: "warning" as const },
  high: { icon: AlertTriangle, color: "text-orange-500", bg: "bg-orange-50", badge: "warning" as const },
  critical: { icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50", badge: "error" as const },
};

const severityLabel = {
  low: "낮음",
  medium: "보통",
  high: "높음",
  critical: "긴급",
};

export function RecentAlertsCard({ alerts, loading }: RecentAlertsCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">최근 알림</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="shimmer h-12 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">최근 알림</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/alerts" className="text-xs text-muted-foreground">
            전체 보기 →
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle className="h-7 w-7 text-green-500 mb-2" />
            <p className="text-sm text-muted-foreground">이상 없음</p>
          </div>
        ) : (
          <div className="divide-y">
            {alerts.slice(0, 5).map((alert) => {
              const cfg = severityConfig[alert.severity];
              const Icon = cfg.icon;
              return (
                <div
                  key={alert.alertId}
                  className="flex items-start gap-3 px-6 py-3 hover:bg-muted/50 transition-colors"
                >
                  <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full mt-0.5", cfg.bg)}>
                    <Icon className={cn("h-3.5 w-3.5", cfg.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium truncate">{alert.title}</p>
                      <Badge variant={cfg.badge} className="text-[9px] py-0 px-1 h-3.5 shrink-0">
                        {severityLabel[alert.severity]}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                      {alert.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                      {formatRelativeTime(alert.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
