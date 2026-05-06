"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ToggleLeft, ToggleRight, Rss, FlaskConical, Loader2, X, ExternalLink } from "lucide-react";

interface Source { id: string; siteId: string; url: string; name?: string; type?: string; enabled?: boolean }
interface FeedItem { title: string; link: string; pubDate?: string; description?: string }

export function SiteSourcesManager({ siteId, initialSources }: { siteId: string; initialSources: Record<string, unknown>[] }) {
  const [sources, setSources] = useState<Source[]>(initialSources as unknown as Source[]);
  const [newUrl, setNewUrl] = useState("");
  const [newName, setNewName] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ items?: FeedItem[]; error?: string } | null>(null);

  const addSource = async () => {
    if (!newUrl) return;
    const res = await fetch("/api/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId, url: newUrl, name: newName || newUrl, type: "rss" }),
    });
    if (res.ok) {
      const { sourceId } = await res.json() as { sourceId: string };
      setSources((prev) => [{ id: sourceId, siteId, url: newUrl, name: newName || newUrl, type: "rss", enabled: true }, ...prev]);
      setNewUrl(""); setNewName(""); setTestResult(null);
    }
  };

  const testFeed = async () => {
    if (!newUrl) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/sources/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: newUrl }),
      });
      const data = await res.json() as { items?: FeedItem[]; error?: string };
      setTestResult(data);
    } finally {
      setTesting(false);
    }
  };

  const toggle = async (src: Source) => {
    await fetch(`/api/sources/${src.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId, enabled: !src.enabled }),
    });
    setSources((prev) => prev.map((s) => s.id === src.id ? { ...s, enabled: !s.enabled } : s));
  };

  const remove = async (src: Source) => {
    if (!confirm("삭제하시겠습니까?")) return;
    await fetch(`/api/sources/${src.id}?siteId=${siteId}`, { method: "DELETE" });
    setSources((prev) => prev.filter((s) => s.id !== src.id));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-medium">RSS 출처 추가</p>
          <div className="flex gap-2">
            <Input
              placeholder="RSS Feed URL"
              value={newUrl}
              onChange={(e) => { setNewUrl(e.target.value); setTestResult(null); }}
              className="flex-1"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSource(); } }}
            />
            <Input placeholder="이름 (선택)" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-40" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={testFeed} disabled={!newUrl || testing}>
              {testing ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <FlaskConical className="h-4 w-4 mr-1.5" />}
              {testing ? "테스트 중..." : "피드 테스트"}
            </Button>
            <Button size="sm" onClick={addSource} disabled={!newUrl}>
              <Plus className="h-4 w-4 mr-1.5" />추가
            </Button>
          </div>

          {testResult && (
            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium">
                  {testResult.error ? "❌ 오류" : `✅ 최근 ${testResult.items?.length ?? 0}개 항목 미리보기`}
                </p>
                <button onClick={() => setTestResult(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {testResult.error && <p className="text-xs text-red-500">{testResult.error}</p>}
              {testResult.items?.map((item, i) => (
                <div key={i} className="border-t pt-2 first:border-t-0 first:pt-0">
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium hover:text-primary flex items-center gap-1 group"
                  >
                    {item.title}
                    <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 shrink-0" />
                  </a>
                  {item.pubDate && <p className="text-[10px] text-muted-foreground">{item.pubDate}</p>}
                  {item.description && <p className="text-[11px] text-muted-foreground line-clamp-2">{item.description}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {sources.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center py-12"><Rss className="h-8 w-8 text-muted-foreground mb-3" /><p className="text-sm font-medium">등록된 출처가 없습니다</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {sources.map((src) => (
            <Card key={src.id}>
              <CardContent className="p-3 flex items-center gap-3">
                <Rss className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{src.name ?? src.url}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{src.url}</p>
                </div>
                <Badge variant="secondary" className="text-[10px]">{src.type ?? "rss"}</Badge>
                <button onClick={() => toggle(src)}>
                  {src.enabled !== false ? <ToggleRight className="h-5 w-5 text-green-500" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                </button>
                <button onClick={() => remove(src)} className="text-muted-foreground hover:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
