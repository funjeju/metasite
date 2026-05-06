import { writeArticle } from "./writer";
import { verifyArticle } from "./verifier";
import { editArticle } from "./editor";
import { resolveInternalLinks } from "./internal-linker";
import { runDuplicateCheck, contentHash } from "./duplicate-check";
import { injectAdSlots } from "@/lib/ads/injector";
import { sumUsage } from "./cost";
import { adminDb } from "@/lib/firebase-admin";
import type { EditedArticle, SiteContext, AiUsage } from "./types";

export interface PipelineInput {
  ctx: SiteContext;
  title: string;
  angle: string;
  targetKeyword: string;
  summaries?: string[];
  sourceUrls?: string[];
  skipDuplicateCheck?: boolean;
}

export class DuplicateError extends Error {
  constructor(public reason: string, public level: number) {
    super(`Duplicate detected (L${level}): ${reason}`);
  }
}

export async function runPipeline(input: PipelineInput): Promise<EditedArticle> {
  const draft = await writeArticle(
    input.ctx,
    input.title,
    input.angle,
    input.targetKeyword,
    input.summaries
  );

  if (!input.skipDuplicateCheck) {
    const dupResult = await runDuplicateCheck(input.ctx.siteId, {
      title: draft.title,
      slug: draft.slug,
      content: draft.body,
      sourceUrls: input.sourceUrls,
    });
    if (dupResult.isDuplicate) {
      throw new DuplicateError(dupResult.reason, dupResult.level!);
    }
  }

  const verified = await verifyArticle(draft, input.ctx);
  const edited = await editArticle(verified, input.ctx, input.targetKeyword);

  // Accumulate AI costs from all three steps
  const aiUsage: AiUsage = sumUsage([draft._usage, verified._usage, edited._usage]);
  (edited as unknown as { aiUsage: AiUsage }).aiUsage = aiUsage;

  // Resolve internal link markers in HTML
  edited.bodyHtml = await resolveInternalLinks(
    input.ctx.siteId,
    edited.bodyHtml,
    input.ctx.canonicalDomain
  );

  // Inject ad slots if site has AdSense configured
  const siteDoc = await adminDb.collection("child_sites").doc(input.ctx.siteId).get();
  const siteData = siteDoc.data() ?? {};
  const adClientId: string = siteData.monetization?.adsenseClientId ?? "";
  const adSlotId: string = siteData.monetization?.adsenseSlotId ?? "";
  if (adClientId && adSlotId && edited.adSlots?.length) {
    edited.bodyHtml = injectAdSlots(edited.bodyHtml, edited.adSlots, adClientId, adSlotId);
  }

  // Attach content hash for future duplicate checks
  (edited as unknown as { contentHash: string }).contentHash = contentHash(draft.body);

  return edited;
}
