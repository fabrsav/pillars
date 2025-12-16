import { describe, it, expect } from 'vitest';
import { buildRefundsContext, parseAnalysisResponse } from '../refundAnalysis';

describe('refundAnalysis helpers', () => {
  it('builds context string with expected fields', () => {
    const refunds = [{ id: 1, platform: 'Amazon', item: 'Cuffie', status: 'Da Fare', notes: 'test note', history: [{ timestamp: '2025-11-01' }] }];
    const ctx = buildRefundsContext(refunds);
    expect(ctx).toContain('IDX:0');
    expect(ctx).toContain('platform:Amazon');
    expect(ctx).toContain('Cuffie');
  });

  it('parses JSON response even with code fences and extra text', () => {
    const text = "Some intro text\n```json\n{\n  \"stale\": [{\"index\":0,\"id\":1,\"item\":\"Cuffie\",\"platform\":\"Amazon\",\"daysPending\":30,\"reason\":\"No update\"}],\n  \"needsUpdate\": [],\n  \"summary\": \"Found 1 stale\"\n}\n```\nSome footer";
    const parsed = parseAnalysisResponse(text);
    expect(parsed.summary).toBe('Found 1 stale');
    expect(Array.isArray(parsed.stale)).toBe(true);
    expect(parsed.stale[0].item).toBe('Cuffie');
  });

  it('fills missing arrays when absent', () => {
    const text = '{"summary":"empty"}';
    const parsed = parseAnalysisResponse(text);
    expect(Array.isArray(parsed.stale)).toBe(true);
    expect(Array.isArray(parsed.needsUpdate)).toBe(true);
    expect(parsed.summary).toBe('empty');
  });
});
