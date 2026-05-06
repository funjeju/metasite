import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

// Called by Vercel Cron every hour
// Dispatches pipeline jobs for sites that are due
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = Date.now();
  const sitesSnap = await adminDb
    .collection("child_sites")
    .where("status", "==", "active")
    .get();

  const triggered: string[] = [];
  const skipped: string[] = [];

  for (const doc of sitesSnap.docs) {
    const site = doc.data();
    const siteId = doc.id;

    // Check if any section is due
    const sections: Array<{
      enabled: boolean;
      publishFrequency: string;
      lastPublishedAt?: string;
    }> = site.sections ?? [];

    const isDue = sections.some((section) => {
      if (!section.enabled) return false;
      const lastMs = section.lastPublishedAt ? new Date(section.lastPublishedAt).getTime() : 0;
      const intervalMs = frequencyToMs(section.publishFrequency);
      return now - lastMs >= intervalMs;
    });

    if (!isDue) {
      skipped.push(siteId);
      continue;
    }

    const phase: string = site.currentPhase ?? "authority";
    const endpoint = phase === "authority" ? "/api/pipeline/authority" : "/api/pipeline/generate";
    const baseUrl = process.env.NEXTAUTH_URL ?? `https://${req.headers.get("host")}`;

    try {
      const res = await fetch(`${baseUrl}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cron-secret": process.env.CRON_SECRET ?? "",
        },
        body: JSON.stringify({ siteId }),
      });

      if (res.ok) {
        triggered.push(siteId);

        // Update lastPublishedAt on the first due section
        const sectionIdx = sections.findIndex((s) => {
          if (!s.enabled) return false;
          const lastMs = s.lastPublishedAt ? new Date(s.lastPublishedAt).getTime() : 0;
          const intervalMs = frequencyToMs(s.publishFrequency);
          return now - lastMs >= intervalMs;
        });
        if (sectionIdx >= 0) {
          await doc.ref.update({
            [`sections.${sectionIdx}.lastPublishedAt`]: new Date().toISOString(),
            "stats.lastCronRun": FieldValue.serverTimestamp(),
          });
        }
      }
    } catch (err) {
      console.error(`cron tick failed for ${siteId}:`, err);
    }
  }

  // Run health check every 6 hours (roughly)
  const hour = new Date().getUTCHours();
  if (hour % 6 === 0) {
    const baseUrl = process.env.NEXTAUTH_URL ?? `https://${req.headers.get("host")}`;
    fetch(`${baseUrl}/api/health/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-cron-secret": process.env.CRON_SECRET ?? "" },
      body: JSON.stringify({}),
    }).catch(() => {});
  }

  return NextResponse.json({ triggered, skipped, ts: new Date().toISOString() });
}

function frequencyToMs(freq: string): number {
  switch (freq) {
    case "daily": return 24 * 60 * 60 * 1000;
    case "thrice_weekly": return (7 / 3) * 24 * 60 * 60 * 1000;
    case "weekly": return 7 * 24 * 60 * 60 * 1000;
    default: return 24 * 60 * 60 * 1000;
  }
}
