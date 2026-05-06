import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifySession } from "@/lib/auth";
import { serialize } from "@/lib/serialize";
import { FieldValue } from "firebase-admin/firestore";

export async function GET() {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const snap = await adminDb.collection("prompt_assets").orderBy("createdAt", "desc").get();
  return NextResponse.json({ prompts: snap.docs.map((d) => serialize({ id: d.id, ...d.data() })) });
}

export async function POST(req: NextRequest) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { role: string; version: number; content: string; notes?: string };
  if (!body.role || !body.content) return NextResponse.json({ error: "role and content required" }, { status: 400 });

  const promptId = `${body.role}_v${body.version ?? 1}`;
  await adminDb.collection("prompt_assets").doc(promptId).set({
    promptId,
    role: body.role,
    version: body.version ?? 1,
    content: body.content,
    notes: body.notes ?? "",
    active: false,
    createdAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ promptId }, { status: 201 });
}
