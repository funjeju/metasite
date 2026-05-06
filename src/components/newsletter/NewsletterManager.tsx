"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Send, Loader2, Check } from "lucide-react";
import Link from "next/link";

interface Site { id: string; displayName?: string; name?: string; newsletter?: { enabled?: boolean; lastSentAt?: string; lastSentCount?: number } }

export function NewsletterManager({ sites, subscriberCounts }: { sites: Record<string, unknown>[]; subscriberCounts: Record<string, number> }) {
  const siteList = sites as unknown as Site[];
  const totalSubs = Object.values(subscriberCounts).reduce((a, b) => a + b, 0);
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<Record<string, number | null>>({});

  const sendNow = async (siteId: string) => {
    setSending(siteId);
    try {
      const res = await fetch(`/api/sites/${siteId}/newsletter/send`, { method: "POST" });
      const data = await res.json() as { sent?: number };
      setSent((prev) => ({ ...prev, [siteId]: data.sent ?? 0 }));
      setTimeout(() => setSent((prev) => ({ ...prev, [siteId]: null })), 3000);
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">총 구독자</p><p className="text-2xl font-bold mt-1">{totalSubs}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">뉴스레터 운영 사이트</p><p className="text-2xl font-bold mt-1">{siteList.filter((s) => s.newsletter?.enabled).length}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">사이트별 구독자</CardTitle></CardHeader>
        <CardContent className="p-0">
          {siteList.length === 0 ? (
            <div className="flex flex-col items-center py-12"><Mail className="h-8 w-8 text-muted-foreground mb-3" /><p className="text-sm text-muted-foreground">운영 중인 사이트가 없습니다</p></div>
          ) : (
            <div className="divide-y">
              {siteList.map((site) => {
                const count = subscriberCounts[site.id] ?? 0;
                const isSending = sending === site.id;
                const wasSent = sent[site.id];
                return (
                  <div key={site.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{site.displayName ?? site.name ?? site.id}</p>
                      <p className="text-xs text-muted-foreground">{site.id}</p>
                      {site.newsletter?.lastSentAt && (
                        <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                          최근 발송: {new Date(site.newsletter.lastSentAt).toLocaleDateString("ko-KR")} ({site.newsletter.lastSentCount ?? 0}명)
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{count}명</Badge>
                      {site.newsletter?.enabled ? (
                        <Badge className="text-[10px] bg-green-100 text-green-700">활성</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">비활성</Badge>
                      )}
                      {count > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => sendNow(site.id)}
                          disabled={isSending}
                        >
                          {isSending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : wasSent !== null && wasSent !== undefined ? <Check className="h-3 w-3 mr-1 text-green-500" /> : <Send className="h-3 w-3 mr-1" />}
                          {wasSent !== null && wasSent !== undefined ? `${wasSent}명 발송됨` : "발송"}
                        </Button>
                      )}
                      <Link href={`/sites/${site.id}/settings`} className="text-xs text-muted-foreground hover:text-foreground">설정 →</Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
