"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Loader2, CheckCircle, AlertCircle } from "lucide-react";

export function SubscribeForm({ siteId, siteName }: { siteId: string; siteName: string }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/subscribe/${siteId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, action: "subscribe" }),
      });
      const data = await res.json() as { ok?: boolean; message?: string; error?: string };
      setResult({ ok: !!data.ok, message: data.message ?? data.error ?? "오류가 발생했습니다." });
    } finally {
      setLoading(false);
    }
  };

  if (result?.ok) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-3" />
          <p className="font-medium">{result.message}</p>
          <p className="text-sm text-muted-foreground mt-1">{email}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Mail className="h-5 w-5" />
          뉴스레터 구독
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          {siteName}의 최신 글을 이메일로 받아보세요. 주 1회 발송됩니다.
        </p>
        <form onSubmit={subscribe} className="space-y-3">
          <Input
            type="email"
            placeholder="이메일 주소"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
          {result && !result.ok && (
            <div className="flex items-center gap-2 text-sm text-red-500">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {result.message}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading || !email}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {loading ? "처리 중..." : "무료로 구독하기"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
