"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Sparkles, Check, X, Star } from "lucide-react";

interface Prompt { id: string; promptId?: string; role: string; version: number; content: string; notes?: string; active?: boolean }

const ROLES = ["writer", "verifier", "editor", "outline_generator"];

export function PromptsManager({ initialPrompts }: { initialPrompts: Record<string, unknown>[] }) {
  const [prompts, setPrompts] = useState<Prompt[]>(initialPrompts as unknown as Prompt[]);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ role: "writer", version: 1, content: "", notes: "" });

  const create = async () => {
    if (!form.content) return;
    const res = await fetch("/api/prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const { promptId } = await res.json() as { promptId: string };
      setPrompts((prev) => [{ id: promptId, ...form, active: false }, ...prev]);
      setForm({ role: "writer", version: 1, content: "", notes: "" });
      setShowNew(false);
    }
  };

  const activate = async (p: Prompt) => {
    await fetch(`/api/prompts/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: true }),
    });
    setPrompts((prev) => prev.map((x) => ({ ...x, active: x.id === p.id ? true : x.role === p.role ? false : x.active })));
  };

  const remove = async (p: Prompt) => {
    if (!confirm("삭제하시겠습니까?")) return;
    await fetch(`/api/prompts/${p.id}`, { method: "DELETE" });
    setPrompts((prev) => prev.filter((x) => x.id !== p.id));
  };

  const grouped = ROLES.reduce((acc, r) => ({ ...acc, [r]: prompts.filter((p) => p.role === r) }), {} as Record<string, Prompt[]>);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowNew(!showNew)}><Plus className="h-4 w-4 mr-1.5" />새 프롬프트</Button>
      </div>

      {showNew && (
        <Card>
          <CardHeader><CardTitle className="text-sm">새 프롬프트 에셋</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <select className="border rounded-md px-3 py-2 text-sm bg-background" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <Input type="number" placeholder="버전" value={form.version} onChange={(e) => setForm((f) => ({ ...f, version: parseInt(e.target.value) || 1 }))} />
            </div>
            <Textarea placeholder="프롬프트 내용" rows={6} value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} className="font-mono text-xs" />
            <Input placeholder="메모 (선택)" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowNew(false)}><X className="h-4 w-4 mr-1" />취소</Button>
              <Button size="sm" onClick={create}><Check className="h-4 w-4 mr-1" />저장</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {ROLES.map((role) => {
        const items = grouped[role] ?? [];
        if (items.length === 0) return null;
        return (
          <div key={role}>
            <h3 className="text-sm font-semibold mb-2 capitalize">{role}</h3>
            <div className="space-y-2">
              {items.map((p) => (
                <Card key={p.id} className={p.active ? "border-purple-500/50" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="text-[10px]">v{p.version}</Badge>
                          {p.active && <Badge className="text-[10px] bg-purple-600">활성</Badge>}
                          {p.notes && <span className="text-[11px] text-muted-foreground">{p.notes}</span>}
                        </div>
                        <p className="text-xs text-muted-foreground font-mono line-clamp-2">{p.content}</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        {!p.active && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => activate(p)}>
                            <Star className="h-3.5 w-3.5 mr-1" />활성화
                          </Button>
                        )}
                        <button onClick={() => remove(p)} className="text-muted-foreground hover:text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}

      {prompts.length === 0 && !showNew && (
        <Card><CardContent className="flex flex-col items-center py-16"><Sparkles className="h-10 w-10 text-muted-foreground mb-4" /><p className="font-medium">등록된 프롬프트가 없습니다</p></CardContent></Card>
      )}
    </div>
  );
}
