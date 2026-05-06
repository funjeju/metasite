import { requireAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { serialize } from "@/lib/serialize";
import { AppShell } from "@/components/layout/AppShell";
import { MonetizationOverview } from "@/components/monetization/MonetizationOverview";

export default async function MonetizationPage() {
  await requireAuth();

  const sitesSnap = await adminDb.collection("child_sites").where("status", "!=", "archived").get();
  const sites = sitesSnap.docs.map((d) => serialize({ id: d.id, ...d.data() }));

  return (
    <AppShell title="수익화" description="애드센스·제휴마케팅 설정 및 수익 현황">
      <MonetizationOverview sites={sites} />
    </AppShell>
  );
}
