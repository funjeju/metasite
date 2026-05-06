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

  const txt = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /login

Sitemap: ${base}/sitemap.xml
`;

  return new NextResponse(txt, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
