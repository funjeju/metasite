"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Bot, X, Send, Loader2, ChevronDown, Sparkles, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { marked } from "marked";

interface Message {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

const WELCOME: Message = {
  role: "assistant",
  content: `안녕하세요! META-SITE 어시스턴트입니다. 🚀

시스템 전반에 대해 도움을 드릴 수 있습니다:

- **SEO 전략** — 키워드, 메타태그, 콘텐츠 클러스터링
- **운영 문제** — 크론, 파이프라인, Firestore, 인증 오류
- **사이트 설정** — Phase 1/2, 섹션 구성, 퍼블리셔 연동
- **콘텐츠 전략** — 토픽 선택, 아웃라인 계획

무엇이든 물어보세요!`,
};

function renderMarkdown(text: string): string {
  return marked.parse(text, { async: false }) as string;
}

export function SiteAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setLoading(true);

    const assistantMsg: Message = { role: "assistant", content: "", streaming: true };
    setMessages([...history, assistantMsg]);

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: accumulated, streaming: true };
          return updated;
        });
      }

      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: accumulated, streaming: false };
        return updated;
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      const msg = (err as Error).message ?? "unknown";
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: `오류가 발생했습니다 (${msg}). Vercel 환경변수에 ANTHROPIC_API_KEY가 설정되어 있는지 확인해 주세요.`,
          streaming: false,
        };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const clearChat = () => {
    abortRef.current?.abort();
    setMessages([WELCOME]);
    setLoading(false);
  };

  return (
    <>
      {/* 플로팅 버튼 */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex h-13 w-13 items-center justify-center rounded-full shadow-lg transition-all duration-200",
          "bg-gradient-to-br from-purple-600 to-violet-700 hover:from-purple-500 hover:to-violet-600",
          "ring-2 ring-white/20",
          open && "rotate-0"
        )}
        aria-label="AI 어시스턴트"
      >
        {open ? (
          <ChevronDown className="h-5 w-5 text-white" />
        ) : (
          <Bot className="h-5 w-5 text-white" />
        )}
        {!open && (
          <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-400 border-2 border-white" />
        )}
      </button>

      {/* 채팅 패널 */}
      <div
        className={cn(
          "fixed bottom-24 right-6 z-50 w-[380px] max-h-[600px] flex flex-col",
          "rounded-2xl border bg-background shadow-2xl",
          "transition-all duration-200 origin-bottom-right",
          open ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"
        )}
      >
        {/* 헤더 */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b bg-gradient-to-r from-purple-600 to-violet-700 rounded-t-2xl">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white leading-tight">META-SITE 어시스턴트</p>
            <p className="text-[10px] text-white/70">SEO · 시스템 · 콘텐츠 전략</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={clearChat}
              className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-white/20 transition-colors"
              title="대화 초기화"
            >
              <Trash2 className="h-3 w-3 text-white/70" />
            </button>
            <button
              onClick={() => setOpen(false)}
              className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-white/20 transition-colors"
            >
              <X className="h-3.5 w-3.5 text-white" />
            </button>
          </div>
        </div>

        {/* 메시지 목록 */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0 max-h-[440px]">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={cn(
                "flex gap-2",
                msg.role === "user" ? "flex-row-reverse" : "flex-row"
              )}
            >
              {msg.role === "assistant" && (
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-100 mt-0.5">
                  <Bot className="h-3 w-3 text-purple-600" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                  msg.role === "user"
                    ? "bg-purple-600 text-white rounded-tr-sm"
                    : "bg-muted rounded-tl-sm"
                )}
              >
                {msg.role === "assistant" ? (
                  <div
                    className={cn(
                      "prose prose-sm max-w-none dark:prose-invert",
                      "[&>p]:mb-1.5 [&>p:last-child]:mb-0",
                      "[&>ul]:mb-1.5 [&>ul]:pl-4 [&>li]:mb-0.5",
                      "[&>h1,&>h2,&>h3]:text-sm [&>h1,&>h2,&>h3]:font-semibold [&>h1,&>h2,&>h3]:mb-1",
                      "[&>pre]:text-[11px] [&>pre]:rounded-lg [&>pre]:p-2",
                      "[&>code]:text-[11px]",
                      msg.streaming && "after:inline-block after:w-1 after:h-3.5 after:bg-purple-500 after:animate-pulse after:ml-0.5 after:align-middle"
                    )}
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                  />
                ) : (
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                )}
              </div>
            </div>
          ))}

          {loading && messages[messages.length - 1]?.content === "" && (
            <div className="flex gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-100">
                <Bot className="h-3 w-3 text-purple-600" />
              </div>
              <div className="bg-muted rounded-2xl rounded-tl-sm px-3 py-2.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* 입력창 */}
        <div className="border-t p-3">
          <div className="flex items-end gap-2 rounded-xl border bg-background px-3 py-2 focus-within:ring-1 focus-within:ring-purple-400 transition-all">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="질문을 입력하세요... (Enter 전송, Shift+Enter 줄바꿈)"
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground/60 max-h-24 leading-relaxed"
              style={{ height: "auto" }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${el.scrollHeight}px`;
              }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all",
                input.trim() && !loading
                  ? "bg-purple-600 text-white hover:bg-purple-700"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground/50 mt-1.5 text-center">
            Gemini 2.5 Flash · META-SITE 전체 시스템 지식 탑재
          </p>
        </div>
      </div>
    </>
  );
}
