import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifySession } from "@/lib/auth";
import { nanoid } from "nanoid";

// POST /api/sites/[siteId]/webhook — generate/rotate webhook secret
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { siteId } = await params;
  const body = await req.json().catch(() => ({})) as { action?: string };

  const siteDoc = await adminDb.collection("child_sites").doc(siteId).get();
  if (!siteDoc.exists) return NextResponse.json({ error: "Site not found" }, { status: 404 });

  if (body.action === "rotate" || !siteDoc.data()!.webhookSecret) {
    const webhookSecret = `wh_${nanoid(32)}`;
    await siteDoc.ref.update({ webhookSecret });
    return NextResponse.json({ webhookSecret });
  }

  // Return existing secret
  const existing = siteDoc.data()!.webhookSecret as string;
  return NextResponse.json({ webhookSecret: existing });
}
