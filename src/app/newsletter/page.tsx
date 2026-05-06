import { requireAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { serialize } from "@/lib/serialize";
import { AppShell } from "@/components/layout/AppShell";
import { NewsletterManager } from "@/components/newsletter/NewsletterManager";

export default async function NewsletterPage() {
  await requireAuth();

  const sitesSnap = await adminDb.collection("child_sites").where("status", "!=", "archived").get();
  const sites = sitesSnap.docs.map((d) => serialize({ id: d.id, ...d.data() }));

  // Count subscribers per site — stored under child_sites/{siteId}/newsletter_subscribers
  const subCounts: Record<string, number> = {};
  await Promise.all(
    sitesSnap.docs.map(async (siteDoc) => {
      const snap = await adminDb
        .collection("child_sites").doc(siteDoc.id)
        .collection("newsletter_subscribers")
        .where("status", "==", "active")
        .count()
        .get();
      subCounts[siteDoc.id] = snap.data().count;
    })
  );

  return (
    <AppShell title="뉴스레터" description="구독자 관리 및 발송 현황">
      <NewsletterManager sites={sites} subscriberCounts={subCounts} />
    </AppShell>
  );
}
