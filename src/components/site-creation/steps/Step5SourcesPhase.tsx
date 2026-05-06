"use client";

import { useState } from "react";
import { useSiteCreationStore } from "@/store/useSiteCreationStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Plus, X, Rss, Youtube, Info, ArrowRight } from "lucide-react";

export function Step5SourcesPhase() {
  const { data, updateData, setStep } = useSiteCreationStore();
  const [newUrl, setNewUrl] = useState("");
  const [newType, setNewType] = useState<"rss" | "youtube">("rss");

  const addSource = () => {
    if (!newUrl.trim()) return;
    const type = newUrl.includes("youtube.com") ? "youtube" : "rss_feed";
    const name = type === "youtube" ? "YouTube 채널" : "RSS 피드";
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
        <CardTitle>5단계: 출처 + Phase 1 조건</CardTitle>
        <CardDescription>콘텐츠 원본 출처를 등록하고 Phase 2 전환 조건을 설정합니다</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Phase flow info */}
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-purple-800">
            <Info className="h-4 w-4 shrink-0" />
            자동 Phase 전환 방식
          </div>
          <div className="flex items-center gap-2 text-xs text-purple-700">
            <Badge variant="authority" className="text-[10px] shrink-0">Phase 1</Badge>
            <span>권위 구축 (AI가 연결 글 클러스터 자동 생성)</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0" />
            <Badge className="text-[10px] shrink-0 bg-cyan-600 text-white">Phase 2</Badge>
            <span>RSS 기반 지속 발행</span>
          </div>
          <p className="text-[11px] text-purple-600">
            아래 조건을 모두 충족하면 다음 크론 실행 시 자동으로 Phase 2로 전환됩니다.
          </p>
        </div>

        {/* Phase 1 completion criteria */}
        <div className="space-y-3">
          <p className="text-sm font-medium">Phase 2 전환 조건</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">최소 발행 글 수</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={5}
                  max={100}
                  value={data.phase1MinArticles}
                  onChange={(e) =>
                    updateData({ phase1MinArticles: Math.max(5, parseInt(e.target.value) || 20) })
                  }
                  className="text-sm"
                />
                <span className="text-xs text-muted-foreground whitespace-nowrap">개 이상</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">최소 경과 일수</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={data.phase1MinDays}
                  onChange={(e) =>
                    updateData({ phase1MinDays: Math.max(1, parseInt(e.target.value) || 7) })
                  }
                  className="text-sm"
                />
                <span className="text-xs text-muted-foreground whitespace-nowrap">일 이상</span>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            권장: 글 20개 이상 + 7일 이상. Phase 1 아웃라인은 28~42개 글을 목표로 생성됩니다.
          </p>
        </div>

        {/* Sources */}
        <div className="space-y-2">
          <p className="text-sm font-medium">출처 추가 (Phase 2에서 사용)</p>
          <div className="flex gap-2">
            <div className="flex rounded-lg border overflow-hidden flex-1">
              <button
                type="button"
                onClick={() => setNewType("rss")}
                className={cn(
                  "px-3 py-2 text-xs font-medium transition-colors flex items-center gap-1",
                  newType === "rss" ? "bg-primary text-white" : "bg-background text-muted-foreground hover:bg-muted"
                )}
              >
                <Rss className="h-3 w-3" /> RSS
              </button>
              <button
                type="button"
                onClick={() => setNewType("youtube")}
                className={cn(
                  "px-3 py-2 text-xs font-medium transition-colors flex items-center gap-1",
                  newType === "youtube" ? "bg-primary text-white" : "bg-background text-muted-foreground hover:bg-muted"
                )}
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
            출처가 없으면 Phase 2 전환 후 AI가 토픽 기반으로 자동 제안합니다
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
