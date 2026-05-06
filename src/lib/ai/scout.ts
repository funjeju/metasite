import Parser from "rss-parser";
import type { SiteContext } from "./types";

const parser = new Parser({ timeout: 10000 });

export interface ScoutItem {
  title: string;
  link: string;
  pubDate: string;
  contentSnippet: string;
}

export async function scoutSources(
  ctx: SiteContext,
  feedUrls: string[]
): Promise<ScoutItem[]> {
  const results: ScoutItem[] = [];

  await Promise.allSettled(
    feedUrls.map(async (url) => {
      try {
        const feed = await parser.parseURL(url);
        const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days

        for (const item of feed.items.slice(0, 20)) {
          const pubMs = item.pubDate ? new Date(item.pubDate).getTime() : 0;
          if (pubMs < cutoff) continue;

          results.push({
            title: item.title ?? "",
            link: item.link ?? "",
            pubDate: item.pubDate ?? new Date().toISOString(),
            contentSnippet: (item.contentSnippet ?? item.summary ?? "").slice(0, 500),
          });
        }
      } catch {
        // Skip feeds that fail
      }
    })
  );

  // Deduplicate by link
  const seen = new Set<string>();
  return results.filter((item) => {
    if (!item.link || seen.has(item.link)) return false;
    seen.add(item.link);
    return true;
  });
}

export async function evaluateRelevance(
  items: ScoutItem[],
  ctx: SiteContext
): Promise<ScoutItem[]> {
  // Simple keyword-based filter — can be upgraded to Claude scoring
  const keywords = ctx.topic.toLowerCase().split(/[\s,]+/).filter((k) => k.length > 2);
  return items.filter((item) => {
    const text = `${item.title} ${item.contentSnippet}`.toLowerCase();
    return keywords.some((k) => text.includes(k));
  });
}
