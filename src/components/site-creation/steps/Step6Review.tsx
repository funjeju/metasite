"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSiteCreationStore } from "@/store/useSiteCreationStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, Zap, AlertCircle } from "lucide-react";

const PERSONA_LABEL: Record<string, string> = {
  friendly_expert: "친근한 전문가",
  data_journalist: "데이터 저널리스트",
  storyteller: "스토리텔러",
  critic: "날카로운 비평가",
  curator: "큐레이터",
};

const TONE_LABEL: Record<string, string> = {
  friendly: "친근하고 따뜻한",
  professional: "전문적이고 격식있는",
  casual: "가볍고 편안한",
  academic: "학술적이고 심층적인",
  news: "뉴스 기사체",
};

const FREQ_LABEL: Record<string, string> = {
  daily: "매일",
  thrice_weekly: "주 3회",
  weekly: "주 1회",
};

const HOSTING_LABEL: Record<string, string> = {
  nextjs: "Next.js + Vercel",
  tistory: "Tistory",
  blogger: "Blogger",
};

export function Step6Review() {
  const { data, setStep, reset } = useSiteCreationStore();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "사이트 생성에 실패했습니다");
        setCreating(false);
        return;
      }

      setDone(true);
      setTimeout(() => {
        reset();
        router.push(`/sites/${json.siteId}`);
        router.refresh();
      }, 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "네트워크 오류가 발생했습니다");
      setCreating(false);
    }
  };

  if (done) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-lg font-bold mb-1">사이트 생성 완료!</h3>
          <p className="text-sm text-muted-foreground">{data.name} 설정 페이지로 이동합니다...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>6단계: 검토 및 생성</CardTitle>
        <CardDescription>설정을 확인하고 사이트를 생성합니다</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        {/* 요약 */}
        <div className="rounded-xl border divide-y">
          {[
            { label: "사이트 이름", value: data.name },
            { label: "사이트 ID", value: data.siteId, mono: true },
            { label: "토픽 / 언어", value: `${data.topic} / ${data.language.toUpperCase()}` },
            { label: "호스팅", value: HOSTING_LABEL[data.hostingType] || data.hostingType },
            ...(data.domain ? [{ label: "도메인", value: data.domain, mono: true }] : []),
            { label: "페르소나", value: PERSONA_LABEL[data.persona] || data.persona },
            { label: "톤", value: TONE_LABEL[data.tone] || data.tone },
          ].map((row) => (
            <div key={row.label} className="flex justify-between items-center px-4 py-3">
              <span className="text-sm text-muted-foreground">{row.label}</span>
              <span className={`text-sm font-medium ${row.mono ? "font-mono" : ""}`}>{row.value}</span>
            </div>
          ))}
          <div className="flex justify-between items-start px-4 py-3">
            <span className="text-sm text-muted-foreground">섹션</span>
            <div className="flex flex-wrap gap-1.5 justify-end">
              {data.sections.filter((s) => s.enabled).map((s) => (
                <Badge key={s.slug} variant="secondary" className="text-[10px]">
                  {s.name} ({FREQ_LABEL[s.publishFrequency]})
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex justify-between items-center px-4 py-3">
            <span className="text-sm text-muted-foreground">시작 단계</span>
            <Badge variant={data.phase === "authority" ? "authority" : "ongoing"} className="text-xs">
              {data.phase === "authority" ? "Phase 1: 권위 구축" : "Phase 2: 즉시 발행"}
            </Badge>
          </div>
          <div className="flex justify-between items-center px-4 py-3">
            <span className="text-sm text-muted-foreground">출처</span>
            <span className="text-sm">{data.sourceUrls.length}개 등록</span>
          </div>
        </div>

        {/* 자동 처리 안내 */}
        <div className="rounded-lg bg-purple-50 border border-purple-200 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-purple-600" />
            <p className="text-sm font-medium text-purple-700">자동으로 처리됩니다</p>
          </div>
          <ul className="text-xs text-purple-600 space-y-0.5 list-disc list-inside">
            <li>Firestore child_sites 문서 생성</li>
            {data.hostingType === "nextjs" && <li>Vercel 프로젝트 생성 + 환경변수 주입</li>}
            <li>섹션 초기화</li>
            {data.phase === "authority" && <li>권위 아웃라인 (28~42편 목차) AI 생성 준비</li>}
            {data.sourceUrls.length === 0 && <li>토픽 기반 출처 자동 제안</li>}
          </ul>
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setStep(5)} disabled={creating}>
            ← 이전
          </Button>
          <Button onClick={handleCreate} disabled={creating} className="min-w-28">
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                생성 중...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-1.5" />
                사이트 생성
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
