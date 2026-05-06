import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { takeSnapshot } from "@/lib/analytics/snapshot";

// Called by Vercel Cron daily at 02:00 UTC
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sitesSnap = await adminDb.collection("child_sites").where("status", "==", "active").get();
  const date = new Date().toISOString().slice(0, 10);
  const results: Array<{ siteId: string; ok: boolean }> = [];

  for (const doc of sitesSnap.docs) {
    try {
      await takeSnapshot(doc.id, date);
      results.push({ siteId: doc.id, ok: true });
    } catch (err) {
      console.error(`Analytics snapshot failed for ${doc.id}:`, err);
      results.push({ siteId: doc.id, ok: false });
    }
  }

  return NextResponse.json({ ok: true, results, date });
}
