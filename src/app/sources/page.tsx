import { requireAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { serialize } from "@/lib/serialize";
import { AppShell } from "@/components/layout/AppShell";
import { SourcesManager } from "@/components/sources/SourcesManager";

export default async function SourcesPage() {
  await requireAuth();

  const sitesSnap = await adminDb.collection("child_sites").where("status", "!=", "archived").get();
  const sites = sitesSnap.docs.map((d) => serialize({ id: d.id, ...d.data() }));

  const sourceArrays = await Promise.all(
    sitesSnap.docs.map(async (siteDoc) => {
      const snap = await adminDb.collection("sites").doc(siteDoc.id).collection("sources").orderBy("createdAt", "desc").get();
      return snap.docs.map((d) => serialize({ id: d.id, siteId: siteDoc.id, siteName: siteDoc.data().displayName ?? siteDoc.id, ...d.data() }));
    })
  );

  const sources = sourceArrays.flat();

  return (
    <AppShell title="출처 관리" description="RSS 피드 및 콘텐츠 출처 전체 관리">
      <SourcesManager initialSources={sources} sites={sites} />
    </AppShell>
  );
}
