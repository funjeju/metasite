import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

// llms.txt — AI crawler-friendly site index
// Spec: https://llmstxt.org
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params;

  const siteDoc = await adminDb.collection("child_sites").doc(siteId).get();
  if (!siteDoc.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const site = siteDoc.data()!;
  const domain: string = site.seoConfig?.canonicalDomain ?? `${siteId}.vercel.app`;
  const siteName: string = site.displayName ?? site.name ?? siteId;
  const base = `https://${domain}`;

  const snap = await adminDb
    .collection("sites").doc(siteId).collection("curated_posts")
    .where("publishStatus", "==", "published")
    .orderBy("publishedAt", "desc")
    .limit(200)
    .get();

  const lines: string[] = [
    `# ${siteName}`,
    ``,
    `> ${site.topic ?? siteName} 전문 사이트. AI 자동 발행 콘텐츠.`,
    ``,
    `## Articles`,
    ``,
  ];

  for (const doc of snap.docs) {
    const d = doc.data();
    if (!d.slug) continue;
    const title = (d.title as string) ?? "";
    const excerpt = (d.excerpt as string) ?? "";
    const url = `${base}/articles/${d.slug}`;
    lines.push(`- [${title}](${url}): ${excerpt.slice(0, 120)}`);
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
