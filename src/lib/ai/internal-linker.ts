import { adminDb } from "@/lib/firebase-admin";

// Resolves {{ARTICLE:slug}} and {{INTERNAL:keyword}} markers in HTML body
// {{ARTICLE:slug}} → <a href="/articles/slug">slug title</a>
// {{INTERNAL:keyword}} → <a href="/articles/matching-slug">keyword</a>

export async function resolveInternalLinks(
  siteId: string,
  bodyHtml: string,
  canonicalDomain: string
): Promise<string> {
  const base = canonicalDomain ? `https://${canonicalDomain}` : "";

  // Build a slug→{title,url} map from published/approved posts
  const snap = await adminDb
    .collection("sites").doc(siteId).collection("curated_posts")
    .where("publishStatus", "in", ["published", "approved"])
    .select("slug", "title", "externalUrl")
    .limit(200)
    .get();

  const slugMap = new Map<string, { title: string; url: string }>();
  const titleTokenMap: { tokens: Set<string>; slug: string; title: string; url: string }[] = [];

  for (const doc of snap.docs) {
    const d = doc.data();
    if (!d.slug) continue;
    const url = (d.externalUrl as string) || `${base}/articles/${d.slug}`;
    slugMap.set(d.slug as string, { title: d.title as string, url });
    titleTokenMap.push({
      tokens: new Set(tokenize(d.title as string ?? "")),
      slug: d.slug as string,
      title: d.title as string ?? "",
      url,
    });
  }

  // Resolve {{ARTICLE:slug}}
  let resolved = bodyHtml.replace(/\{\{ARTICLE:([^}]+)\}\}/g, (_, slug) => {
    const entry = slugMap.get(slug.trim());
    if (entry) {
      return `<a href="${entry.url}">${entry.title || slug}</a>`;
    }
    return slug; // fallback: just the slug text
  });

  // Resolve {{INTERNAL:keyword}}
  resolved = resolved.replace(/\{\{INTERNAL:([^}]+)\}\}/g, (_, keyword) => {
    const kTokens = new Set(tokenize(keyword.trim()));
    let best: { score: number; entry: { title: string; url: string } | null } = { score: 0, entry: null };

    for (const item of titleTokenMap) {
      const intersection = [...kTokens].filter((t) => item.tokens.has(t)).length;
      const union = new Set([...kTokens, ...item.tokens]).size;
      const score = union > 0 ? intersection / union : 0;
      if (score > best.score) best = { score, entry: { title: item.title, url: item.url } };
    }

    if (best.entry && best.score > 0.3) {
      return `<a href="${best.entry.url}">${keyword}</a>`;
    }
    return keyword;
  });

  return resolved;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s가-힣]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}
