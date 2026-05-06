"use client";

import { Bell, Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface TopBarProps {
  title?: string;
  description?: string;
}

export function TopBar({ title, description }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur px-6">
      {/* Title area */}
      <div className="flex-1 min-w-0">
        {title && (
          <div>
            <h1 className="text-sm font-semibold truncate">{title}</h1>
            {description && (
              <p className="text-xs text-muted-foreground truncate">{description}</p>
            )}
          </div>
        )}
      </div>

      {/* Search */}
      <button className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors w-52">
        <Search className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 text-left truncate">검색...</span>
        <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* New Site Button */}
      <Button asChild size="sm" className="gap-1.5">
        <Link href="/sites/new">
          <Plus className="h-3.5 w-3.5" />
          새 사이트
        </Link>
      </Button>

      {/* Notifications */}
      <Button variant="ghost" size="icon" className="relative h-8 w-8" asChild>
        <Link href="/alerts">
          <Bell className="h-4 w-4" />
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            3
          </span>
        </Link>
      </Button>
    </header>
  );
}
