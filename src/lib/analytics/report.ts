import { genAI } from "@/lib/ai/gemini-client";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import type { DailySnapshot } from "./snapshot";

export async function generateWeeklyReport(siteId: string): Promise<string> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const snap = await adminDb
    .collection("analytics_snapshots")
    .where("siteId", "==", siteId)
    .where("date", ">=", sevenDaysAgo)
    .orderBy("date", "asc")
    .get();

  if (snap.empty) return "";

  const rows = snap.docs.map((d) => d.data() as DailySnapshot);
  const totalClicks = rows.reduce((s, r) => s + (r.clicks ?? 0), 0);
  const totalImpressions = rows.reduce((s, r) => s + (r.impressions ?? 0), 0);
  const totalSessions = rows.reduce((s, r) => s + (r.sessions ?? 0), 0);
  const avgCtr = rows.length ? rows.reduce((s, r) => s + (r.ctr ?? 0), 0) / rows.length : 0;

  const summary = `Site: ${siteId}
Period: ${sevenDaysAgo} ~ ${new Date().toISOString().slice(0, 10)}
Total clicks: ${totalClicks}
Total impressions: ${totalImpressions}
Average CTR: ${avgCtr.toFixed(2)}%
Total sessions: ${totalSessions}
Daily data: ${rows.map((r) => `${r.date}: ${r.clicks ?? 0} clicks, ${r.sessions ?? 0} sessions`).join(" | ")}`;

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const result = await model.generateContent(
    `You are an SEO analyst. Analyze the following weekly analytics data and provide a brief Korean insight report (3-5 bullet points, each under 100 characters). Focus on trends, notable changes, and one actionable recommendation.\n\n${summary}`
  );
  const insight = result.response.text();

  await adminDb.collection("analytics_reports").add({
    siteId,
    period: sevenDaysAgo,
    totalClicks,
    totalImpressions,
    totalSessions,
    avgCtr: Math.round(avgCtr * 100) / 100,
    insight,
    createdAt: FieldValue.serverTimestamp(),
  });

  return insight;
}
