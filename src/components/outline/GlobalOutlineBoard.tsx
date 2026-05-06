"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface OutlineItem {
  id: string;
  seq: number;
  title: string;
  slug: string;
  targetKeyword: string;
  status: "pending" | "approved" | "rejected" | "published";
}

interface Site {
  id: string;
  displayName?: string;
  name?: string;
  currentPhase?: string;
}

interface SiteOutline {
  site: Record<string, unknown>;
  items: Record<string, unknown>[];
}

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-slate-100 text-slate-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-600",
  published: "bg-purple-100 text-purple-700",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "대기",
  approved: "승인",
  rejected: "거절",
  published: "발행",
};

export function GlobalOutlineBoard({ siteOutlines }: { siteOutlines: SiteOutline[] }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    Object.fromEntries(siteOutlines.map((s) => [(s.site as unknown as Site).id, true]))
  );

  const totalItems = siteOutlines.reduce((s, o) => s + o.items.length, 0);
  const totalApproved = siteOutlines.reduce((s, o) => s + (o.items as unknown as OutlineItem[]).filter((i) => i.status === "approved").length, 0);
  const totalPublished = siteOutlines.reduce((s, o) => s + (o.items as unknown as OutlineItem[]).filter((i) => i.status === "published").length, 0);

  if (siteOutlines.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-16">
          <BookOpen className="h-10 w-10 text-muted-foreground mb-4" />
          <p className="font-medium">아웃라인이 없습니다</p>
          <p className="text-sm text-muted-foreground mt-1">사이트를 먼저 생성하고 아웃라인을 추가하세요</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">총 아웃라인</p><p className="text-2xl font-bold mt-1">{totalItems}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">승인됨</p><p className="text-2xl font-bold mt-1 text-green-600">{totalApproved}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">발행됨</p><p className="text-2xl font-bold mt-1 text-purple-600">{totalPublished}</p></CardContent></Card>
      </div>

      <div className="space-y-3">
        {siteOutlines.map(({ site, items }) => {
          const s = site as unknown as Site;
          const itemList = items as unknown as OutlineItem[];
          const isExpanded = expanded[s.id] ?? true;
          const approved = itemList.filter((i) => i.status === "approved").length;
          const published = itemList.filter((i) => i.status === "published").length;

          return (
            <Card key={s.id}>
              <div
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setExpanded((prev) => ({ ...prev, [s.id]: !isExpanded }))}
              >
                {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{s.displayName ?? s.name ?? s.id}</p>
                  <p className="text-xs text-muted-foreground">{s.id}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{itemList.length}개</span>
                  <span>승인 {approved}</span>
                  <span className="text-purple-600">발행 {published}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs shrink-0"
                  asChild
                  onClick={(e) => e.stopPropagation()}
                >
                  <Link href={`/sites/${s.id}/outline`}>관리 →</Link>
                </Button>
              </div>

              {isExpanded && itemList.length > 0 && (
                <div className="border-t divide-y max-h-80 overflow-y-auto">
                  {itemList.map((item) => (
                    <div key={item.id ?? item.seq} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20">
                      <span className="text-[10px] text-muted-foreground w-5 text-center shrink-0">{item.seq}</span>
                      <p className="text-sm flex-1 min-w-0 line-clamp-1">{item.title}</p>
                      <span className="text-[10px] text-muted-foreground shrink-0 hidden sm:block">{item.targetKeyword}</span>
                      <Badge className={cn("text-[9px] px-1.5 py-0 shrink-0", STATUS_COLOR[item.status] ?? "bg-slate-100 text-slate-700")}>
                        {STATUS_LABEL[item.status] ?? item.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              {isExpanded && itemList.length === 0 && (
                <div className="border-t p-4 text-center text-sm text-muted-foreground">
                  아웃라인이 없습니다 —{" "}
                  <Link href={`/sites/${s.id}/outline`} className="text-primary hover:underline">AI로 생성하기</Link>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
