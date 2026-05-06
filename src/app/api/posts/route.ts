import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifySession } from "@/lib/auth";
import { serialize } from "@/lib/serialize";

export async function GET(req: NextRequest) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const siteId = searchParams.get("siteId");
  const status = searchParams.get("status");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);

  try {
    if (siteId) {
      let q = adminDb
        .collection("sites").doc(siteId).collection("curated_posts")
        .orderBy("createdAt", "desc")
        .limit(limit) as FirebaseFirestore.Query;
      if (status) q = q.where("publishStatus", "==", status);
      const snap = await q.get();
      const posts = snap.docs.map((d) => serialize({ ...d.data(), siteId }));
      return NextResponse.json({ posts });
    }

    // 전체 사이트에서 수집
    const sitesSnap = await adminDb.collection("child_sites").get();
    const postPromises = sitesSnap.docs
      .filter((d) => d.data().status !== "archived")
      .map(async (siteDoc) => {
        let q = adminDb
          .collection("sites").doc(siteDoc.id).collection("curated_posts")
          .orderBy("createdAt", "desc")
          .limit(20) as FirebaseFirestore.Query;
        if (status) q = q.where("publishStatus", "==", status);
        const snap = await q.get();
        return snap.docs.map((d) =>
          serialize({
            ...d.data(),
            siteId: siteDoc.id,
            siteName: siteDoc.data().displayName ?? siteDoc.id,
          })
        );
      });

    const nested = await Promise.all(postPromises);
    const posts = (nested.flat() as Record<string, unknown>[])
      .sort((a, b) => {
        const aTs = typeof a.createdAt === "string" ? new Date(a.createdAt as string).getTime() : 0;
        const bTs = typeof b.createdAt === "string" ? new Date(b.createdAt as string).getTime() : 0;
        return bTs - aTs;
      })
      .slice(0, limit);

    return NextResponse.json({ posts });
  } catch (err) {
    console.error("GET /api/posts:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
