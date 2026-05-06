"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, CheckCircle, XCircle, Play, RefreshCw, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface OutlineItem {
  id: string;
  seq: number;
  title: string;
  slug: string;
  angle: string;
  targetKeyword: string;
  status: "pending" | "approved" | "rejected" | "published";
}

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-slate-100 text-slate-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-600",
  published: "bg-purple-100 text-purple-700",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "검토 대기",
  approved: "승인됨",
  rejected: "거절됨",
  published: "발행됨",
};

export function OutlineBoard({
  siteId,
  initialItems,
}: {
  siteId: string;
  initialItems: Record<string, unknown>[];
}) {
  const [items, setItems] = useState<OutlineItem[]>(
    initialItems as unknown as OutlineItem[]
  );
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState<number | null>(null);
  const [bulkApproving, setBulkApproving] = useState(false);
  const generateOutline = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/sites/${siteId}/outline`, { method: "POST" });
      if (!res.ok) {
        const json = await res.json() as { error?: string };
        alert(json.error ?? "아웃라인 생성 실패");
        return;
      }
      const json = await res.json() as { items: OutlineItem[] };
      setItems(json.items);
    } finally {
      setGenerating(false);
    }
  };

  const updateStatus = async (seq: number, status: "approved" | "rejected" | "pending") => {
    await fetch(`/api/sites/${siteId}/outline`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seq, status }),
    });
    setItems((prev) =>
      prev.map((item) => (item.seq === seq ? { ...item, status } : item))
    );
  };

  const bulkApprove = async () => {
    setBulkApproving(true);
    try {
      await fetch(`/api/sites/${siteId}/outline`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bulkAction: "approve_all" }),
      });
      setItems((prev) =>
        prev.map((item) => (item.status === "pending" ? { ...item, status: "approved" } : item))
      );
    } finally {
      setBulkApproving(false);
    }
  };

  const publishOne = async (seq: number) => {
    setPublishing(seq);
    try {
      const res = await fetch("/api/pipeline/authority", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, seq }),
      });
      const json = await res.json() as { success?: boolean; error?: string };
      if (json.success) {
        setItems((prev) =>
          prev.map((item) => (item.seq === seq ? { ...item, status: "published" } : item))
        );
      } else {
        alert(json.error ?? "발행 실패");
      }
    } finally {
      setPublishing(null);
    }
  };

  const approvedCount = items.filter((i) => i.status === "approved").length;
  const publishedCount = items.filter((i) => i.status === "published").length;

  return (
    <div className="space-y-4">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>전체 <strong className="text-foreground">{items.length}</strong></span>
          <span>승인 <strong className="text-green-600">{approvedCount}</strong></span>
          <span>발행됨 <strong className="text-purple-600">{publishedCount}</strong></span>
        </div>
        <div className="flex gap-2">
          {items.filter((i) => i.status === "pending").length > 0 && (
            <Button
              onClick={bulkApprove}
              disabled={bulkApproving}
              size="sm"
              variant="outline"
              className="text-green-600 border-green-200 hover:bg-green-50"
            >
              {bulkApproving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <CheckCheck className="h-4 w-4 mr-1.5" />}
              전체 승인
            </Button>
          )}
          <Button
            onClick={generateOutline}
            disabled={generating}
            size="sm"
            variant={items.length === 0 ? "default" : "outline"}
          >
            {generating ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />AI 생성 중...</>
            ) : (
              <><Sparkles className="h-4 w-4 mr-2" />{items.length === 0 ? "아웃라인 AI 생성" : "다시 생성"}</>
            )}
          </Button>
        </div>
      </div>

      {items.length === 0 && !generating && (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <Sparkles className="h-10 w-10 text-muted-foreground mb-4" />
            <p className="font-medium mb-1">아웃라인이 없습니다</p>
            <p className="text-sm text-muted-foreground">
              AI로 28~42편의 권위 아웃라인을 자동 생성하세요
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {items.map((item) => (
          <Card key={item.id ?? item.seq} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground">
                  {item.seq}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-medium text-sm leading-snug">{item.title}</p>
                    <Badge
                      className={cn(
                        "text-[10px] font-medium px-1.5 py-0",
                        STATUS_COLOR[item.status] ?? "bg-slate-100 text-slate-700"
                      )}
                    >
                      {STATUS_LABEL[item.status] ?? item.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">{item.angle}</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                    키워드: {item.targetKeyword} · slug: {item.slug}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {item.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-green-600 border-green-200 hover:bg-green-50"
                        onClick={() => updateStatus(item.seq, "approved")}
                      >
                        <CheckCircle className="h-3.5 w-3.5 mr-1" />승인
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-red-500 border-red-200 hover:bg-red-50"
                        onClick={() => updateStatus(item.seq, "rejected")}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />거절
                      </Button>
                    </>
                  )}
                  {item.status === "approved" && (
                    <Button
                      size="sm"
                      className="h-7 text-xs bg-purple-600 hover:bg-purple-700"
                      onClick={() => publishOne(item.seq)}
                      disabled={publishing === item.seq}
                    >
                      {publishing === item.seq ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                      ) : (
                        <Play className="h-3.5 w-3.5 mr-1" />
                      )}
                      발행
                    </Button>
                  )}
                  {item.status === "published" && (
                    <span className="text-[11px] text-purple-600 font-medium">✓ 완료</span>
                  )}
                  {item.status === "rejected" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => updateStatus(item.seq, "pending")}
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1" />복원
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
