import { requireAuth } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { FailedJobsList } from "@/components/failed-jobs/FailedJobsList";

export default async function FailedJobsPage() {
  await requireAuth();

  return (
    <AppShell title="실패 작업" description="발행 실패 항목 재시도 및 관리">
      <FailedJobsList />
    </AppShell>
  );
}
