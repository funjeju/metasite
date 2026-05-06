// Injects AdSense display ads into HTML body at paragraph indices specified by adSlots

export function injectAdSlots(
  bodyHtml: string,
  adSlots: number[],
  adClientId: string,
  adSlotId: string
): string {
  if (!adClientId || !adSlotId || adSlots.length === 0) return bodyHtml;

  const adTag = `<div class="ad-slot my-6">
<ins class="adsbygoogle"
  style="display:block"
  data-ad-client="${adClientId}"
  data-ad-slot="${adSlotId}"
  data-ad-format="auto"
  data-full-width-responsive="true"></ins>
<script>(adsbygoogle=window.adsbygoogle||[]).push({});</script>
</div>`;

  // Split on closing </p> tags, preserving each segment
  const parts = bodyHtml.split(/(<\/p>)/i);
  // parts alternates: content, "</p>", content, "</p>", ...
  // Each paragraph occupies indices [2*i, 2*i+1] in the parts array
  const slotSet = new Set(adSlots);
  const result: string[] = [];
  let paraIndex = 0;

  for (let i = 0; i < parts.length; i++) {
    result.push(parts[i]);
    if (/^<\/p>$/i.test(parts[i])) {
      // We just closed paragraph #paraIndex
      if (slotSet.has(paraIndex)) {
        result.push(adTag);
      }
      paraIndex++;
    }
  }

  return result.join("");
}
