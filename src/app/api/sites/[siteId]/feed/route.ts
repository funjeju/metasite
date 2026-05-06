import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

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
    .limit(50)
    .get();

  const items = snap.docs
    .map((d) => {
      const data = d.data();
      const slug = data.slug as string | undefined;
      if (!slug) return null;
      const title = (data.title as string) ?? "";
      const excerpt = (data.excerpt as string) ?? "";
      const publishedAt = data.publishedAt?.toDate?.()?.toUTCString() ?? new Date().toUTCString();
      const url = `${base}/articles/${slug}`;
      return `    <item>
      <title><![CDATA[${title}]]></title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description><![CDATA[${excerpt}]]></description>
      <pubDate>${publishedAt}</pubDate>
    </item>`;
    })
    .filter(Boolean)
    .join("\n");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title><![CDATA[${siteName}]]></title>
    <link>${base}</link>
    <description><![CDATA[${site.topic ?? siteName} 최신 콘텐츠]]></description>
    <language>${site.language ?? "ko"}</language>
    <atom:link href="${base}/feed.xml" rel="self" type="application/rss+xml"/>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new NextResponse(rss, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
