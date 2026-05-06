import { AppShell } from "@/components/layout/AppShell";
import { SiteCreationWizard } from "@/components/site-creation/SiteCreationWizard";

export default function NewSitePage() {
  return (
    <AppShell title="새 사이트 생성" description="6단계 설정으로 자동 발행 사이트를 만드세요">
      <SiteCreationWizard />
    </AppShell>
  );
}
