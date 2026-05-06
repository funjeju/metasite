"use client";

import { useEffect } from "react";
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

export function Step1Identity() {
  const { data, updateData, setStep } = useSiteCreationStore();

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
  useEffect(() => {
    if (nameValue && !data.siteId) {
      setValue("siteId", slugify(nameValue));
    }
  }, [nameValue, data.siteId, setValue]);

  const onSubmit = (values: FormData) => {
    updateData(values);
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
            <Input
              id="name"
              placeholder="예: Travel KR"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="siteId">
              사이트 ID (slug) <span className="text-red-500">*</span>
            </Label>
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-muted-foreground shrink-0">sites/</span>
              <Input
                id="siteId"
                placeholder="travel-kr"
                className="font-mono"
                {...register("siteId")}
              />
            </div>
            {errors.siteId && (
              <p className="text-xs text-red-500">{errors.siteId.message}</p>
            )}
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
            {errors.topic && (
              <p className="text-xs text-red-500">{errors.topic.message}</p>
            )}
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

          <div className="space-y-1.5">
            <Label htmlFor="description">한 줄 소개 (선택)</Label>
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

          <div className="flex justify-end">
            <Button type="submit">
              다음: 호스팅 선택 →
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
