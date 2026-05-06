import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { nanoid } from "nanoid";

export interface HealthAlert {
  severity: "low" | "medium" | "high" | "critical";
  category: string;
  title: string;
  message: string;
  siteId?: string;
}

export async function checkSiteHealth(siteId: string): Promise<HealthAlert[]> {
  const alerts: HealthAlert[] = [];
  const siteDoc = await adminDb.collection("child_sites").doc(siteId).get();
  if (!siteDoc.exists) return alerts;

  const site = siteDoc.data()!;
  const siteName: string = site.displayName ?? site.name ?? siteId;

  // 1. Check for recent failed posts
  const failedSnap = await adminDb
    .collection("sites").doc(siteId).collection("curated_posts")
    .where("publishStatus", "==", "failed")
    .orderBy("createdAt", "desc")
    .limit(5)
    .get();

  if (failedSnap.size >= 3) {
    alerts.push({
      severity: "high",
      category: "pipeline",
      title: `${siteName}: 연속 발행 실패`,
      message: `최근 ${failedSnap.size}개 글 발행이 실패했습니다. 파이프라인을 확인하세요.`,
      siteId,
    });
  }

  // 2. Check last publish date
  const publishedSnap = await adminDb
    .collection("sites").doc(siteId).collection("curated_posts")
    .where("publishStatus", "==", "published")
    .orderBy("publishedAt", "desc")
    .limit(1)
    .get();

  if (!publishedSnap.empty) {
    const lastPublished = publishedSnap.docs[0].data().publishedAt?.toDate?.() as Date | undefined;
    if (lastPublished) {
      const daysSince = (Date.now() - lastPublished.getTime()) / (1000 * 60 * 60 * 24);
      const phase = site.currentPhase ?? "authority";
      const expectedFreq = phase === "authority" ? 7 : 2; // days

      if (daysSince > expectedFreq * 2) {
        alerts.push({
          severity: daysSince > 14 ? "high" : "medium",
          category: "publishing",
          title: `${siteName}: 발행 지연`,
          message: `마지막 발행으로부터 ${Math.floor(daysSince)}일이 지났습니다.`,
          siteId,
        });
      }
    }
  } else if (site.status === "active") {
    alerts.push({
      severity: "medium",
      category: "publishing",
      title: `${siteName}: 발행된 글 없음`,
      message: "활성 사이트이지만 발행된 글이 없습니다.",
      siteId,
    });
  }

  // 3. Phase 1: check if outline exists and is approved
  if (site.currentPhase === "authority") {
    const approvedOutline = await adminDb
      .collection("sites").doc(siteId).collection("outline")
      .where("status", "==", "approved")
      .limit(1)
      .get();

    const totalOutline = await adminDb
      .collection("sites").doc(siteId).collection("outline")
      .count()
      .get();

    if (totalOutline.data().count === 0) {
      alerts.push({
        severity: "medium",
        category: "content",
        title: `${siteName}: 아웃라인 미생성`,
        message: "Phase 1이지만 아웃라인이 아직 생성되지 않았습니다.",
        siteId,
      });
    } else if (approvedOutline.empty) {
      alerts.push({
        severity: "low",
        category: "content",
        title: `${siteName}: 승인된 아웃라인 없음`,
        message: "아웃라인이 있지만 승인된 항목이 없습니다.",
        siteId,
      });
    }
  }

  // 4. Phase 2: check if RSS sources exist
  if (site.currentPhase === "ongoing") {
    const sourcesSnap = await adminDb
      .collection("sites").doc(siteId).collection("sources")
      .where("enabled", "==", true)
      .limit(1)
      .get();

    if (sourcesSnap.empty) {
      alerts.push({
        severity: "high",
        category: "sources",
        title: `${siteName}: RSS 출처 없음`,
        message: "Phase 2이지만 활성화된 RSS 출처가 없습니다.",
        siteId,
      });
    }
  }

  return alerts;
}

export async function persistAlerts(alerts: HealthAlert[]): Promise<void> {
  if (alerts.length === 0) return;

  const batch = adminDb.batch();
  for (const alert of alerts) {
    const alertId = `alert_${nanoid(10)}`;
    const ref = adminDb.collection("alerts").doc(alertId);
    batch.set(ref, {
      alertId,
      ...alert,
      status: "open",
      createdAt: FieldValue.serverTimestamp(),
    });

    // Update site health status
    if (alert.siteId) {
      const worstSeverity = alerts
        .filter((a) => a.siteId === alert.siteId)
        .reduce((worst, a) => {
          const order = { low: 0, medium: 1, high: 2, critical: 3 };
          return order[a.severity] > order[worst] ? a.severity : worst;
        }, "low" as HealthAlert["severity"]);

      adminDb.collection("child_sites").doc(alert.siteId).update({
        "healthStatus.overall": worstSeverity === "low" ? "healthy" : worstSeverity === "medium" ? "warning" : "critical",
        "healthStatus.checkedAt": FieldValue.serverTimestamp(),
      }).catch(() => {});
    }
  }
  await batch.commit();
}
