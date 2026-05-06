import { adminDb } from "@/lib/firebase-admin";
import { createHash } from "crypto";

export interface DuplicateResult {
  isDuplicate: boolean;
  level: 1 | 2 | 3 | 4 | null;
  reason: string;
  existingPostId?: string;
}

// L1: Exact source URL already processed today
export async function checkSourceUrl(siteId: string, sourceUrl: string): Promise<DuplicateResult> {
  if (!sourceUrl) return { isDuplicate: false, level: null, reason: "" };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const snap = await adminDb
    .collection("sites").doc(siteId).collection("curated_posts")
    .where("sourceUrls", "array-contains", sourceUrl)
    .limit(1)
    .get();

  if (!snap.empty) {
    return { isDuplicate: true, level: 1, reason: `Source URL already used: ${sourceUrl}`, existingPostId: snap.docs[0].id };
  }
  return { isDuplicate: false, level: null, reason: "" };
}

// L2: Content hash match
export async function checkContentHash(siteId: string, content: string): Promise<DuplicateResult> {
  const hash = createHash("sha256").update(content.slice(0, 1000)).digest("hex");

  const snap = await adminDb
    .collection("sites").doc(siteId).collection("curated_posts")
    .where("contentHash", "==", hash)
    .limit(1)
    .get();

  if (!snap.empty) {
    return { isDuplicate: true, level: 2, reason: `Content hash match`, existingPostId: snap.docs[0].id };
  }
  return { isDuplicate: false, level: null, reason: "" };
}

// L3: Title similarity (Jaccard on word tokens)
export async function checkTitleSimilarity(siteId: string, title: string): Promise<DuplicateResult> {
  const snap = await adminDb
    .collection("sites").doc(siteId).collection("curated_posts")
    .where("publishStatus", "in", ["published", "approved", "generating"])
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();

  const newTokens = new Set(tokenize(title));

  for (const doc of snap.docs) {
    const existingTitle: string = doc.data().title ?? "";
    const existingTokens = new Set(tokenize(existingTitle));
    const intersection = [...newTokens].filter((t) => existingTokens.has(t)).length;
    const union = new Set([...newTokens, ...existingTokens]).size;
    const jaccard = union > 0 ? intersection / union : 0;

    if (jaccard > 0.7) {
      return { isDuplicate: true, level: 3, reason: `Title similarity ${(jaccard * 100).toFixed(0)}% with "${existingTitle}"`, existingPostId: doc.id };
    }
  }
  return { isDuplicate: false, level: null, reason: "" };
}

// L4: Slug collision
export async function checkSlug(siteId: string, slug: string): Promise<DuplicateResult> {
  const snap = await adminDb
    .collection("sites").doc(siteId).collection("curated_posts")
    .where("slug", "==", slug)
    .limit(1)
    .get();

  if (!snap.empty) {
    return { isDuplicate: true, level: 4, reason: `Slug "${slug}" already exists`, existingPostId: snap.docs[0].id };
  }
  return { isDuplicate: false, level: null, reason: "" };
}

// Run all 4 levels in order, stop at first hit
export async function runDuplicateCheck(
  siteId: string,
  opts: { title: string; slug: string; content: string; sourceUrls?: string[] }
): Promise<DuplicateResult> {
  for (const url of opts.sourceUrls ?? []) {
    const r = await checkSourceUrl(siteId, url);
    if (r.isDuplicate) return r;
  }
  const r2 = await checkContentHash(siteId, opts.content);
  if (r2.isDuplicate) return r2;

  const r3 = await checkTitleSimilarity(siteId, opts.title);
  if (r3.isDuplicate) return r3;

  const r4 = await checkSlug(siteId, opts.slug);
  if (r4.isDuplicate) return r4;

  return { isDuplicate: false, level: null, reason: "" };
}

export function contentHash(content: string): string {
  return createHash("sha256").update(content.slice(0, 1000)).digest("hex");
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s가-힣]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}
