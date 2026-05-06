import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifySession } from "@/lib/auth";
import { serialize } from "@/lib/serialize";

// GET /api/sites/[siteId]/posts?status=&limit=
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { siteId } = await params;
  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);

  let query = adminDb
    .collection("sites").doc(siteId).collection("curated_posts")
    .orderBy("createdAt", "desc")
    .limit(limit) as FirebaseFirestore.Query;

  if (status) query = query.where("publishStatus", "==", status);

  const snap = await query.get();
  const posts = snap.docs.map((d) => serialize({ id: d.id, siteId, ...d.data() }));

  return NextResponse.json({ posts, total: posts.length });
}
