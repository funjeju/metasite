"use client";

import { useForm } from "react-hook-form";
import { useSiteCreationStore } from "@/store/useSiteCreationStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function Step3HostingSetup() {
  const { data, updateData, setStep } = useSiteCreationStore();
  const { register, handleSubmit } = useForm({
    defaultValues: {
      domain: data.domain,
      vercelProjectId: data.vercelProjectId,
      tistoryBlogName: data.tistoryBlogName,
      tistoryBlogUrl: data.tistoryBlogUrl,
      bloggerBlogId: data.bloggerBlogId,
      bloggerBlogUrl: data.bloggerBlogUrl,
    },
  });

  const onSubmit = (values: Record<string, string>) => {
    updateData(values);
    setStep(4);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>3단계: 호스팅 셋업</CardTitle>
        <CardDescription>
          {data.hostingType === "nextjs"
            ? "Vercel 프로젝트와 도메인을 연결합니다"
            : data.hostingType === "tistory"
            ? "Tistory 블로그 정보를 입력합니다"
            : "Blogger 블로그 정보를 입력합니다"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {data.hostingType === "nextjs" && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="domain">도메인 <span className="text-red-500">*</span></Label>
                <Input
                  id="domain"
                  placeholder="travel-kr.com"
                  {...register("domain", { required: true })}
                />
                <p className="text-[11px] text-muted-foreground">DNS A 레코드를 Vercel IP로 설정해두세요</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vercelProjectId">Vercel 프로젝트 ID</Label>
                <Input
                  id="vercelProjectId"
                  placeholder="prj_xxxxxxxxxxxx (없으면 자동 생성)"
                  className="font-mono text-xs"
                  {...register("vercelProjectId")}
                />
              </div>
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-700 space-y-1">
                <p className="font-medium">자동으로 처리됩니다:</p>
                <ul className="text-xs space-y-0.5 list-disc list-inside">
                  <li>Vercel 프로젝트 생성 및 도메인 연결</li>
                  <li>Firebase 환경변수 자동 주입</li>
                  <li>Cron Job 자동 등록</li>
                  <li>sitemap.xml, robots.txt 초기 생성</li>
                </ul>
              </div>
            </>
          )}

          {data.hostingType === "tistory" && (
            <>
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700 mb-2">
                <p className="font-medium mb-1">사전 준비:</p>
                <p className="text-xs">Tistory 개발자 센터에서 앱 등록 후 Access Token을 발급받으세요</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tistoryBlogName">블로그 이름 <span className="text-red-500">*</span></Label>
                <Input
                  id="tistoryBlogName"
                  placeholder="myblog (URL의 subdomain)"
                  {...register("tistoryBlogName", { required: true })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tistoryBlogUrl">블로그 URL <span className="text-red-500">*</span></Label>
                <Input
                  id="tistoryBlogUrl"
                  placeholder="https://myblog.tistory.com"
                  {...register("tistoryBlogUrl", { required: true })}
                />
              </div>
            </>
          )}

          {data.hostingType === "blogger" && (
            <>
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-700 mb-2">
                <p className="font-medium mb-1">사전 준비:</p>
                <p className="text-xs">Google Cloud Console에서 Blogger API를 활성화하고 서비스 계정을 만드세요</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bloggerBlogId">블로그 ID <span className="text-red-500">*</span></Label>
                <Input
                  id="bloggerBlogId"
                  placeholder="1234567890123456789"
                  className="font-mono text-xs"
                  {...register("bloggerBlogId", { required: true })}
                />
                <p className="text-[11px] text-muted-foreground">Blogger 대시보드 URL에서 확인</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bloggerBlogUrl">블로그 URL <span className="text-red-500">*</span></Label>
                <Input
                  id="bloggerBlogUrl"
                  placeholder="https://myblog.blogspot.com"
                  {...register("bloggerBlogUrl", { required: true })}
                />
              </div>
            </>
          )}

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => setStep(2)}>
              ← 이전
            </Button>
            <Button type="submit">다음: 콘텐츠 정체성 →</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
