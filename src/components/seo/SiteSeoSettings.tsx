"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Check, Loader2, Plus, X, Copy, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function SiteSeoSettings({ siteId, site }: { siteId: string; site: Record<string, unknown> }) {
  const seoConfig = (site.seoConfig as Record<string, unknown>) ?? {};
  const [form, setForm] = useState({
    canonicalDomain: (seoConfig.canonicalDomain as string) ?? "",
    searchConsoleVerified: (seoConfig.searchConsoleVerified as boolean) ?? false,
    searchConsoleId: (seoConfig.searchConsoleId as string) ?? "",
    siteKeywords: (seoConfig.siteKeywords as string[]) ?? [],
    gaId: (seoConfig.gaId as string) ?? "",
    indexNowKey: (seoConfig.indexNowKey as string) ?? "",
  });
  const [newKeyword, setNewKeyword] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const domain = form.canonicalDomain;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const autoUrls = domain ? [
    { label: "Sitemap", url: `https://${domain}/sitemap.xml`, api: `${baseUrl}/api/sites/${siteId}/sitemap` },
    { label: "RSS Feed", url: `https://${domain}/feed.xml`, api: `${baseUrl}/api/sites/${siteId}/feed` },
    { label: "llms.txt", url: `https://${domain}/llms.txt`, api: `${baseUrl}/api/sites/${siteId}/llms` },
    { label: "robots.txt", url: `https://${domain}/robots.txt`, api: `${baseUrl}/api/sites/${siteId}/robots` },
  ] : [];

  const copyUrl = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 1500);
  };

  const addKeyword = () => {
    const k = newKeyword.trim();
    if (!k || form.siteKeywords.includes(k)) return;
    setForm((f) => ({ ...f, siteKeywords: [...f.siteKeywords, k] }));
    setNewKeyword("");
  };

  const removeKeyword = (k: string) => setForm((f) => ({ ...f, siteKeywords: f.siteKeywords.filter((x) => x !== k) }));

  const save = async () => {
    setSaving(true);
    await fetch(`/api/sites/${siteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seoConfig: { ...seoConfig, ...form } }),
    });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4 max-w-xl">
      {/* 도메인 & 색인 */}
      <Card>
        <CardHeader><CardTitle className="text-sm">도메인 & 색인</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Canonical Domain</Label>
            <Input placeholder="example.com" value={form.canonicalDomain} onChange={(e) => setForm((f) => ({ ...f, canonicalDomain: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Google Analytics ID</Label>
            <Input placeholder="G-XXXXXXXXXX" value={form.gaId} onChange={(e) => setForm((f) => ({ ...f, gaId: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Search Console 인증 코드</Label>
            <Input placeholder="google-site-verification=..." value={form.searchConsoleId} onChange={(e) => setForm((f) => ({ ...f, searchConsoleId: e.target.value }))} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Search Console 인증 완료</Label>
            <Switch checked={form.searchConsoleVerified} onCheckedChange={(v: boolean) => setForm((f) => ({ ...f, searchConsoleVerified: v }))} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">IndexNow API Key</Label>
            <Input placeholder="자동 생성 또는 직접 입력" value={form.indexNowKey} onChange={(e) => setForm((f) => ({ ...f, indexNowKey: e.target.value }))} className="font-mono text-xs" />
            <p className="text-[10px] text-muted-foreground">글 발행 시 Bing에 자동 색인 요청됩니다</p>
          </div>
        </CardContent>
      </Card>

      {/* 자동 생성 URL */}
      {autoUrls.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">자동 생성 파일 URL</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {autoUrls.map((item) => (
              <div key={item.label} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40">
                <Badge variant="secondary" className="text-[10px] w-16 justify-center shrink-0">{item.label}</Badge>
                <code className="text-[11px] flex-1 min-w-0 truncate text-muted-foreground">{item.api}</code>
                <button
                  onClick={() => copyUrl(item.api)}
                  className="text-muted-foreground hover:text-foreground shrink-0"
                  title="복사"
                >
                  {copiedUrl === item.api ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                <a href={item.api} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground shrink-0">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 타겟 키워드 */}
      <Card>
        <CardHeader><CardTitle className="text-sm">타겟 키워드</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="키워드 추가" value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addKeyword(); } }} />
            <Button size="sm" onClick={addKeyword}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {form.siteKeywords.map((k) => (
              <Badge key={k} variant="secondary" className="pr-1">
                {k}
                <button onClick={() => removeKeyword(k)} className="ml-1 hover:text-red-500"><X className="h-3 w-3" /></button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving} className="w-full">
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : saved ? <Check className="h-4 w-4 mr-2" /> : null}
        {saved ? "저장됨!" : "SEO 설정 저장"}
      </Button>
    </div>
  );
}
