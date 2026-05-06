"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSiteCreationStore } from "@/store/useSiteCreationStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/lib/utils";
import { Sparkles, Loader2, X, Check } from "lucide-react";

const TOPIC_PRESETS = ["ai", "travel", "finance", "health", "tech", "food", "beauty", "sports", "education", "lifestyle", "기타"];
const LANGUAGES = [
  { code: "ko", label: "한국어" },
  { code: "en", label: "English" },
  { code: "ja", label: "日本語" },
  { code: "zh", label: "中文" },
];

const schema = z.object({
  name: z.string().min(1, "필수 입력").max(64),
  siteId: z
    .string()
    .min(2, "최소 2자")
    .max(32, "최대 32자")
    .regex(/^[a-z0-9-]+$/, "소문자, 숫자, 하이픈만 가능"),
  topic: z.string().min(1, "필수 선택"),
  language: z.string().min(1),
  description: z.string().max(200).optional(),
});

type FormData = z.infer<typeof schema>;

interface SeoSuggestion {
  metaTitle: string;
  description: string;
  keywords: string[];
  sectionSuggestions: { name: string; slug: string }[];
}

export function Step1Identity() {
  const { data, updateData, setStep } = useSiteCreationStore();
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<SeoSuggestion | null>(null);
  const [activeKeywords, setActiveKeywords] = useState<string[]>(data.keywords ?? []);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: data.name,
      siteId: data.siteId,
      topic: data.topic,
      language: data.language,
      description: data.description,
    },
  });

  const nameValue = watch("name");
  const topicValue = watch("topic");
  const languageValue = watch("language");
  const descriptionValue = watch("description");

  useEffect(() => {
    if (nameValue && !data.siteId) {
      setValue("siteId", slugify(nameValue));
    }
  }, [nameValue, data.siteId, setValue]);

  const canSuggest = !!(nameValue?.trim() && topicValue && languageValue);

  const handleSuggest = async () => {
    if (!canSuggest) return;
    setSuggesting(true);
    setSuggestion(null);
    try {
      const res = await fetch("/api/ai/seo-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nameValue,
          topic: topicValue,
          language: languageValue,
          description: descriptionValue,
        }),
      });
      if (res.ok) {
        const data = await res.json() as SeoSuggestion;
        setSuggestion(data);
        // Auto-apply description
        setValue("description", data.description);
        setActiveKeywords(data.keywords);
      }
    } finally {
      setSuggesting(false);
    }
  };

  const toggleKeyword = (kw: string) => {
    setActiveKeywords((prev) =>
      prev.includes(kw) ? prev.filter((k) => k !== kw) : [...prev, kw]
    );
  };

  const onSubmit = (values: FormData) => {
    updateData({
      ...values,
      keywords: activeKeywords,
      metaTitle: suggestion?.metaTitle ?? data.metaTitle ?? "",
    });
    setStep(2);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>1단계: 사이트 정체성</CardTitle>
        <CardDescription>이 사이트가 무엇을 다루는지 정의합니다</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="name">
              사이트 이름 <span className="text-red-500">*</span>
            </Label>
            <Input id="name" placeholder="예: Travel KR" {...register("name")} />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="siteId">
              사이트 ID (slug) <span className="text-red-500">*</span>
            </Label>
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-muted-foreground shrink-0">sites/</span>
              <Input id="siteId" placeholder="travel-kr" className="font-mono" {...register("siteId")} />
            </div>
            {errors.siteId && <p className="text-xs text-red-500">{errors.siteId.message}</p>}
            <p className="text-[11px] text-muted-foreground">소문자, 숫자, 하이픈만 사용. 생성 후 변경 불가.</p>
          </div>

          <div className="space-y-1.5">
            <Label>
              토픽 <span className="text-red-500">*</span>
            </Label>
            <div className="flex flex-wrap gap-2">
              {TOPIC_PRESETS.map((t) => {
                const current = watch("topic");
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setValue("topic", t)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                      current === t
                        ? "border-primary bg-primary text-white"
                        : "border-border hover:border-primary hover:text-primary"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
            {errors.topic && <p className="text-xs text-red-500">{errors.topic.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>
              언어 <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-2">
              {LANGUAGES.map((lang) => {
                const current = watch("language");
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setValue("language", lang.code)}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                      current === lang.code
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary"
                    }`}
                  >
                    {lang.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* AI SEO 추천 버튼 */}
          <div className="rounded-xl border border-dashed border-purple-200 bg-purple-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI SEO 최적화 추천
                </p>
                <p className="text-[11px] text-purple-500 mt-0.5">
                  {canSuggest ? "사이트 정보 기반으로 SEO 콘텐츠를 자동 생성합니다" : "사이트 이름, 토픽, 언어를 먼저 선택해 주세요"}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-purple-300 text-purple-700 hover:bg-purple-100 hover:border-purple-400 shrink-0"
                disabled={!canSuggest || suggesting}
                onClick={handleSuggest}
              >
                {suggesting ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />분석 중...</>
                ) : (
                  <><Sparkles className="h-3.5 w-3.5 mr-1.5" />AI 추천 받기</>
                )}
              </Button>
            </div>

            {suggestion && (
              <div className="space-y-3 pt-2 border-t border-purple-200">
                {/* Meta Title */}
                <div className="space-y-1">
                  <p className="text-[11px] font-medium text-purple-600 uppercase tracking-wide">메타 타이틀</p>
                  <div className="flex items-start gap-2 rounded-lg bg-white border border-purple-100 px-3 py-2">
                    <p className="text-xs flex-1 text-foreground">{suggestion.metaTitle}</p>
                    <span className="text-[10px] text-muted-foreground shrink-0">{suggestion.metaTitle.length}자</span>
                  </div>
                </div>

                {/* Section Suggestions */}
                {suggestion.sectionSuggestions?.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium text-purple-600 uppercase tracking-wide">추천 섹션 구성</p>
                    <div className="flex flex-wrap gap-1.5">
                      {suggestion.sectionSuggestions.map((s) => (
                        <span
                          key={s.slug}
                          className="inline-flex items-center gap-1 rounded-full bg-white border border-purple-100 px-2.5 py-0.5 text-[11px] text-foreground"
                        >
                          {s.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 설명문 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="description">한 줄 소개 (SEO 메타 설명)</Label>
              {suggestion && (
                <button
                  type="button"
                  className="text-[11px] text-purple-600 hover:text-purple-700 flex items-center gap-0.5"
                  onClick={() => setValue("description", suggestion.description)}
                >
                  <Check className="h-3 w-3" />AI 추천 적용
                </button>
              )}
            </div>
            <Textarea
              id="description"
              placeholder="이 사이트에 대한 짧은 설명 (SEO 메타 설명에 사용됩니다)"
              rows={2}
              {...register("description")}
            />
            <p className="text-[11px] text-muted-foreground text-right">
              {watch("description")?.length ?? 0}/200
            </p>
          </div>

          {/* 키워드 */}
          {activeKeywords.length > 0 && (
            <div className="space-y-1.5">
              <Label>
                타겟 키워드
                <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">클릭해서 제외</span>
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {activeKeywords.map((kw) => (
                  <button
                    key={kw}
                    type="button"
                    onClick={() => toggleKeyword(kw)}
                    className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    {kw}
                    <X className="h-2.5 w-2.5" />
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">{activeKeywords.length}개 선택됨 · 글 생성 시 SEO 최적화에 활용됩니다</p>
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit">다음: 호스팅 선택 →</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
