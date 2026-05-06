import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifySession } from "@/lib/auth";


export async function GET(req: NextRequest) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const siteId = searchParams.get("siteId");
  const month = searchParams.get("month"); // YYYY-MM

  // Aggregate cost from curated_posts AI usage data
  const sitesSnap = siteId
    ? [await adminDb.collection("child_sites").doc(siteId).get()].filter((d) => d.exists)
    : (await adminDb.collection("child_sites").where("status", "!=", "archived").get()).docs;

  const costBySite: Record<string, { siteId: string; siteName: string; inputTokens: number; outputTokens: number; costUsd: number; postCount: number }> = {};

  await Promise.all(
    (Array.isArray(sitesSnap) ? sitesSnap : [sitesSnap]).map(async (siteDoc) => {
      const id = "id" in siteDoc ? siteDoc.id : (siteDoc as FirebaseFirestore.DocumentSnapshot).id;
      const data = (siteDoc as FirebaseFirestore.DocumentSnapshot).data?.() ?? {};
      let q = adminDb.collection("sites").doc(id).collection("curated_posts")
        .where("publishStatus", "==", "published") as FirebaseFirestore.Query;
      if (month) {
        const start = new Date(`${month}-01T00:00:00.000Z`).toISOString();
        const end = new Date(new Date(`${month}-01`).setMonth(new Date(`${month}-01`).getMonth() + 1)).toISOString();
        q = q.where("publishedAt", ">=", start).where("publishedAt", "<", end);
      }
      const snap = await q.get();
      let inputTokens = 0, outputTokens = 0, costUsd = 0;
      snap.docs.forEach((d) => {
        const usage = d.data().aiUsage as { inputTokens?: number; outputTokens?: number; costUsd?: number } | undefined;
        if (usage) {
          inputTokens += usage.inputTokens ?? 0;
          outputTokens += usage.outputTokens ?? 0;
          costUsd += usage.costUsd ?? 0;
        }
      });
      costBySite[id] = {
        siteId: id,
        siteName: (data.displayName ?? data.name ?? id) as string,
        inputTokens,
        outputTokens,
        costUsd,
        postCount: snap.size,
      };
    })
  );

  const total = Object.values(costBySite).reduce(
    (acc, s) => ({ inputTokens: acc.inputTokens + s.inputTokens, outputTokens: acc.outputTokens + s.outputTokens, costUsd: acc.costUsd + s.costUsd, postCount: acc.postCount + s.postCount }),
    { inputTokens: 0, outputTokens: 0, costUsd: 0, postCount: 0 }
  );

  return NextResponse.json({ sites: Object.values(costBySite), total });
}
