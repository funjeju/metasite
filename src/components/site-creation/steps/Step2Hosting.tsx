"use client";

import { useSiteCreationStore } from "@/store/useSiteCreationStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const HOSTING_OPTIONS = [
  {
    type: "nextjs" as const,
    label: "Next.js + Vercel",
    description: "독립 도메인, 최고 성능, 완전 제어. Vercel 프로젝트 자동 생성.",
    pros: ["독립 도메인", "SEO 최적화", "완전한 커스텀"],
    cons: ["Vercel 계정 필요", "설정 복잡"],
    badge: "추천",
    color: "border-purple-300 hover:border-purple-500",
    activeBorder: "border-purple-500 bg-purple-50",
  },
  {
    type: "tistory" as const,
    label: "Tistory",
    description: "국내 최대 블로그 플랫폼. API를 통해 자동 발행.",
    pros: ["무료", "국내 SEO 강점", "빠른 설정"],
    cons: ["도메인 제한", "커스텀 제한"],
    badge: "",
    color: "border-orange-200 hover:border-orange-400",
    activeBorder: "border-orange-400 bg-orange-50",
  },
  {
    type: "blogger" as const,
    label: "Blogger (Google)",
    description: "구글 블로거. Google API 통해 자동 발행. 영문 글로벌 대상.",
    pros: ["무료", "구글 도메인 신뢰도", "글로벌 노출"],
    cons: ["기능 제한", "한국어 SEO 약함"],
    badge: "",
    color: "border-blue-200 hover:border-blue-400",
    activeBorder: "border-blue-400 bg-blue-50",
  },
];

export function Step2Hosting() {
  const { data, updateData, setStep } = useSiteCreationStore();

  return (
    <Card>
      <CardHeader>
        <CardTitle>2단계: 호스팅 선택</CardTitle>
        <CardDescription>이 사이트를 어떤 플랫폼에 발행할지 선택하세요</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {HOSTING_OPTIONS.map((option) => (
            <button
              key={option.type}
              type="button"
              onClick={() => updateData({ hostingType: option.type })}
              className={cn(
                "w-full text-left rounded-xl border-2 p-4 transition-all",
                data.hostingType === option.type
                  ? option.activeBorder
                  : option.color + " bg-background"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{option.label}</span>
                    {option.badge && (
                      <span className="rounded-full bg-purple-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                        {option.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{option.description}</p>
                  <div className="flex gap-4 mt-2">
                    <ul className="space-y-0.5">
                      {option.pros.map((p) => (
                        <li key={p} className="flex items-center gap-1 text-[11px] text-green-600">
                          <span>✓</span> {p}
                        </li>
                      ))}
                    </ul>
                    <ul className="space-y-0.5">
                      {option.cons.map((c) => (
                        <li key={c} className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <span>·</span> {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div
                  className={cn(
                    "ml-3 mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 transition-all",
                    data.hostingType === option.type
                      ? "border-primary bg-primary"
                      : "border-border"
                  )}
                >
                  {data.hostingType === option.type && (
                    <div className="flex h-full w-full items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-white" />
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setStep(1)}>
            ← 이전
          </Button>
          <Button
            onClick={() => setStep(3)}
            disabled={!data.hostingType}
          >
            다음: 셋업 →
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
