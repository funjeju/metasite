import { requireAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { serialize } from "@/lib/serialize";
import { AppShell } from "@/components/layout/AppShell";
import { GlobalSearch } from "@/components/search/GlobalSearch";

export default async function SearchPage() {
  await requireAuth();

  const sitesSnap = await adminDb.collection("child_sites").where("status", "==", "active").get();
  const sites = sitesSnap.docs.map((d) => serialize({ id: d.id, ...d.data() }));

  return (
    <AppShell title="글 검색" description="전체 사이트 통합 검색">
      <GlobalSearch sites={sites} />
    </AppShell>
  );
}
