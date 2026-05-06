import Anthropic from "@anthropic-ai/sdk";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import type { DailySnapshot } from "./snapshot";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function generateWeeklyReport(siteId: string): Promise<string> {
  // Collect last 7 days of snapshots
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

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    messages: [{
      role: "user",
      content: `You are an SEO analyst. Analyze the following weekly analytics data and provide a brief Korean insight report (3-5 bullet points, each under 100 characters). Focus on trends, notable changes, and one actionable recommendation.\n\n${summary}`,
    }],
  });

  const insight = response.content.find((b) => b.type === "text")?.text ?? "";

  // Persist report
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
