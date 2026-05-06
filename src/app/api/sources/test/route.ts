import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";

interface RssItem {
  title: string;
  link: string;
  pubDate?: string;
  description?: string;
}

function parseXml(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const get = (tag: string) => {
      const m = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, "i").exec(block);
      return m ? m[1].trim() : "";
    };
    const title = get("title");
    const link = get("link") || get("guid");
    if (title && link) {
      items.push({ title, link, pubDate: get("pubDate"), description: get("description").slice(0, 200) });
    }
  }
  return items.slice(0, 5);
}

export async function POST(req: NextRequest) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { url } = await req.json() as { url?: string };
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "MetasiteBot/1.0 (RSS feed preview)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return NextResponse.json({ error: `Feed returned ${res.status}` }, { status: 422 });
    const xml = await res.text();
    const items = parseXml(xml);
    if (items.length === 0) return NextResponse.json({ error: "파싱된 항목이 없습니다. 유효한 RSS 피드 URL인지 확인하세요." }, { status: 422 });
    return NextResponse.json({ items });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "fetch failed";
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}
