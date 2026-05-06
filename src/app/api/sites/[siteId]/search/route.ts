import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifySession } from "@/lib/auth";
import { serialize } from "@/lib/serialize";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { siteId } = await params;
  const q = req.nextUrl.searchParams.get("q")?.toLowerCase().trim() ?? "";
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "20"), 50);

  if (!q) return NextResponse.json({ results: [] });

  const snap = await adminDb
    .collection("sites").doc(siteId).collection("curated_posts")
    .where("publishStatus", "==", "published")
    .orderBy("publishedAt", "desc")
    .limit(500)
    .get();

  const qTokens = q.split(/\s+/).filter((t) => t.length > 0);

  const results = snap.docs
    .map((d) => {
      const data = d.data();
      const searchText = [
        data.title ?? "",
        data.excerpt ?? "",
        (data.tags ?? []).join(" "),
        data.metaTitle ?? "",
        data.metaDescription ?? "",
      ].join(" ").toLowerCase();

      const score = qTokens.reduce((s, token) => s + (searchText.includes(token) ? 1 : 0), 0);
      return { score, doc: serialize({ id: d.id, siteId, ...data }) };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.doc);

  return NextResponse.json({ results, query: q, total: results.length });
}
