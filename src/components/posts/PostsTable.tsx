"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExternalLink, Search, FileText, Download, Send, Loader2 } from "lucide-react";
import Link from "next/link";

interface Post {
  id: string;
  siteId: string;
  siteName?: string;
  title?: string;
  slug?: string;
  publishStatus?: string;
  publishedAt?: string;
  wordCount?: number;
  externalUrl?: string;
  tags?: string[];
}

export function PostsTable({
  initialPosts,
  showExport = false,
}: {
  initialPosts: Record<string, unknown>[];
  showExport?: boolean;
}) {
  const [posts, setPosts] = useState<Post[]>(initialPosts as unknown as Post[]);
  const [query, setQuery] = useState("");
  const [publishing, setPublishing] = useState<string | null>(null);

  const filtered = posts.filter((p) =>
    !query || `${p.title ?? ""} ${p.siteName ?? ""} ${(p.tags ?? []).join(" ")}`.toLowerCase().includes(query.toLowerCase())
  );

  const exportSiteId = filtered.length > 0 ? filtered[0].siteId : null;

  const publishPost = async (post: Post) => {
    setPublishing(post.id);
    try {
      const res = await fetch(`/api/sites/${post.siteId}/posts/${post.id}/publish`, { method: "POST" });
      if (res.ok) {
        setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, publishStatus: "published" } : p));
      }
    } finally {
      setPublishing(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="제목·사이트·태그 검색" className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <span className="text-sm text-muted-foreground">{filtered.length}개</span>
        {showExport && exportSiteId && (
          <Button variant="outline" size="sm" asChild>
            <a href={`/api/sites/${exportSiteId}/export?format=csv`} download>
              <Download className="h-4 w-4 mr-1.5" />CSV 내보내기
            </a>
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16">
            <FileText className="h-10 w-10 text-muted-foreground mb-4" />
            <p className="font-medium">{query ? "검색 결과 없음" : "글이 없습니다"}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-xs">
                  <th className="text-left px-4 py-3 font-medium">제목</th>
                  <th className="text-left px-4 py-3 font-medium">사이트</th>
                  <th className="text-left px-4 py-3 font-medium">상태</th>
                  <th className="text-left px-4 py-3 font-medium">발행일</th>
                  <th className="text-right px-4 py-3 font-medium">단어수</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((post) => (
                  <tr key={post.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/sites/${post.siteId}/posts/${post.id}`} className="font-medium line-clamp-1 hover:text-primary transition-colors block">{post.title ?? "(제목 없음)"}</Link>
                      {post.tags && post.tags.length > 0 && (
                        <div className="flex gap-1 mt-0.5 flex-wrap">
                          {post.tags.slice(0, 3).map((t) => (
                            <Badge key={t} variant="secondary" className="text-[10px] px-1 py-0">{t}</Badge>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{post.siteName ?? post.siteId}</td>
                    <td className="px-4 py-3">
                      <Badge className={`text-[10px] ${
                        post.publishStatus === "published" ? "bg-green-100 text-green-700" :
                        post.publishStatus === "approved" ? "bg-blue-100 text-blue-700" :
                        post.publishStatus === "failed" ? "bg-red-100 text-red-700" :
                        "bg-slate-100 text-slate-700"
                      }`}>
                        {post.publishStatus === "published" ? "발행됨" :
                         post.publishStatus === "approved" ? "승인됨" :
                         post.publishStatus === "failed" ? "실패" : post.publishStatus ?? "—"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString("ko-KR") : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{post.wordCount ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {post.publishStatus === "approved" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => publishPost(post)}
                            disabled={publishing === post.id}
                            title="발행하기"
                          >
                            {publishing === post.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                          </Button>
                        )}
                        {post.externalUrl && (
                          <a href={post.externalUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
