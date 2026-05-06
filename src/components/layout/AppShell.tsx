import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export function AppShell({ children, title, description }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="ml-60 flex flex-col min-h-screen">
        <TopBar title={title} description={description} />
        <main className="flex-1 p-6 max-w-8xl">
          {children}
        </main>
      </div>
    </div>
  );
}
