import { requireAuth } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { CostsDashboard } from "@/components/costs/CostsDashboard";

export default async function CostsPage() {
  await requireAuth();

  return (
    <AppShell title="비용" description="AI API 사용 비용 추적">
      <CostsDashboard />
    </AppShell>
  );
}
