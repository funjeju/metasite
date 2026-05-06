import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifySession } from "@/lib/auth";
import { serialize } from "@/lib/serialize";
import { FieldValue } from "firebase-admin/firestore";
import { nanoid } from "nanoid";

export async function GET(req: NextRequest) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const siteId = req.nextUrl.searchParams.get("siteId");
  const colRef = siteId
    ? adminDb.collection("sites").doc(siteId).collection("personas")
    : adminDb.collection("personas");

  const snap = await colRef.orderBy("createdAt", "desc").get();
  return NextResponse.json({ personas: snap.docs.map((d) => serialize({ id: d.id, ...d.data() })) });
}

export async function POST(req: NextRequest) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    siteId?: string; name: string; role: string; systemPrompt: string;
    tone?: string; language?: string;
  };
  if (!body.name || !body.role) return NextResponse.json({ error: "name and role required" }, { status: 400 });

  const personaId = `persona_${nanoid(8)}`;
  const doc = {
    personaId,
    name: body.name,
    role: body.role,
    systemPrompt: body.systemPrompt ?? "",
    tone: body.tone ?? "professional",
    language: body.language ?? "ko",
    createdAt: FieldValue.serverTimestamp(),
  };

  const colRef = body.siteId
    ? adminDb.collection("sites").doc(body.siteId).collection("personas")
    : adminDb.collection("personas");

  await colRef.doc(personaId).set(doc);
  return NextResponse.json({ personaId }, { status: 201 });
}
