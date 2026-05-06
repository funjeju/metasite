"use client";

import { useState } from "react";
import { useSiteCreationStore } from "@/store/useSiteCreationStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Plus, X, Rss, Youtube } from "lucide-react";

export function Step5SourcesPhase() {
  const { data, updateData, setStep } = useSiteCreationStore();
  const [newUrl, setNewUrl] = useState("");
  const [newType, setNewType] = useState<"rss" | "youtube">("rss");

  const addSource = () => {
    if (!newUrl.trim()) return;
    const name = newUrl.includes("youtube.com") ? "YouTube 채널" : "RSS 피드";
    const type = newUrl.includes("youtube.com") ? "youtube" : "rss_feed";
    updateData({
      sourceUrls: [
        ...data.sourceUrls,
        { url: newUrl.trim(), type, name },
      ],
    });
    setNewUrl("");
  };

  const removeSource = (idx: number) => {
    updateData({
      sourceUrls: data.sourceUrls.filter((_, i) => i !== idx),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>5단계: 출처 + 시작 단계</CardTitle>
        <CardDescription>콘텐츠 원본 출처와 시작 방식을 선택합니다</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Phase Selection */}
        <div className="space-y-3">
          <p className="text-sm font-medium">시작 단계 선택</p>
          <div className="grid grid-cols-1 gap-3">
            <button
              type="button"
              onClick={() => updateData({ phase: "authority" })}
              className={cn(
                "text-left rounded-xl border-2 p-4 transition-all",
                data.phase === "authority"
                  ? "border-purple-500 bg-purple-50"
                  : "border-border hover:border-purple-300"
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">Phase 1: 권위 구축</span>
                    <Badge variant="authority" className="text-[10px]">추천</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    AI가 28~42개 연결 글을 자동 생성해 내부 링크 웹을 구축. 신규 사이트에 최적.
                  </p>
                  <ul className="mt-2 space-y-0.5 text-[11px] text-purple-700">
                    <li>✓ 자동 아웃라인 생성 (주제별 클러스터)</li>
                    <li>✓ 내부 링크 자동 연결</li>
                    <li>✓ 완료 후 필러 페이지 자동 생성</li>
                  </ul>
                </div>
                <div className={cn("h-5 w-5 rounded-full border-2 shrink-0 mt-1", data.phase === "authority" ? "border-purple-500 bg-purple-500" : "border-border")}>
                  {data.phase === "authority" && <div className="flex h-full items-center justify-center"><div className="h-2 w-2 rounded-full bg-white" /></div>}
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => updateData({ phase: "ongoing" })}
              className={cn(
                "text-left rounded-xl border-2 p-4 transition-all",
                data.phase === "ongoing"
                  ? "border-cyan-500 bg-cyan-50"
                  : "border-border hover:border-cyan-300"
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-semibold text-sm">Phase 2: 지속 발행 (직진)</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    Scout → Evaluate → Summarize → Generate 4단계 파이프라인으로 즉시 발행 시작.
                  </p>
                  <ul className="mt-2 space-y-0.5 text-[11px] text-cyan-700">
                    <li>✓ 즉시 발행 시작</li>
                    <li>✓ 출처 기반 자동 큐레이션</li>
                  </ul>
                </div>
                <div className={cn("h-5 w-5 rounded-full border-2 shrink-0 mt-1", data.phase === "ongoing" ? "border-cyan-500 bg-cyan-500" : "border-border")}>
                  {data.phase === "ongoing" && <div className="flex h-full items-center justify-center"><div className="h-2 w-2 rounded-full bg-white" /></div>}
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Sources */}
        <div className="space-y-2">
          <p className="text-sm font-medium">출처 추가</p>
          <div className="flex gap-2">
            <div className="flex rounded-lg border overflow-hidden flex-1">
              <button
                type="button"
                onClick={() => setNewType("rss")}
                className={cn("px-3 py-2 text-xs font-medium transition-colors flex items-center gap-1", newType === "rss" ? "bg-primary text-white" : "bg-background text-muted-foreground hover:bg-muted")}
              >
                <Rss className="h-3 w-3" /> RSS
              </button>
              <button
                type="button"
                onClick={() => setNewType("youtube")}
                className={cn("px-3 py-2 text-xs font-medium transition-colors flex items-center gap-1", newType === "youtube" ? "bg-primary text-white" : "bg-background text-muted-foreground hover:bg-muted")}
              >
                <Youtube className="h-3 w-3" /> YouTube
              </button>
              <Input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSource()}
                placeholder={newType === "rss" ? "https://blog.com/feed" : "https://youtube.com/@channel"}
                className="flex-1 border-0 rounded-none focus-visible:ring-0 text-xs"
              />
            </div>
            <Button type="button" size="sm" onClick={addSource}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>

          {data.sourceUrls.length > 0 && (
            <div className="space-y-1.5 mt-2">
              {data.sourceUrls.map((s, idx) => (
                <div key={idx} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs">
                  {s.type.includes("youtube") ? (
                    <Youtube className="h-3.5 w-3.5 text-red-500 shrink-0" />
                  ) : (
                    <Rss className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                  )}
                  <span className="flex-1 truncate font-mono text-muted-foreground">{s.url}</span>
                  <button type="button" onClick={() => removeSource(idx)}>
                    <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">
            출처가 없으면 AI가 토픽 기반으로 자동 제안합니다
          </p>
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setStep(4)}>← 이전</Button>
          <Button onClick={() => setStep(6)}>검토 →</Button>
        </div>
      </CardContent>
    </Card>
  );
}
