import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifySession } from "@/lib/auth";
import { serialize } from "@/lib/serialize";
import { Timestamp } from "firebase-admin/firestore";
import type { ChildSite } from "@/types";

export async function GET() {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const snapshot = await adminDb.collection("child_sites").orderBy("createdAt", "desc").get();
    const sites = snapshot.docs.map((d) => serialize(d.data()));
    return NextResponse.json({ sites });
  } catch (err) {
    console.error("GET /api/sites:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const {
      name, siteId, topic, language, description,
      keywords, metaTitle,
      hostingType, domain, vercelProjectId,
      tistoryBlogName, tistoryBlogUrl,
      bloggerBlogId, bloggerBlogUrl,
      persona, tone, sections, sourceUrls,
      phase1MinArticles, phase1MinDays,
    } = body;

    if (!siteId || !name || !topic || !hostingType) {
      return NextResponse.json({ error: "필수 필드가 누락되었습니다" }, { status: 400 });
    }

    const existing = await adminDb.collection("child_sites").doc(siteId).get();
    if (existing.exists) {
      return NextResponse.json({ error: "이미 존재하는 siteId입니다" }, { status: 409 });
    }

    let hostingConfig: ChildSite["hostingConfig"];
    if (hostingType === "nextjs") {
      hostingConfig = { type: "nextjs", domain: domain ?? "", vercelProjectId: vercelProjectId ?? "", vercelDeploymentUrl: "" };
    } else if (hostingType === "tistory") {
      hostingConfig = { type: "tistory", blogName: tistoryBlogName ?? "", blogUrl: tistoryBlogUrl ?? "", accessTokenSecretKey: "" };
    } else {
      hostingConfig = { type: "blogger", blogId: bloggerBlogId ?? "", blogUrl: bloggerBlogUrl ?? "", serviceAccountSecretKey: "" };
    }

    const canonicalDomain =
      hostingType === "nextjs" ? (domain ?? "") :
      hostingType === "tistory" ? (tistoryBlogUrl ?? "") :
      (bloggerBlogUrl ?? "");

    const now = Timestamp.now();

    const siteData: Record<string, unknown> = {
      siteId,
      name,
      displayName: name,
      topic,
      language: language ?? "ko",
      persona: persona ?? "friendly_expert",
      tone: tone ?? "friendly",
      hostingType,
      hostingConfig,
      currentPhase: "authority",
      phase1Config: {
        minArticles: phase1MinArticles ?? 20,
        minDays: phase1MinDays ?? 7,
        transitionedAt: null,
      },
      sections: (sections ?? []).map((s: { name: string; slug: string; publishFrequency: string; enabled: boolean }, idx: number) => ({
        sectionId: `${siteId}-sec-${idx}`,
        name: s.name,
        slug: s.slug,
        enabled: s.enabled,
        publishFrequency: s.publishFrequency,
        sourceIds: [],
        schedule: { cronExpression: "0 9 * * *" },
      })),
      seoConfig: {
        siteDescription: description ?? "",
        siteKeywords: Array.isArray(keywords) ? keywords : [],
        metaTitle: metaTitle ?? "",
        ogImageUrl: "",
        canonicalDomain,
        searchConsoleVerified: false,
      },
      monetization: { affiliatePool: {}, slotsEnabled: [], enabled: false },
      analytics: { vercelAnalyticsEnabled: false },
      status: "active",
      healthStatus: { overall: "healthy", lastHealthCheck: now, issues: [] },
      stats: { totalPosts: 0, publishedPosts: 0, draftPosts: 0, failedPosts: 0 },
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
    };

    await adminDb.collection("child_sites").doc(siteId).set(siteData);

    // 출처 등록
    if (sourceUrls?.length > 0) {
      const batch = adminDb.batch();
      for (const src of sourceUrls) {
        const ref = adminDb.collection("sites").doc(siteId).collection("sources").doc();
        batch.set(ref, {
          sourceId: ref.id,
          siteId,
          name: src.name || src.url,
          url: src.url,
          type: src.type || "rss_feed",
          language: language ?? "ko",
          isActive: true,
          checkFrequency: "daily",
          failureCount: 0,
          totalArticlesSourced: 0,
          sectionIds: [],
          createdAt: now,
          updatedAt: now,
        });
      }
      await batch.commit();
    }

    return NextResponse.json({ siteId, ok: true }, { status: 201 });
  } catch (err) {
    console.error("POST /api/sites:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
