import { adminDb } from "@/lib/firebase-admin";
import { serialize } from "@/lib/serialize";
import { notFound } from "next/navigation";
import { SubscribeForm } from "@/components/newsletter/SubscribeForm";

export default async function SubscribePage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const doc = await adminDb.collection("child_sites").doc(siteId).get();
  if (!doc.exists) notFound();

  const site = serialize(doc.data()!) as Record<string, unknown>;
  const newsletter = (site.newsletter as Record<string, unknown>) ?? {};
  if (!newsletter.enabled) notFound();

  const siteName = (site.displayName ?? site.name ?? siteId) as string;
  const domain = (site.seoConfig as { canonicalDomain?: string })?.canonicalDomain ?? "";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">{siteName}</h1>
          {domain && <p className="text-sm text-muted-foreground">{domain}</p>}
        </div>
        <SubscribeForm siteId={siteId} siteName={siteName} />
        <p className="text-center text-[11px] text-muted-foreground mt-6">
          구독 취소는 언제든지 이메일 하단 링크를 통해 가능합니다.
        </p>
      </div>
    </div>
  );
}
