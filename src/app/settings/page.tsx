import { requireAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { serialize } from "@/lib/serialize";
import { AppShell } from "@/components/layout/AppShell";
import { GlobalSettings } from "@/components/settings/GlobalSettings";

export default async function SettingsPage() {
  await requireAuth();

  const doc = await adminDb.collection("meta_sites").doc("default").get();
  const settings = doc.exists ? serialize(doc.data()!) : {};

  return (
    <AppShell title="전역 설정" description="META-SITE 시스템 전체 설정">
      <GlobalSettings initialSettings={settings} />
    </AppShell>
  );
}
