import { requireAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { serialize } from "@/lib/serialize";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { OutlineBoard } from "@/components/outline/OutlineBoard";

export default async function OutlinePage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  await requireAuth();
  const { siteId } = await params;

  const siteDoc = await adminDb.collection("child_sites").doc(siteId).get();
  if (!siteDoc.exists) notFound();
  const site = serialize(siteDoc.data()!);

  const outlineSnap = await adminDb
    .collection("sites")
    .doc(siteId)
    .collection("outline")
    .orderBy("seq", "asc")
    .get();

  const items = outlineSnap.docs.map((d) => serialize({ id: d.id, ...d.data() }));

  return (
    <AppShell
      title={`아웃라인 — ${site.displayName ?? site.name ?? siteId}`}
      description="Phase 1 권위 아웃라인 검토 및 발행 관리"
    >
      <OutlineBoard siteId={siteId} initialItems={items} />
    </AppShell>
  );
}
