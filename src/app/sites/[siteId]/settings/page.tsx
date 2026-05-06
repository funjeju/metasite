import { requireAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { serialize } from "@/lib/serialize";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { SiteSettingsForm } from "@/components/settings/SiteSettingsForm";

export default async function SiteSettingsPage({ params }: { params: Promise<{ siteId: string }> }) {
  await requireAuth();
  const { siteId } = await params;

  const siteDoc = await adminDb.collection("child_sites").doc(siteId).get();
  if (!siteDoc.exists) notFound();
  const site = serialize(siteDoc.data()!);

  return (
    <AppShell title={`설정 — ${site.displayName ?? site.name ?? siteId}`} description="사이트 기본 설정">
      <SiteSettingsForm siteId={siteId} site={site} />
    </AppShell>
  );
}
