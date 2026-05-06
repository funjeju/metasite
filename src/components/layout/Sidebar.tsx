"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Globe,
  FileStack,
  BookOpen,
  PenLine,
  Rss,
  Users,
  BarChart3,
  Bell,
  Settings,
  DollarSign,
  Mail,
  AlertTriangle,
  Zap,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "개요",
    items: [
      { label: "대시보드", href: "/", icon: LayoutDashboard },
      { label: "사이트 목록", href: "/sites", icon: Globe },
      { label: "알림", href: "/alerts", icon: Bell },
    ],
  },
  {
    title: "콘텐츠",
    items: [
      { label: "발행 큐", href: "/queue", icon: FileStack },
      { label: "아웃라인", href: "/outline", icon: BookOpen },
      { label: "발행된 글", href: "/posts", icon: PenLine },
      { label: "출처 관리", href: "/sources", icon: Rss },
    ],
  },
  {
    title: "설정",
    items: [
      { label: "페르소나", href: "/personas", icon: Users },
      { label: "프롬프트", href: "/prompts", icon: Sparkles },
      { label: "SEO", href: "/seo", icon: BarChart3 },
      { label: "수익화", href: "/monetization", icon: DollarSign },
      { label: "뉴스레터", href: "/newsletter", icon: Mail },
    ],
  },
  {
    title: "시스템",
    items: [
      { label: "분석", href: "/analytics", icon: BarChart3 },
      { label: "비용", href: "/costs", icon: DollarSign },
      { label: "실패 작업", href: "/failed-jobs", icon: AlertTriangle },
      { label: "전역 설정", href: "/settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <TooltipProvider delayDuration={0}>
      <aside className="fixed left-0 top-0 h-screen w-60 flex flex-col bg-[hsl(var(--sidebar-background))] border-r border-[hsl(var(--sidebar-border))] z-40">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[hsl(var(--sidebar-border))]">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-600">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-none">META-SITE</p>
            <p className="text-[10px] text-[hsl(var(--sidebar-foreground))]/50 leading-none mt-0.5">
              AI 자동 발행 시스템
            </p>
          </div>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-2">
          <nav className="px-2 space-y-4">
            {NAV_GROUPS.map((group) => (
              <div key={group.title}>
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-[hsl(var(--sidebar-foreground))]/40">
                  {group.title}
                </p>
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive =
                      item.href === "/"
                        ? pathname === "/"
                        : pathname.startsWith(item.href);
                    return (
                      <li key={item.href}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link
                              href={item.href}
                              className={cn(
                                "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-150",
                                isActive
                                  ? "bg-purple-600 text-white sidebar-active-glow"
                                  : "text-[hsl(var(--sidebar-foreground))]/70 hover:bg-[hsl(var(--sidebar-accent))] hover:text-white"
                              )}
                            >
                              <item.icon
                                className={cn(
                                  "h-4 w-4 shrink-0 transition-colors",
                                  isActive
                                    ? "text-white"
                                    : "text-[hsl(var(--sidebar-foreground))]/50 group-hover:text-white"
                                )}
                              />
                              <span className="flex-1 truncate">{item.label}</span>
                              {item.badge && (
                                <span className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 text-[10px] font-medium">
                                  {item.badge}
                                </span>
                              )}
                              {isActive && (
                                <ChevronRight className="h-3.5 w-3.5 text-white/60" />
                              )}
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            {item.label}
                          </TooltipContent>
                        </Tooltip>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-[hsl(var(--sidebar-border))] p-4">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-full bg-purple-600 flex items-center justify-center">
              <span className="text-xs font-bold text-white">A</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">Admin</p>
              <p className="text-[10px] text-[hsl(var(--sidebar-foreground))]/50 truncate">
                운영자
              </p>
            </div>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
