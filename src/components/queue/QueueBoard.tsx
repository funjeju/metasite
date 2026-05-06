"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Clock, CheckCircle, XCircle, Eye, RefreshCw, Loader2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Post {
  postId: string;
  title: string;
  siteId: string;
  siteName?: string;
  sectionName?: string;
  publishStatus: string;
  wordCount?: number;
  aiUsage?: { costUsd?: number };
  createdAt?: string;
}

const STATUS_COLUMNS = [
  { status: "draft", label: "임시저장", icon: FileText, color: "border-gray-200", headerBg: "bg-gray-50" },
  { status: "review", label: "검토 중", icon: Clock, color: "border-amber-200", headerBg: "bg-amber-50" },
  { status: "approved", label: "발행 승인", icon: CheckCircle, color: "border-green-200", headerBg: "bg-green-50" },
  { status: "published", label: "발행됨", icon: CheckCircle, color: "border-blue-200", headerBg: "bg-blue-50" },
  { status: "failed", label: "실패", icon: XCircle, color: "border-red-200", headerBg: "bg-red-50" },
];

export function QueueBoard() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/posts?limit=100")
      .then((r) => r.json())
      .then((d) => setPosts(d.posts ?? []))
      .finally(() => setLoading(false));
  }, []);

  const retry = async (post: Post) => {
    setRetrying(post.postId);
    try {
      const res = await fetch("/api/failed-jobs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.postId, siteId: post.siteId, action: "retry" }),
      });
      if (res.ok) {
        setPosts((prev) => prev.map((p) => p.postId === post.postId ? { ...p, publishStatus: "draft" } : p));
      }
    } finally {
      setRetrying(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-2">
        {STATUS_COLUMNS.map((col) => {
          const count = posts.filter((q) => q.publishStatus === col.status).length;
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

      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-base font-medium mb-1">발행 큐가 비어있습니다</h3>
          <p className="text-sm text-muted-foreground">파이프라인이 실행되면 글이 여기에 나타납니다</p>
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-3 overflow-x-auto pb-4">
          {STATUS_COLUMNS.map((col) => {
            const items = posts.filter((q) => q.publishStatus === col.status);
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
                    <div key={item.postId} className="rounded-lg border bg-white p-3 shadow-sm hover:shadow-md transition-shadow">
                      <p className="text-xs font-medium line-clamp-2 mb-2 leading-snug">{item.title}</p>
                      <div className="flex items-center gap-1 mb-1.5">
                        <span className="text-[10px] text-muted-foreground truncate">{item.siteName ?? item.siteId}</span>
                        {item.sectionName && (
                          <>
                            <span className="text-muted-foreground/40">·</span>
                            <span className="text-[10px] text-muted-foreground truncate">{item.sectionName}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-muted-foreground">
                          {(item.wordCount ?? 0) > 0 ? `${item.wordCount!.toLocaleString()}자` : "-"}
                        </span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-5 w-5" asChild>
                            <Link href={`/sites/${item.siteId}/posts/${item.postId}`}><Eye className="h-3 w-3" /></Link>
                          </Button>
                          {item.publishStatus === "failed" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={() => retry(item)}
                              disabled={retrying === item.postId}
                            >
                              {retrying === item.postId ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
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
      )}
    </div>
  );
}
