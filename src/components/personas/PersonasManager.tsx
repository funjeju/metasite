"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Users, Check, X } from "lucide-react";

interface Persona { id: string; personaId?: string; name: string; role: string; systemPrompt?: string; tone?: string; language?: string }

export function PersonasManager({ initialPersonas }: { initialPersonas: Record<string, unknown>[] }) {
  const [personas, setPersonas] = useState<Persona[]>(initialPersonas as unknown as Persona[]);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", role: "", systemPrompt: "", tone: "professional", language: "ko" });

  const create = async () => {
    if (!form.name || !form.role) return;
    const res = await fetch("/api/personas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const { personaId } = await res.json() as { personaId: string };
      setPersonas((prev) => [{ id: personaId, ...form }, ...prev]);
      setForm({ name: "", role: "", systemPrompt: "", tone: "professional", language: "ko" });
      setShowNew(false);
    }
  };

  const remove = async (p: Persona) => {
    if (!confirm("삭제하시겠습니까?")) return;
    await fetch(`/api/personas/${p.id}`, { method: "DELETE" });
    setPersonas((prev) => prev.filter((x) => x.id !== p.id));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowNew(!showNew)}><Plus className="h-4 w-4 mr-1.5" />새 페르소나</Button>
      </div>

      {showNew && (
        <Card>
          <CardHeader><CardTitle className="text-sm">새 페르소나</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="이름" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              <Input placeholder="역할 (e.g. friendly_expert)" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} />
            </div>
            <Textarea placeholder="시스템 프롬프트" rows={4} value={form.systemPrompt} onChange={(e) => setForm((f) => ({ ...f, systemPrompt: e.target.value }))} />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowNew(false)}><X className="h-4 w-4 mr-1" />취소</Button>
              <Button size="sm" onClick={create}><Check className="h-4 w-4 mr-1" />저장</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {personas.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center py-16"><Users className="h-10 w-10 text-muted-foreground mb-4" /><p className="font-medium">등록된 페르소나가 없습니다</p></CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {personas.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <Badge variant="secondary" className="text-[10px] mt-1">{p.role}</Badge>
                  </div>
                  <button onClick={() => remove(p)} className="text-muted-foreground hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {p.systemPrompt && (
                  <p className="text-xs text-muted-foreground line-clamp-3">{p.systemPrompt}</p>
                )}
                <div className="flex gap-1.5 mt-2">
                  <Badge variant="outline" className="text-[10px]">{p.tone ?? "professional"}</Badge>
                  <Badge variant="outline" className="text-[10px]">{p.language === "ko" ? "한국어" : "English"}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
