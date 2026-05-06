"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Filter, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";

const STATUS_OPTS = [
  { value: "active", label: "활성" },
  { value: "paused", label: "일시정지" },
];
const PHASE_OPTS = [
  { value: "authority", label: "Phase 1" },
  { value: "ongoing", label: "Phase 2" },
];
const HEALTH_OPTS = [
  { value: "healthy", label: "정상" },
  { value: "warning", label: "경고" },
  { value: "critical", label: "오류" },
];

export function SitesFilter() {
  const router = useRouter();
  const sp = useSearchParams();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const status = sp.get("status") ?? "";
  const phase = sp.get("phase") ?? "";
  const health = sp.get("health") ?? "";
  const activeCount = [status, phase, health].filter(Boolean).length;

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(sp.toString());
    if (next.get(key) === value) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    router.replace(`/sites?${next.toString()}`);
  };

  const clearAll = () => router.replace("/sites");

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => setOpen((o) => !o)}
      >
        <Filter className="h-3.5 w-3.5" />
        필터
        {activeCount > 0 && (
          <Badge variant="default" className="h-4 w-4 p-0 text-[10px] flex items-center justify-center rounded-full">
            {activeCount}
          </Badge>
        )}
      </Button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-popover border rounded-lg shadow-lg p-4 w-64 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium">필터 설정</p>
            {activeCount > 0 && (
              <button onClick={clearAll} className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1">
                <X className="h-3 w-3" />초기화
              </button>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">상태</p>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => setParam("status", o.value)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                    status === o.value ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:border-foreground"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">단계</p>
            <div className="flex flex-wrap gap-1.5">
              {PHASE_OPTS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => setParam("phase", o.value)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                    phase === o.value ? "bg-purple-600 text-white border-purple-600" : "border-border text-muted-foreground hover:border-foreground"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">헬스</p>
            <div className="flex flex-wrap gap-1.5">
              {HEALTH_OPTS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => setParam("health", o.value)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                    health === o.value ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:border-foreground"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
