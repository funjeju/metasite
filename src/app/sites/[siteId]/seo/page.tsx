import { requireAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { serialize } from "@/lib/serialize";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { SiteSeoSettings } from "@/components/seo/SiteSeoSettings";

export default async function SiteSeoPage({ params }: { params: Promise<{ siteId: string }> }) {
  await requireAuth();
  const { siteId } = await params;

  const siteDoc = await adminDb.collection("child_sites").doc(siteId).get();
  if (!siteDoc.exists) notFound();
  const site = serialize(siteDoc.data()!);

  return (
    <AppShell title={`SEO — ${site.displayName ?? site.name ?? siteId}`} description="SEO 설정 및 Search Console 연동">
      <SiteSeoSettings siteId={siteId} site={site} />
    </AppShell>
  );
}
