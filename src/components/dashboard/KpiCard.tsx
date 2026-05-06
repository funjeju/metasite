import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: LucideIcon;
  color: "purple" | "cyan" | "emerald" | "amber" | "rose";
  suffix?: string;
  loading?: boolean;
}

const COLOR_MAP = {
  purple: {
    bg: "bg-purple-50",
    icon: "bg-purple-100 text-purple-600",
    text: "text-purple-600",
    value: "text-purple-700",
  },
  cyan: {
    bg: "bg-cyan-50",
    icon: "bg-cyan-100 text-cyan-600",
    text: "text-cyan-600",
    value: "text-cyan-700",
  },
  emerald: {
    bg: "bg-emerald-50",
    icon: "bg-emerald-100 text-emerald-600",
    text: "text-emerald-600",
    value: "text-emerald-700",
  },
  amber: {
    bg: "bg-amber-50",
    icon: "bg-amber-100 text-amber-600",
    text: "text-amber-600",
    value: "text-amber-700",
  },
  rose: {
    bg: "bg-rose-50",
    icon: "bg-rose-100 text-rose-600",
    text: "text-rose-600",
    value: "text-rose-700",
  },
};

export function KpiCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  color,
  suffix,
  loading,
}: KpiCardProps) {
  const colors = COLOR_MAP[color];

  if (loading) {
    return (
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="shimmer h-4 w-24 rounded mb-3" />
        <div className="shimmer h-8 w-16 rounded mb-2" />
        <div className="shimmer h-3 w-20 rounded" />
      </div>
    );
  }

  const TrendIcon =
    change === undefined || change === 0
      ? Minus
      : change > 0
      ? TrendingUp
      : TrendingDown;
  const trendColor =
    change === undefined || change === 0
      ? "text-muted-foreground"
      : change > 0
      ? "text-emerald-600"
      : "text-rose-600";

  return (
    <div className={cn("rounded-xl border bg-card p-5 shadow-sm card-hover", colors.bg + "/30")}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", colors.icon)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="flex items-end gap-1 mb-2">
        <span className="kpi-number text-foreground">
          {typeof value === "number" ? value.toLocaleString() : value}
        </span>
        {suffix && <span className="text-sm text-muted-foreground mb-0.5">{suffix}</span>}
      </div>

      {(change !== undefined || changeLabel) && (
        <div className={cn("flex items-center gap-1 text-xs", trendColor)}>
          <TrendIcon className="h-3 w-3" />
          <span>
            {change !== undefined && `${change > 0 ? "+" : ""}${change}%`}
            {changeLabel && ` ${changeLabel}`}
          </span>
        </div>
      )}
    </div>
  );
}
