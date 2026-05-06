import { requireAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { serialize } from "@/lib/serialize";
import { AppShell } from "@/components/layout/AppShell";
import { SeoOverview } from "@/components/seo/SeoOverview";

export default async function SeoPage() {
  await requireAuth();

  const sitesSnap = await adminDb.collection("child_sites").where("status", "!=", "archived").get();
  const sites = sitesSnap.docs.map((d) => serialize({ id: d.id, ...d.data() }));

  return (
    <AppShell title="SEO" description="전체 사이트 SEO 현황 및 설정">
      <SeoOverview sites={sites} />
    </AppShell>
  );
}
