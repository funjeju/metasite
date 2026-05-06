import { AppShell } from "@/components/layout/AppShell";
import { QueueBoard } from "@/components/queue/QueueBoard";
import { requireAuth } from "@/lib/auth";

export default async function QueuePage() {
  await requireAuth();
  return (
    <AppShell title="발행 큐" description="전체 사이트 콘텐츠 발행 현황">
      <QueueBoard />
    </AppShell>
  );
}
