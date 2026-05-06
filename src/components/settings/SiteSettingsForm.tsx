"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Check, Loader2, Copy, RefreshCw } from "lucide-react";

const PHASE_OPTIONS = [{ value: "authority", label: "Phase 1: 권위 구축" }, { value: "ongoing", label: "Phase 2: 지속 발행" }];
const STATUS_OPTIONS = [{ value: "active", label: "활성" }, { value: "paused", label: "일시정지" }];

export function SiteSettingsForm({ siteId, site }: { siteId: string; site: Record<string, unknown> }) {
  const seoConfig = (site.seoConfig as Record<string, unknown>) ?? {};
  const monetization = (site.monetization as Record<string, unknown>) ?? {};
  const newsletter = (site.newsletter as Record<string, unknown>) ?? {};
  const integrations = (site.integrations as Record<string, unknown>) ?? {};
  const promptOverrides = (site.promptOverrides as Record<string, unknown>) ?? {};

  const [form, setForm] = useState({
    displayName: (site.displayName as string) ?? "",
    topic: (site.topic as string) ?? "",
    currentPhase: (site.currentPhase as string) ?? "authority",
    status: (site.status as string) ?? "active",
    canonicalDomain: (seoConfig.canonicalDomain as string) ?? "",
    // Monetization
    monetizationEnabled: (monetization.enabled as boolean) ?? false,
    adsenseClientId: (monetization.adsenseClientId as string) ?? "",
    adsenseSlotId: (monetization.adsenseSlotId as string) ?? "",
    // Newsletter
    newsletterEnabled: (newsletter.enabled as boolean) ?? false,
    newsletterFromEmail: (newsletter.fromEmail as string) ?? "",
    // Integrations (analytics)
    gscAccessToken: (integrations.gscAccessToken as string) ?? "",
    ga4PropertyId: (integrations.ga4PropertyId as string) ?? "",
    ga4AccessToken: (integrations.ga4AccessToken as string) ?? "",
    // Prompt overrides
    writerOverride: (promptOverrides.writer as string) ?? "",
    verifierOverride: (promptOverrides.verifier as string) ?? "",
    editorOverride: (promptOverrides.editor as string) ?? "",
    outlineOverride: (promptOverrides.outlineGenerator as string) ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [webhookSecret, setWebhookSecret] = useState((site.webhookSecret as string) ?? "");
  const [rotatingSecret, setRotatingSecret] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const set = <K extends keyof typeof form>(key: K, value: typeof form[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const rotateWebhookSecret = async () => {
    setRotatingSecret(true);
    const res = await fetch(`/api/sites/${siteId}/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "rotate" }),
    });
    const data = await res.json() as { webhookSecret?: string };
    if (data.webhookSecret) setWebhookSecret(data.webhookSecret);
    setRotatingSecret(false);
  };

  const copySecret = async () => {
    if (!webhookSecret) return;
    await navigator.clipboard.writeText(webhookSecret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 1500);
  };

  const save = async () => {
    setSaving(true);
    await fetch(`/api/sites/${siteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: form.displayName,
        topic: form.topic,
        currentPhase: form.currentPhase,
        status: form.status,
        seoConfig: { ...seoConfig, canonicalDomain: form.canonicalDomain },
        monetization: {
          ...monetization,
          enabled: form.monetizationEnabled,
          adsenseClientId: form.adsenseClientId,
          adsenseSlotId: form.adsenseSlotId,
        },
        newsletter: {
          ...newsletter,
          enabled: form.newsletterEnabled,
          fromEmail: form.newsletterFromEmail,
        },
        integrations: {
          ...integrations,
          gscAccessToken: form.gscAccessToken || undefined,
          ga4PropertyId: form.ga4PropertyId || undefined,
          ga4AccessToken: form.ga4AccessToken || undefined,
        },
        promptOverrides: {
          writer: form.writerOverride || undefined,
          verifier: form.verifierOverride || undefined,
          editor: form.editorOverride || undefined,
          outlineGenerator: form.outlineOverride || undefined,
        },
      }),
    });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4 max-w-xl">
      {/* 기본 정보 */}
      <Card>
        <CardHeader><CardTitle className="text-sm">기본 정보</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">사이트 ID</Label>
            <p className="font-mono text-sm text-muted-foreground">{siteId}</p>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">표시 이름</Label>
            <Input value={form.displayName} onChange={(e) => set("displayName", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">토픽</Label>
            <Input value={form.topic} onChange={(e) => set("topic", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">도메인</Label>
            <Input placeholder="example.com" value={form.canonicalDomain} onChange={(e) => set("canonicalDomain", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* 운영 설정 */}
      <Card>
        <CardHeader><CardTitle className="text-sm">운영 설정</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">현재 단계</Label>
            <div className="flex gap-2">
              {PHASE_OPTIONS.map((o) => (
                <button key={o.value} onClick={() => set("currentPhase", o.value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${form.currentPhase === o.value ? "bg-purple-600 text-white border-purple-600" : "border-border text-muted-foreground hover:border-foreground"}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">상태</Label>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map((o) => (
                <button key={o.value} onClick={() => set("status", o.value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${form.status === o.value ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:border-foreground"}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 수익화 */}
      <Card>
        <CardHeader><CardTitle className="text-sm">수익화 (AdSense)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-xs">AdSense 광고 활성화</Label>
            <Switch
              checked={form.monetizationEnabled}
              onCheckedChange={(v: boolean) => set("monetizationEnabled", v)}
            />
          </div>
          {form.monetizationEnabled && (
            <>
              <div className="space-y-2">
                <Label className="text-xs">AdSense Client ID</Label>
                <Input
                  placeholder="ca-pub-XXXXXXXXXXXXXXXXX"
                  value={form.adsenseClientId}
                  onChange={(e) => set("adsenseClientId", e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">AdSense Slot ID</Label>
                <Input
                  placeholder="XXXXXXXXXX"
                  value={form.adsenseSlotId}
                  onChange={(e) => set("adsenseSlotId", e.target.value)}
                  className="font-mono text-xs"
                />
                <p className="text-[10px] text-muted-foreground">본문 AI 생성 시 자동으로 광고 태그가 삽입됩니다</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 뉴스레터 */}
      <Card>
        <CardHeader><CardTitle className="text-sm">뉴스레터</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-xs">주간 뉴스레터 발송 활성화</Label>
            <Switch
              checked={form.newsletterEnabled}
              onCheckedChange={(v: boolean) => set("newsletterEnabled", v)}
            />
          </div>
          {form.newsletterEnabled && (
            <div className="space-y-2">
              <Label className="text-xs">발신자 이메일</Label>
              <Input
                placeholder="Newsletter <noreply@example.com>"
                value={form.newsletterFromEmail}
                onChange={(e) => set("newsletterFromEmail", e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">Resend에서 인증된 도메인 또는 이메일을 사용하세요</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 프롬프트 오버라이드 */}
      <Card>
        <CardHeader><CardTitle className="text-sm">AI 프롬프트 오버라이드</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-[11px] text-muted-foreground">
            이 사이트에만 적용되는 추가 지시사항입니다. 비워두면 전역 기본값이 사용됩니다.
          </p>
          <div className="space-y-2">
            <Label className="text-xs">Writer 추가 지시</Label>
            <Textarea
              placeholder="예: 반드시 소제목마다 통계 수치를 포함하세요."
              rows={3}
              value={form.writerOverride}
              onChange={(e) => set("writerOverride", e.target.value)}
              className="text-xs font-mono resize-none"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Verifier 추가 지시</Label>
            <Textarea
              placeholder="예: 한국어 기사 출처는 신뢰할 수 있는 것으로 간주하세요."
              rows={2}
              value={form.verifierOverride}
              onChange={(e) => set("verifierOverride", e.target.value)}
              className="text-xs font-mono resize-none"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Editor 추가 지시</Label>
            <Textarea
              placeholder="예: metaTitle에 반드시 사이트 이름을 포함하세요."
              rows={2}
              value={form.editorOverride}
              onChange={(e) => set("editorOverride", e.target.value)}
              className="text-xs font-mono resize-none"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Outline Generator 추가 지시</Label>
            <Textarea
              placeholder="예: 입문자용 튜토리얼 글을 최소 10개 포함하세요."
              rows={2}
              value={form.outlineOverride}
              onChange={(e) => set("outlineOverride", e.target.value)}
              className="text-xs font-mono resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* 분석 연동 */}
      <Card>
        <CardHeader><CardTitle className="text-sm">분석 연동 (GSC / GA4)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-[11px] text-muted-foreground">실제 트래픽 데이터를 수집하려면 아래 토큰을 설정하세요. 미입력 시 추정 데이터가 사용됩니다.</p>
          <div className="space-y-2">
            <Label className="text-xs">GSC Access Token</Label>
            <Input
              placeholder="OAuth2 Access Token"
              value={form.gscAccessToken}
              onChange={(e) => set("gscAccessToken", e.target.value)}
              className="font-mono text-xs"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">GA4 Property ID</Label>
            <Input
              placeholder="properties/XXXXXXXXX"
              value={form.ga4PropertyId}
              onChange={(e) => set("ga4PropertyId", e.target.value)}
              className="font-mono text-xs"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">GA4 Access Token</Label>
            <Input
              placeholder="OAuth2 Access Token"
              value={form.ga4AccessToken}
              onChange={(e) => set("ga4AccessToken", e.target.value)}
              className="font-mono text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* 웹훅 */}
      <Card>
        <CardHeader><CardTitle className="text-sm">웹훅 트리거</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            외부 서비스(GitHub Actions, Zapier 등)에서 파이프라인을 트리거할 수 있습니다.
          </p>
          <div className="space-y-2">
            <Label className="text-xs">웹훅 엔드포인트</Label>
            <code className="block text-[11px] bg-muted px-3 py-2 rounded-md text-muted-foreground">
              POST /api/webhook/{siteId}
            </code>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">시크릿 키 (x-webhook-secret 헤더)</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={webhookSecret ? webhookSecret.replace(/./g, "•") : "(미생성)"}
                className="font-mono text-xs flex-1"
              />
              {webhookSecret && (
                <Button variant="outline" size="sm" onClick={copySecret} className="shrink-0">
                  {copiedSecret ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={rotateWebhookSecret} disabled={rotatingSecret} className="shrink-0">
                {rotatingSecret ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {webhookSecret ? "재생성" : "생성"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving} className="w-full">
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : saved ? <Check className="h-4 w-4 mr-2" /> : null}
        {saved ? "저장됨!" : "설정 저장"}
      </Button>
    </div>
  );
}
