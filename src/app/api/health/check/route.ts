import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifySession } from "@/lib/auth";
import { checkSiteHealth, persistAlerts } from "@/lib/health/checker";

// POST: run health check for one site or all sites
// Also called by cron/tick
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("x-cron-secret");
  const isSession = !authHeader;

  if (isSession) {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  } else if (authHeader !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({})) as { siteId?: string };

  const siteIds: string[] = [];
  if (body.siteId) {
    siteIds.push(body.siteId);
  } else {
    const sitesSnap = await adminDb.collection("child_sites").where("status", "==", "active").get();
    sitesSnap.docs.forEach((d) => siteIds.push(d.id));
  }

  const allAlerts = [];
  for (const siteId of siteIds) {
    const alerts = await checkSiteHealth(siteId);
    allAlerts.push(...alerts);
  }

  await persistAlerts(allAlerts);

  return NextResponse.json({
    checked: siteIds.length,
    alertsCreated: allAlerts.length,
    alerts: allAlerts.map((a) => ({ severity: a.severity, title: a.title })),
  });
}
