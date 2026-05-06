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
  const base = `https://${domain}`;

  const snap = await adminDb
    .collection("sites").doc(siteId).collection("curated_posts")
    .where("publishStatus", "==", "published")
    .orderBy("publishedAt", "desc")
    .limit(1000)
    .get();

  const urlEntries = snap.docs
    .map((d) => {
      const data = d.data();
      const slug = data.slug as string | undefined;
      const publishedAt = data.publishedAt?.toDate?.()?.toISOString() ?? new Date().toISOString();
      if (!slug) return null;
      return `  <url>
    <loc>${base}/articles/${slug}</loc>
    <lastmod>${publishedAt.split("T")[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
    })
    .filter(Boolean)
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${base}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
${urlEntries}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
