"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ToggleLeft, ToggleRight, Rss } from "lucide-react";

interface Source { id: string; siteId: string; siteName?: string; url: string; name?: string; type?: string; enabled?: boolean }
interface Site { id: string; displayName?: string; name?: string }

export function SourcesManager({ initialSources, sites }: { initialSources: Record<string, unknown>[]; sites: Record<string, unknown>[] }) {
  const [sources, setSources] = useState<Source[]>(initialSources as unknown as Source[]);
  const [newUrl, setNewUrl] = useState("");
  const [newName, setNewName] = useState("");
  const [selectedSite, setSelectedSite] = useState((sites[0] as unknown as Site)?.id ?? "");

  const addSource = async () => {
    if (!newUrl || !selectedSite) return;
    const res = await fetch("/api/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId: selectedSite, url: newUrl, name: newName || newUrl, type: "rss" }),
    });
    if (res.ok) {
      const { sourceId } = await res.json() as { sourceId: string };
      const siteName = (sites.find((s) => (s as unknown as Site).id === selectedSite) as unknown as Site)?.displayName ?? selectedSite;
      setSources((prev) => [{ id: sourceId, siteId: selectedSite, siteName, url: newUrl, name: newName || newUrl, type: "rss", enabled: true }, ...prev]);
      setNewUrl(""); setNewName("");
    }
  };

  const toggleSource = async (source: Source) => {
    await fetch(`/api/sources/${source.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId: source.siteId, enabled: !source.enabled }),
    });
    setSources((prev) => prev.map((s) => s.id === source.id ? { ...s, enabled: !s.enabled } : s));
  };

  const deleteSource = async (source: Source) => {
    if (!confirm("출처를 삭제하시겠습니까?")) return;
    await fetch(`/api/sources/${source.id}?siteId=${source.siteId}`, { method: "DELETE" });
    setSources((prev) => prev.filter((s) => s.id !== source.id));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-medium mb-3">새 RSS 출처 추가</p>
          <div className="flex gap-2 flex-wrap">
            <Select value={selectedSite} onValueChange={setSelectedSite}>
              <SelectTrigger className="w-40"><SelectValue placeholder="사이트" /></SelectTrigger>
              <SelectContent>
                {(sites as unknown as Site[]).map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.displayName ?? s.name ?? s.id}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="RSS URL" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} className="flex-1 min-w-48" />
            <Input placeholder="이름 (선택)" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-36" />
            <Button onClick={addSource} disabled={!newUrl || !selectedSite}><Plus className="h-4 w-4 mr-1.5" />추가</Button>
          </div>
        </CardContent>
      </Card>

      {sources.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center py-16"><Rss className="h-10 w-10 text-muted-foreground mb-4" /><p className="font-medium">등록된 출처가 없습니다</p></CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-muted-foreground text-xs">
                <th className="text-left px-4 py-3 font-medium">이름 / URL</th>
                <th className="text-left px-4 py-3 font-medium">사이트</th>
                <th className="text-left px-4 py-3 font-medium">유형</th>
                <th className="text-right px-4 py-3 font-medium">상태</th>
                <th className="px-4 py-3"></th>
              </tr></thead>
              <tbody className="divide-y">
                {sources.map((src) => (
                  <tr key={src.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="font-medium">{src.name ?? src.url}</p>
                      <p className="text-[11px] text-muted-foreground truncate max-w-xs">{src.url}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{src.siteName ?? src.siteId}</td>
                    <td className="px-4 py-3"><Badge variant="secondary" className="text-[10px]">{src.type ?? "rss"}</Badge></td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => toggleSource(src)}>
                        {src.enabled !== false ? <ToggleRight className="h-5 w-5 text-green-500" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => deleteSource(src)} className="text-muted-foreground hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
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
