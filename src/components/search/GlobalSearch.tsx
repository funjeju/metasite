"use client";

import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, FileText, ExternalLink } from "lucide-react";
import Link from "next/link";

interface SearchResult {
  id: string;
  siteId: string;
  title?: string;
  excerpt?: string;
  tags?: string[];
  publishedAt?: string;
  externalUrl?: string;
  wordCount?: number;
}

interface SiteRef { id: string; displayName?: string; name?: string }

export function GlobalSearch({ sites }: { sites: Record<string, unknown>[] }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const siteMap = Object.fromEntries(
    (sites as unknown as SiteRef[]).map((s) => [s.id, s.displayName ?? s.name ?? s.id])
  );

  const search = async (q: string) => {
    if (!q.trim()) { setResults([]); setSearched(false); return; }
    setLoading(true);
    setSearched(true);
    try {
      const siteList = sites as unknown as SiteRef[];
      const fetches = siteList.map((s) =>
        fetch(`/api/sites/${s.id}/search?q=${encodeURIComponent(q)}&limit=5`)
          .then((r) => r.json() as Promise<{ results: SearchResult[] }>)
          .then((d) => d.results ?? [])
          .catch(() => [] as SearchResult[])
      );
      const all = (await Promise.all(fetches)).flat();
      // Sort by publishedAt desc
      all.sort((a, b) => {
        const aDate = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const bDate = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return bDate - aDate;
      });
      setResults(all);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 400);
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="전체 사이트에서 글 검색..."
          className="pl-11 h-12 text-base"
          value={query}
          onChange={handleChange}
          autoFocus
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {searched && (
        <p className="text-sm text-muted-foreground">
          {loading ? "검색 중..." : `${results.length}개 결과`}
          {!loading && query && ` — "${query}"`}
        </p>
      )}

      {results.length === 0 && searched && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center py-16">
            <FileText className="h-10 w-10 text-muted-foreground mb-4" />
            <p className="font-medium">검색 결과 없음</p>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <Card>
          <CardContent className="p-0 divide-y">
            {results.map((r) => (
              <div key={`${r.siteId}-${r.id}`} className="flex gap-3 p-4 hover:bg-muted/30 transition-colors group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">{siteMap[r.siteId] ?? r.siteId}</Badge>
                    {r.tags?.slice(0, 2).map((t) => (
                      <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                    ))}
                    {r.publishedAt && (
                      <span className="text-[10px] text-muted-foreground">{new Date(r.publishedAt).toLocaleDateString("ko-KR")}</span>
                    )}
                  </div>
                  <Link
                    href={`/sites/${r.siteId}/posts/${r.id}`}
                    className="font-medium text-sm hover:text-primary transition-colors block line-clamp-1"
                  >
                    {r.title ?? "(제목 없음)"}
                  </Link>
                  {r.excerpt && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.excerpt}</p>
                  )}
                </div>
                <div className="flex items-start gap-2 shrink-0 pt-0.5">
                  {r.wordCount && <span className="text-xs text-muted-foreground">{r.wordCount.toLocaleString()}자</span>}
                  {r.externalUrl && (
                    <a href={r.externalUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
