"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface TabDef {
  label: string;
  href: string;
  icon: React.ElementType;
}

export function SiteDetailTabs({ siteId, tabs }: { siteId: string; tabs: TabDef[] }) {
  const pathname = usePathname();

  return (
    <div className="flex gap-0 border-b overflow-x-auto">
      {tabs.map((tab) => {
        const href = tab.href ? `/sites/${siteId}${tab.href}` : `/sites/${siteId}`;
        const isActive = tab.href === ""
          ? pathname === `/sites/${siteId}`
          : pathname.startsWith(`/sites/${siteId}${tab.href}`);

        return (
          <Link
            key={tab.label}
            href={href}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm border-b-2 hover:text-foreground hover:border-border transition-colors whitespace-nowrap ${
              isActive ? "border-primary text-foreground" : "border-transparent text-muted-foreground"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
