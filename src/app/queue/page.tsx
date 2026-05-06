import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Clock, CheckCircle, XCircle, Eye, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const MOCK_QUEUE = [
  {
    postId: "q1",
    title: "2026년 유럽 여행 트렌드 완벽 가이드",
    siteId: "travel-kr",
    siteName: "Travel KR",
    sectionName: "해외 여행",
    publishStatus: "review",
    aiMetadata: { qualityScore: 88, wordCount: 2840, totalCostUSD: 0.12 },
    createdAt: new Date(Date.now() - 3600000),
  },
  {
    postId: "q2",
    title: "Claude Opus 4.7 vs GPT-5: 2026 AI 모델 비교",
    siteId: "ai-news-en",
    siteName: "AI News EN",
    sectionName: "AI 뉴스",
    publishStatus: "approved",
    aiMetadata: { qualityScore: 94, wordCount: 3200, totalCostUSD: 0.18 },
    createdAt: new Date(Date.now() - 7200000),
  },
  {
    postId: "q3",
    title: "ETF vs 개별 주식: 초보 투자자를 위한 가이드",
    siteId: "finance-kr",
    siteName: "Finance KR",
    sectionName: "투자 기초",
    publishStatus: "draft",
    aiMetadata: { qualityScore: 76, wordCount: 1920, totalCostUSD: 0.09 },
    createdAt: new Date(Date.now() - 1800000),
  },
  {
    postId: "q4",
    title: "부산 해운대 맛집 BEST 20",
    siteId: "travel-kr",
    siteName: "Travel KR",
    sectionName: "국내 여행",
    publishStatus: "published",
    aiMetadata: { qualityScore: 91, wordCount: 2200, totalCostUSD: 0.11 },
    createdAt: new Date(Date.now() - 86400000),
  },
  {
    postId: "q5",
    title: "OpenAI o3 최신 업데이트 분석",
    siteId: "ai-news-en",
    siteName: "AI News EN",
    sectionName: "AI 뉴스",
    publishStatus: "failed",
    aiMetadata: { qualityScore: 0, wordCount: 0, totalCostUSD: 0 },
    createdAt: new Date(Date.now() - 43200000),
  },
];

const STATUS_COLUMNS = [
  { status: "draft", label: "임시저장", icon: FileText, color: "border-gray-200", headerBg: "bg-gray-50" },
  { status: "review", label: "검토 중", icon: Clock, color: "border-amber-200", headerBg: "bg-amber-50" },
  { status: "approved", label: "발행 승인", icon: CheckCircle, color: "border-green-200", headerBg: "bg-green-50" },
  { status: "published", label: "발행됨", icon: CheckCircle, color: "border-blue-200", headerBg: "bg-blue-50" },
  { status: "failed", label: "실패", icon: XCircle, color: "border-red-200", headerBg: "bg-red-50" },
];

export default function QueuePage() {
  return (
    <AppShell title="발행 큐" description="전체 사이트 콘텐츠 발행 현황">
      <div className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-5 gap-2">
          {STATUS_COLUMNS.map((col) => {
            const count = MOCK_QUEUE.filter((q) => q.publishStatus === col.status).length;
            return (
              <Card key={col.status} className={cn("border", col.color)}>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">{col.label}</p>
                  <p className="text-2xl font-bold mt-0.5">{count}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-5 gap-3 overflow-x-auto pb-4">
          {STATUS_COLUMNS.map((col) => {
            const items = MOCK_QUEUE.filter((q) => q.publishStatus === col.status);
            const Icon = col.icon;
            return (
              <div key={col.status} className="min-w-[200px]">
                <div className={cn("flex items-center gap-2 rounded-t-lg border border-b-0 px-3 py-2", col.headerBg, col.color)}>
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold">{col.label}</span>
                  <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-white/60 text-[10px] font-bold">
                    {items.length}
                  </span>
                </div>
                <div className={cn("rounded-b-lg border min-h-[400px] p-2 space-y-2", col.color)}>
                  {items.map((item) => (
                    <div key={item.postId} className="rounded-lg border bg-white p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                      <p className="text-xs font-medium line-clamp-2 mb-2 leading-snug">
                        {item.title}
                      </p>
                      <div className="flex items-center gap-1 mb-1.5">
                        <span className="text-[10px] text-muted-foreground truncate">{item.siteName}</span>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="text-[10px] text-muted-foreground truncate">{item.sectionName}</span>
                      </div>
                      {item.aiMetadata.wordCount > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 h-1 rounded-full bg-gray-100">
                            <div
                              className="h-full rounded-full bg-green-400"
                              style={{ width: `${item.aiMetadata.qualityScore}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {item.aiMetadata.qualityScore}점
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-muted-foreground">
                          {item.aiMetadata.wordCount > 0 ? `${item.aiMetadata.wordCount}자` : "-"}
                        </span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-5 w-5">
                            <Eye className="h-3 w-3" />
                          </Button>
                          {item.publishStatus === "failed" && (
                            <Button variant="ghost" size="icon" className="h-5 w-5">
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
