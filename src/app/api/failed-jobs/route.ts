import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifySession } from "@/lib/auth";
import { serialize } from "@/lib/serialize";
import { FieldValue } from "firebase-admin/firestore";

export async function GET(req: NextRequest) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const siteId = searchParams.get("siteId");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);

  const sitesSnap = siteId
    ? [{ id: siteId, data: () => ({}) }]
    : (await adminDb.collection("child_sites").where("status", "!=", "archived").get()).docs;

  const jobs: unknown[] = [];
  await Promise.all(
    sitesSnap.map(async (siteDoc) => {
      const snap = await adminDb
        .collection("sites").doc(siteDoc.id).collection("curated_posts")
        .where("publishStatus", "==", "failed")
        .orderBy("createdAt", "desc")
        .limit(20)
        .get();
      snap.docs.forEach((d) => jobs.push(serialize({ id: d.id, siteId: siteDoc.id, ...d.data() })));
    })
  );

  const sorted = (jobs as Record<string, unknown>[])
    .sort((a, b) => {
      const aT = typeof a.createdAt === "string" ? new Date(a.createdAt).getTime() : 0;
      const bT = typeof b.createdAt === "string" ? new Date(b.createdAt).getTime() : 0;
      return bT - aT;
    })
    .slice(0, limit);

  return NextResponse.json({ jobs: sorted });
}

export async function PATCH(req: NextRequest) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { siteId, postId, action } = await req.json() as { siteId: string; postId: string; action: "retry" | "dismiss" };
  if (!siteId || !postId) return NextResponse.json({ error: "siteId and postId required" }, { status: 400 });

  const ref = adminDb.collection("sites").doc(siteId).collection("curated_posts").doc(postId);

  if (action === "dismiss") {
    await ref.update({ publishStatus: "dismissed", dismissedAt: FieldValue.serverTimestamp() });
    return NextResponse.json({ ok: true });
  }

  // retry: reset to approved so cron picks it up again
  await ref.update({ publishStatus: "approved", retryAt: FieldValue.serverTimestamp(), publishError: null });

  // Immediately kick off pipeline
  const siteDoc = await adminDb.collection("child_sites").doc(siteId).get();
  const phase = (siteDoc.data()?.currentPhase as string) ?? "authority";

  return NextResponse.json({ ok: true, phase });
}
