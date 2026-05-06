// Analytics snapshot: fetches from GSC/GA4 or stubs data when credentials absent
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export interface DailySnapshot {
  date: string; // YYYY-MM-DD
  siteId: string;
  clicks?: number;
  impressions?: number;
  ctr?: number;
  avgPosition?: number;
  sessions?: number;
  pageviews?: number;
  source: "gsc" | "ga4" | "stub";
}

async function fetchGscData(
  siteId: string,
  domain: string,
  date: string,
  accessToken: string
): Promise<Partial<DailySnapshot>> {
  const startDate = date;
  const endDate = date;

  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(`sc-domain:${domain}`)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions: [],
        rowLimit: 1,
      }),
    }
  );

  if (!res.ok) return {};
  const data = await res.json() as { rows?: Array<{ clicks: number; impressions: number; ctr: number; position: number }> };
  const row = data.rows?.[0];
  if (!row) return { clicks: 0, impressions: 0, ctr: 0, avgPosition: 0 };

  return {
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: Math.round(row.ctr * 10000) / 100,
    avgPosition: Math.round(row.position * 10) / 10,
  };
}

async function fetchGa4Data(
  propertyId: string,
  date: string,
  accessToken: string
): Promise<Partial<DailySnapshot>> {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        dateRanges: [{ startDate: date, endDate: date }],
        metrics: [{ name: "sessions" }, { name: "screenPageViews" }],
      }),
    }
  );

  if (!res.ok) return {};
  const data = await res.json() as { rows?: Array<{ metricValues: Array<{ value: string }> }> };
  const row = data.rows?.[0];
  if (!row) return { sessions: 0, pageviews: 0 };

  return {
    sessions: parseInt(row.metricValues[0]?.value ?? "0"),
    pageviews: parseInt(row.metricValues[1]?.value ?? "0"),
  };
}

export async function takeSnapshot(siteId: string, date?: string): Promise<DailySnapshot> {
  const targetDate = date ?? new Date().toISOString().slice(0, 10);

  const siteDoc = await adminDb.collection("child_sites").doc(siteId).get();
  const site = siteDoc.data() ?? {};
  const canonicalDomain: string = site.seoConfig?.canonicalDomain ?? "";
  const gscToken: string = site.integrations?.gscAccessToken ?? "";
  const ga4PropertyId: string = site.integrations?.ga4PropertyId ?? "";
  const ga4Token: string = site.integrations?.ga4AccessToken ?? "";

  const snapshot: DailySnapshot = { date: targetDate, siteId, source: "stub" };

  if (canonicalDomain && gscToken) {
    const gscData = await fetchGscData(siteId, canonicalDomain, targetDate, gscToken).catch(() => ({}));
    Object.assign(snapshot, gscData, { source: "gsc" });
  }

  if (ga4PropertyId && ga4Token) {
    const ga4Data = await fetchGa4Data(ga4PropertyId, targetDate, ga4Token).catch(() => ({}));
    Object.assign(snapshot, ga4Data, { source: snapshot.source === "gsc" ? "gsc" : "ga4" });
  }

  // Persist
  await adminDb
    .collection("analytics_snapshots")
    .doc(`${siteId}_${targetDate}`)
    .set({
      ...snapshot,
      createdAt: FieldValue.serverTimestamp(),
    }, { merge: true });

  return snapshot;
}
