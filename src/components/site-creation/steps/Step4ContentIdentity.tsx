"use client";

import { useSiteCreationStore } from "@/store/useSiteCreationStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PERSONAS = [
  { id: "friendly_expert", label: "친근한 전문가", desc: "전문 지식을 쉽게 설명" },
  { id: "data_journalist", label: "데이터 저널리스트", desc: "수치와 근거 중심" },
  { id: "storyteller", label: "스토리텔러", desc: "감성적이고 몰입감 있는 글" },
  { id: "critic", label: "날카로운 비평가", desc: "객관적 분석과 평가" },
  { id: "curator", label: "큐레이터", desc: "최고의 정보만 엄선" },
];

const TONES = [
  { id: "friendly", label: "친근하고 따뜻한" },
  { id: "professional", label: "전문적이고 격식있는" },
  { id: "casual", label: "가볍고 편안한" },
  { id: "academic", label: "학술적이고 심층적인" },
  { id: "news", label: "뉴스 기사체" },
];

const FREQ_OPTIONS = [
  { id: "daily", label: "매일" },
  { id: "thrice_weekly", label: "주 3회" },
  { id: "weekly", label: "주 1회" },
];

export function Step4ContentIdentity() {
  const { data, updateData, setStep } = useSiteCreationStore();

  const toggleSection = (idx: number) => {
    const updated = data.sections.map((s, i) =>
      i === idx ? { ...s, enabled: !s.enabled } : s
    );
    updateData({ sections: updated });
  };

  const updateSectionFreq = (idx: number, freq: string) => {
    const updated = data.sections.map((s, i) =>
      i === idx ? { ...s, publishFrequency: freq } : s
    );
    updateData({ sections: updated });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>4단계: 콘텐츠 정체성</CardTitle>
        <CardDescription>AI 작성자의 성격과 발행 섹션을 설정합니다</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Persona */}
        <div className="space-y-2">
          <p className="text-sm font-medium">AI 페르소나</p>
          <div className="grid grid-cols-1 gap-2">
            {PERSONAS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => updateData({ persona: p.id })}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-3 text-left transition-all",
                  data.persona === p.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <div
                  className={cn(
                    "h-4 w-4 shrink-0 rounded-full border-2",
                    data.persona === p.id
                      ? "border-primary bg-primary"
                      : "border-border"
                  )}
                />
                <div>
                  <p className="text-sm font-medium">{p.label}</p>
                  <p className="text-xs text-muted-foreground">{p.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Tone */}
        <div className="space-y-2">
          <p className="text-sm font-medium">글 톤</p>
          <div className="flex flex-wrap gap-2">
            {TONES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => updateData({ tone: t.id })}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-all",
                  data.tone === t.id
                    ? "border-primary bg-primary text-white"
                    : "border-border hover:border-primary hover:text-primary"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-2">
          <p className="text-sm font-medium">섹션 구성 (AI 자동 제안)</p>
          <div className="space-y-2">
            {data.sections.map((section, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-3 transition-all",
                  section.enabled ? "border-border" : "border-border/50 opacity-60"
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleSection(idx)}
                  className={cn(
                    "h-5 w-5 shrink-0 rounded border-2 transition-all flex items-center justify-center",
                    section.enabled ? "border-primary bg-primary" : "border-border"
                  )}
                >
                  {section.enabled && <span className="text-white text-[10px]">✓</span>}
                </button>
                <span className="flex-1 text-sm font-medium">{section.name}</span>
                <div className="flex gap-1">
                  {FREQ_OPTIONS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      disabled={!section.enabled}
                      onClick={() => updateSectionFreq(idx, f.id)}
                      className={cn(
                        "rounded px-2 py-0.5 text-[10px] font-medium border transition-all",
                        section.publishFrequency === f.id && section.enabled
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">섹션은 나중에 추가/수정할 수 있습니다</p>
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setStep(3)}>← 이전</Button>
          <Button onClick={() => setStep(5)}>다음: 출처 + Phase →</Button>
        </div>
      </CardContent>
    </Card>
  );
}
