import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifySession } from "@/lib/auth";
import { takeSnapshot } from "@/lib/analytics/snapshot";

// POST /api/analytics/snapshot
// Called by daily cron or manually. Takes daily snapshot for all active sites.
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as { siteId?: string; date?: string };
  const date = body.date;

  if (body.siteId) {
    const snapshot = await takeSnapshot(body.siteId, date);
    return NextResponse.json({ ok: true, snapshot });
  }

  // Snapshot all active sites
  const sitesSnap = await adminDb.collection("child_sites").where("status", "==", "active").get();
  const results: Array<{ siteId: string; ok: boolean }> = [];

  for (const doc of sitesSnap.docs) {
    try {
      await takeSnapshot(doc.id, date);
      results.push({ siteId: doc.id, ok: true });
    } catch (err) {
      console.error(`Snapshot failed for ${doc.id}:`, err);
      results.push({ siteId: doc.id, ok: false });
    }
  }

  return NextResponse.json({ ok: true, results, date: date ?? new Date().toISOString().slice(0, 10) });
}

// GET /api/analytics/snapshot?siteId=xxx&days=30
export async function GET(req: NextRequest) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const siteId = req.nextUrl.searchParams.get("siteId");
  const days = Math.min(parseInt(req.nextUrl.searchParams.get("days") ?? "30"), 90);

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  let query = adminDb.collection("analytics_snapshots").where("date", ">=", cutoff).orderBy("date", "asc");
  if (siteId) query = query.where("siteId", "==", siteId) as typeof query;

  const snap = await query.limit(500).get();
  const snapshots = snap.docs.map((d) => d.data());

  return NextResponse.json({ snapshots });
}
