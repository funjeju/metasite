"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Sparkles, MessageSquare, Loader2, ArrowLeft, Copy, Check } from "lucide-react";
import Link from "next/link";

interface Comment { id: string; personaName?: string; content: string; isAi?: boolean; createdAt?: string }

export function PostDetail({
  post,
  siteId,
  initialComments,
}: {
  post: Record<string, unknown>;
  siteId: string;
  initialComments: Record<string, unknown>[];
}) {
  const [comments, setComments] = useState<Comment[]>(initialComments as unknown as Comment[]);
  const [generatingComments, setGeneratingComments] = useState(false);
  const [copied, setCopied] = useState(false);

  const title = post.title as string ?? "";
  const excerpt = post.excerpt as string ?? "";
  const bodyHtml = post.bodyHtml as string ?? "";
  const bodyMd = post.bodyMd as string ?? "";
  const tags = (post.tags as string[]) ?? [];
  const publishedAt = post.publishedAt as string | undefined;
  const externalUrl = post.externalUrl as string | undefined;
  const wordCount = post.wordCount as number | undefined;
  const metaTitle = post.metaTitle as string | undefined;
  const metaDescription = post.metaDescription as string | undefined;
  const phase = post.phase as string ?? "authority";
  const publishStatus = post.publishStatus as string ?? "";

  const copyMarkdown = async () => {
    await navigator.clipboard.writeText(bodyMd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateAiComments = async () => {
    setGeneratingComments(true);
    try {
      const res = await fetch(`/api/sites/${siteId}/posts/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", count: 3 }),
      });
      if (res.ok) {
        const data = await res.json() as { comments: Comment[] };
        setComments((prev) => [...prev, ...data.comments]);
      }
    } finally {
      setGeneratingComments(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    await fetch(`/api/sites/${siteId}/posts/${post.id as string}/comments?commentId=${commentId}`, { method: "DELETE" });
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back + header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 mt-0.5" asChild>
          <Link href={`/sites/${siteId}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge variant="secondary" className="text-[10px]">{phase}</Badge>
            <Badge className={`text-[10px] ${publishStatus === "published" ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-700"}`}>{publishStatus}</Badge>
            {wordCount && <span className="text-xs text-muted-foreground">{wordCount.toLocaleString()}단어</span>}
            {publishedAt && <span className="text-xs text-muted-foreground">{new Date(publishedAt).toLocaleDateString("ko-KR")}</span>}
          </div>
          <h1 className="text-xl font-bold leading-snug">{title}</h1>
          {excerpt && <p className="text-sm text-muted-foreground mt-1">{excerpt}</p>}
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {tags.map((t) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={copyMarkdown}>
            {copied ? <Check className="h-4 w-4 mr-1.5 text-green-500" /> : <Copy className="h-4 w-4 mr-1.5" />}
            MD 복사
          </Button>
          {externalUrl && (
            <Button size="sm" asChild>
              <a href={externalUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-1.5" />보기
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* SEO meta */}
      {(metaTitle || metaDescription) && (
        <Card>
          <CardHeader><CardTitle className="text-xs text-muted-foreground">SEO 메타</CardTitle></CardHeader>
          <CardContent className="space-y-2 pt-0">
            {metaTitle && <div><p className="text-[10px] text-muted-foreground mb-0.5">Title ({metaTitle.length}자)</p><p className="text-sm font-medium">{metaTitle}</p></div>}
            {metaDescription && <div><p className="text-[10px] text-muted-foreground mb-0.5">Description ({metaDescription.length}자)</p><p className="text-sm">{metaDescription}</p></div>}
          </CardContent>
        </Card>
      )}

      {/* Article body */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">본문</CardTitle>
        </CardHeader>
        <CardContent>
          {bodyHtml ? (
            <div
              className="prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          ) : (
            <pre className="text-xs whitespace-pre-wrap text-muted-foreground">{bodyMd}</pre>
          )}
        </CardContent>
      </Card>

      {/* Comments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            댓글 ({comments.length})
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={generateAiComments}
            disabled={generatingComments}
          >
            {generatingComments ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
            AI 댓글 생성
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {comments.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">댓글이 없습니다</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3 group">
              <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs font-medium">
                {(c.personaName ?? "?")[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-xs font-medium">{c.personaName ?? "독자"}</span>
                  {c.isAi && <Badge className="text-[9px] px-1 py-0 bg-purple-100 text-purple-600">AI</Badge>}
                  {c.createdAt && <span className="text-[10px] text-muted-foreground">{new Date(c.createdAt).toLocaleDateString("ko-KR")}</span>}
                </div>
                <p className="text-sm text-foreground/80">{c.content}</p>
              </div>
              <button
                onClick={() => deleteComment(c.id)}
                className="text-muted-foreground/30 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs shrink-0"
              >✕</button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
