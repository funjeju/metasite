import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifySession } from "@/lib/auth";
import { generateWeeklyReport } from "@/lib/analytics/report";

// POST /api/analytics/report
// Generates AI weekly insight report for a site or all sites
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as { siteId?: string };

  if (body.siteId) {
    const insight = await generateWeeklyReport(body.siteId);
    return NextResponse.json({ ok: true, insight });
  }

  const sitesSnap = await adminDb.collection("child_sites").where("status", "==", "active").get();
  const results: Array<{ siteId: string; ok: boolean }> = [];

  for (const doc of sitesSnap.docs) {
    try {
      await generateWeeklyReport(doc.id);
      results.push({ siteId: doc.id, ok: true });
    } catch (err) {
      console.error(`Report failed for ${doc.id}:`, err);
      results.push({ siteId: doc.id, ok: false });
    }
  }

  return NextResponse.json({ ok: true, results });
}

// GET /api/analytics/report?siteId=xxx
export async function GET(req: NextRequest) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const siteId = req.nextUrl.searchParams.get("siteId");
  let query = adminDb.collection("analytics_reports").orderBy("createdAt", "desc").limit(10);
  if (siteId) query = query.where("siteId", "==", siteId) as typeof query;

  const snap = await query.get();
  const reports = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  return NextResponse.json({ reports });
}
