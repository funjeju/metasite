"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Check, Loader2 } from "lucide-react";

const MODEL_OPTIONS = ["claude-opus-4-7-20251101", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"];

export function GlobalSettings({ initialSettings }: { initialSettings: Record<string, unknown> }) {
  const [settings, setSettings] = useState({
    defaultModel: (initialSettings.defaultModel as string) ?? "claude-opus-4-7-20251101",
    defaultLanguage: (initialSettings.defaultLanguage as string) ?? "ko",
    maxDailyPosts: (initialSettings.maxDailyPosts as number) ?? 10,
    cronEnabled: (initialSettings.cronEnabled as boolean) ?? true,
    alertEmail: (initialSettings.alertEmail as string) ?? "",
    slackWebhook: (initialSettings.slackWebhook as string) ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4 max-w-xl">
      <Card>
        <CardHeader><CardTitle className="text-sm">AI 설정</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">기본 모델</Label>
            <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={settings.defaultModel}
              onChange={(e) => setSettings((s) => ({ ...s, defaultModel: e.target.value }))}>
              {MODEL_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">기본 언어</Label>
            <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={settings.defaultLanguage}
              onChange={(e) => setSettings((s) => ({ ...s, defaultLanguage: e.target.value }))}>
              <option value="ko">한국어</option>
              <option value="en">English</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">일일 최대 발행 글 수</Label>
            <Input type="number" value={settings.maxDailyPosts} min={1} max={100}
              onChange={(e) => setSettings((s) => ({ ...s, maxDailyPosts: parseInt(e.target.value) || 10 }))} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">크론 & 자동화</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">자동 발행 크론</p>
              <p className="text-xs text-muted-foreground">매시간 사이트 발행 주기 확인</p>
            </div>
            <Switch checked={settings.cronEnabled} onCheckedChange={(v: boolean) => setSettings((s) => ({ ...s, cronEnabled: v }))} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">알림</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">알림 이메일</Label>
            <Input placeholder="admin@example.com" value={settings.alertEmail}
              onChange={(e) => setSettings((s) => ({ ...s, alertEmail: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Slack Webhook URL</Label>
            <Input placeholder="https://hooks.slack.com/..." value={settings.slackWebhook}
              onChange={(e) => setSettings((s) => ({ ...s, slackWebhook: e.target.value }))} />
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
