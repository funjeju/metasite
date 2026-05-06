"use client";

import Link from "next/link";
import { Globe, AlertCircle, CheckCircle, PauseCircle, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface SiteListItem {
  siteId: string;
  displayName: string;
  status: "active" | "paused" | "archived";
  currentPhase: "authority" | "ongoing" | "paused";
  healthOverall: "healthy" | "warning" | "critical";
  canonicalDomain: string;
  publishedPosts: number;
}

interface SiteListCardProps {
  sites: SiteListItem[];
  loading?: boolean;
}

const statusConfig = {
  active: { label: "활성", variant: "active" as const, icon: CheckCircle, color: "text-green-500" },
  paused: { label: "일시정지", variant: "paused" as const, icon: PauseCircle, color: "text-amber-500" },
  archived: { label: "보관됨", variant: "error" as const, icon: AlertCircle, color: "text-gray-400" },
};

const phaseConfig = {
  authority: { label: "Phase 1", variant: "authority" as const },
  ongoing: { label: "Phase 2", variant: "ongoing" as const },
  paused: { label: "정지됨", variant: "paused" as const },
};

const healthDot = {
  healthy: "bg-green-400",
  warning: "bg-amber-400 animate-pulse",
  critical: "bg-red-400 animate-pulse",
};

export function SiteListCard({ sites, loading }: SiteListCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">사이트 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="shimmer h-14 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">사이트 현황</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/sites" className="text-xs text-muted-foreground">
            전체 보기 →
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {sites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Globe className="h-8 w-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">등록된 사이트가 없습니다</p>
            <Button asChild size="sm" className="mt-3">
              <Link href="/sites/new">새 사이트 추가</Link>
            </Button>
          </div>
        ) : (
          <div className="divide-y">
            {sites.map((site) => {
              const status = statusConfig[site.status];
              const phase = phaseConfig[site.currentPhase];
              const healthClass = healthDot[site.healthOverall];

              return (
                <Link
                  key={site.siteId}
                  href={`/sites/${site.siteId}`}
                  className="flex items-center gap-3 px-6 py-3 hover:bg-muted/50 transition-colors group"
                >
                  <div className={`h-2 w-2 rounded-full shrink-0 ${healthClass}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                        {site.displayName}
                      </p>
                      <Badge variant={phase.variant} className="text-[10px] py-0 px-1.5 h-4 shrink-0">
                        {phase.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-muted-foreground truncate">{site.canonicalDomain}</p>
                      <span className="text-muted-foreground/40">·</span>
                      <p className="text-xs text-muted-foreground shrink-0">글 {site.publishedPosts}개</p>
                    </div>
                  </div>
                  <Badge variant={status.variant} className="text-[10px] shrink-0">{status.label}</Badge>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 group-hover:text-muted-foreground transition-colors" />
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
