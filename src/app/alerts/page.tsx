import { AppShell } from "@/components/layout/AppShell";
import { AlertList } from "@/components/alerts/AlertList";
import { requireAuth } from "@/lib/auth";

export default async function AlertsPage() {
  await requireAuth();
  return (
    <AppShell title="알림" description="시스템 상태 알림 및 오류 내역">
      <AlertList />
    </AppShell>
  );
}
