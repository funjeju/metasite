import { adminDb } from "@/lib/firebase-admin";
import { serialize } from "@/lib/serialize";
import { notFound } from "next/navigation";
import { CheckCircle, XCircle } from "lucide-react";

export default async function UnsubscribePage({
  params,
  searchParams,
}: {
  params: Promise<{ siteId: string }>;
  searchParams: Promise<{ done?: string; email?: string; error?: string }>;
}) {
  const { siteId } = await params;
  const { done, email, error } = await searchParams;

  const doc = await adminDb.collection("child_sites").doc(siteId).get();
  if (!doc.exists) notFound();

  const site = serialize(doc.data()!) as Record<string, unknown>;
  const siteName = (site.displayName ?? site.name ?? siteId) as string;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center space-y-4">
        <h1 className="text-xl font-bold">{siteName}</h1>

        {done ? (
          <>
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <p className="font-medium">구독이 취소되었습니다.</p>
            {email && <p className="text-sm text-muted-foreground">{email}</p>}
            <p className="text-xs text-muted-foreground">더 이상 뉴스레터를 받지 않습니다.</p>
          </>
        ) : error ? (
          <>
            <XCircle className="h-12 w-12 text-red-500 mx-auto" />
            <p className="font-medium">잘못된 요청입니다.</p>
            <p className="text-sm text-muted-foreground">링크가 올바른지 확인해주세요.</p>
          </>
        ) : (
          <>
            <p className="text-muted-foreground text-sm">잘못된 접근입니다.</p>
          </>
        )}
      </div>
    </div>
  );
}
