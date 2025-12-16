// Helpers to build prompt context and parse AI analysis responses for refunds
export const buildRefundsContext = (refunds = []) => {
  return refunds.map((r, idx) => {
    const lastHistory = (r.history && r.history[0] && r.history[0].timestamp) || '';
    return `[IDX:${idx}] id:${r.id} | platform:${r.platform||'N/A'} | item:${r.item||'N/A'} | status:${r.status||'N/A'} | requestDate:${r.requestDate||''} | arrivalDate:${r.arrivalDate||''} | notes:${(r.notes||'').replace(/\n/g,' ')} | lastHistory:${lastHistory} | tracking:${r.trackingCode||''} | pickup:${r.pickupCode||''}`;
  }).join('\n');
};

export const parseAnalysisResponse = (resText) => {
  if (!resText) throw new Error('Empty response');
  let jsonStr = String(resText).replace(/```json/g, '').replace(/```/g, '').trim();
  const match = jsonStr.match(/\{[\s\S]*\}/);
  if (match) jsonStr = match[0];
  const parsed = JSON.parse(jsonStr);
  parsed.stale = parsed.stale || [];
  parsed.needsUpdate = parsed.needsUpdate || [];
  parsed.summary = parsed.summary || '';
  return parsed;
};

export default {
  buildRefundsContext,
  parseAnalysisResponse
};
