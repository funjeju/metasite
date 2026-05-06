"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, FileText, Loader2 } from "lucide-react";
import Link from "next/link";

interface Post { id: string; siteId: string; title?: string; slug?: string; publishStatus?: string; createdAt?: string; wordCount?: number; phase?: string }

const STATUSES = [
  { key: "generating", label: "생성중", color: "bg-blue-100 text-blue-700" },
  { key: "approved", label: "승인됨", color: "bg-green-100 text-green-700" },
  { key: "published", label: "발행됨", color: "bg-purple-100 text-purple-700" },
  { key: "failed", label: "실패", color: "bg-red-100 text-red-600" },
  { key: "draft", label: "임시저장", color: "bg-slate-100 text-slate-700" },
];

export function SiteQueueBoard({ siteId, initialPosts }: { siteId: string; initialPosts: Record<string, unknown>[] }) {
  const [posts] = useState<Post[]>(initialPosts as unknown as Post[]);
  const [running, setRunning] = useState(false);

  const triggerGenerate = async () => {
    setRunning(true);
    await fetch("/api/pipeline/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId }),
    });
    setRunning(false);
    window.location.reload();
  };

  const grouped = STATUSES.reduce((acc, s) => ({ ...acc, [s.key]: posts.filter((p) => p.publishStatus === s.key) }), {} as Record<string, Post[]>);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={triggerGenerate} disabled={running}>
          {running ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Play className="h-4 w-4 mr-1.5" />}
          Phase 2 즉시 실행
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        {STATUSES.map((s) => (
          <div key={s.key}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
              <span className="text-xs text-muted-foreground">{grouped[s.key]?.length ?? 0}</span>
            </div>
            <div className="space-y-2">
              {(grouped[s.key] ?? []).map((post) => (
                <Card key={post.id} className="shadow-none hover:shadow-sm transition-shadow">
                  <CardContent className="p-3">
                    <Link href={`/sites/${siteId}/posts/${post.id}`} className="block">
                      <p className="text-xs font-medium line-clamp-2 mb-1 hover:text-primary transition-colors">{post.title ?? post.slug ?? post.id}</p>
                    </Link>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="secondary" className="text-[10px] px-1 py-0">{post.phase ?? "authority"}</Badge>
                      {post.wordCount && <span className="text-[10px] text-muted-foreground">{post.wordCount}자</span>}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(grouped[s.key] ?? []).length === 0 && (
                <div className="flex flex-col items-center py-6 text-muted-foreground/40">
                  <FileText className="h-5 w-5 mb-1" />
                  <p className="text-[10px]">없음</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
