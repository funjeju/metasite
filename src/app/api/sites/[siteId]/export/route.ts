import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifySession } from "@/lib/auth";

// GET /api/sites/[siteId]/export?format=csv|json&status=published
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { siteId } = await params;
  const format = req.nextUrl.searchParams.get("format") ?? "csv";
  const status = req.nextUrl.searchParams.get("status") ?? "published";

  let query = adminDb
    .collection("sites").doc(siteId).collection("curated_posts")
    .orderBy("publishedAt", "desc")
    .limit(1000) as FirebaseFirestore.Query;

  if (status !== "all") query = query.where("publishStatus", "==", status);

  const snap = await query.get();

  if (format === "json") {
    const posts = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        title: data.title ?? "",
        slug: data.slug ?? "",
        excerpt: data.excerpt ?? "",
        bodyMd: data.bodyMd ?? "",
        tags: (data.tags ?? []).join(", "),
        metaTitle: data.metaTitle ?? "",
        metaDescription: data.metaDescription ?? "",
        wordCount: data.wordCount ?? 0,
        publishStatus: data.publishStatus ?? "",
        publishedAt: data.publishedAt ?? "",
        externalUrl: data.externalUrl ?? "",
      };
    });
    return new NextResponse(JSON.stringify(posts, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${siteId}-posts.json"`,
      },
    });
  }

  // CSV format
  const headers = ["id", "title", "slug", "excerpt", "tags", "metaTitle", "metaDescription", "wordCount", "publishStatus", "publishedAt", "externalUrl"];
  const escapeCell = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;

  const rows = snap.docs.map((d) => {
    const data = d.data();
    return [
      d.id,
      data.title ?? "",
      data.slug ?? "",
      data.excerpt ?? "",
      (data.tags ?? []).join("; "),
      data.metaTitle ?? "",
      data.metaDescription ?? "",
      String(data.wordCount ?? 0),
      data.publishStatus ?? "",
      data.publishedAt ?? "",
      data.externalUrl ?? "",
    ].map(escapeCell).join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${siteId}-posts.csv"`,
    },
  });
}
