import { requireAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { serialize } from "@/lib/serialize";
import { AppShell } from "@/components/layout/AppShell";
import { GlobalOutlineBoard } from "@/components/outline/GlobalOutlineBoard";

export default async function OutlinePage() {
  await requireAuth();

  const sitesSnap = await adminDb.collection("child_sites").where("status", "!=", "archived").get();

  // Fetch outlines for all sites in parallel
  const siteOutlines = await Promise.all(
    sitesSnap.docs.map(async (siteDoc) => {
      const site = serialize({ id: siteDoc.id, ...siteDoc.data() }) as Record<string, unknown>;
      const outlineSnap = await adminDb
        .collection("sites").doc(siteDoc.id).collection("outline")
        .orderBy("seq", "asc")
        .get();
      const items = outlineSnap.docs.map((d) => serialize({ id: d.id, ...d.data() }));
      return { site, items };
    })
  );

  return (
    <AppShell title="아웃라인" description="전체 사이트 아웃라인 현황">
      <GlobalOutlineBoard siteOutlines={siteOutlines} />
    </AppShell>
  );
}
