import { requireAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { serialize } from "@/lib/serialize";
import { AppShell } from "@/components/layout/AppShell";
import { PromptsManager } from "@/components/prompts/PromptsManager";

export default async function PromptsPage() {
  await requireAuth();

  const snap = await adminDb.collection("prompt_assets").orderBy("createdAt", "desc").get();
  const prompts = snap.docs.map((d) => serialize({ id: d.id, ...d.data() }));

  return (
    <AppShell title="프롬프트" description="AI 역할별 프롬프트 에셋 관리">
      <PromptsManager initialPrompts={prompts} />
    </AppShell>
  );
}
