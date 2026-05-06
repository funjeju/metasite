import { requireAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { serialize } from "@/lib/serialize";
import { AppShell } from "@/components/layout/AppShell";
import { PersonasManager } from "@/components/personas/PersonasManager";

export default async function PersonasPage() {
  await requireAuth();

  const snap = await adminDb.collection("personas").orderBy("createdAt", "desc").get();
  const personas = snap.docs.map((d) => serialize({ id: d.id, ...d.data() }));

  return (
    <AppShell title="페르소나" description="AI 작성자 페르소나 관리">
      <PersonasManager initialPersonas={personas} />
    </AppShell>
  );
}
