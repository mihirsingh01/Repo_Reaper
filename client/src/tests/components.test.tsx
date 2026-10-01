import { describe, it, expect } from 'vitest';
import { Feature, QueryResultItem, CoverageFeatureItem } from '../api/types';

describe('Checklist and Feature Model Logic', () => {
  it('validates feature checklist constraints', () => {
    const features: Feature[] = [
      { id: 'f1', label: 'Auth', plainDescription: 'Login', keywords: ['jwt'], priority: 'must' },
      { id: 'f2', label: 'Inventory', plainDescription: 'Stock', keywords: ['sku'], priority: 'must' },
      { id: 'f3', label: 'Billing', plainDescription: 'Payments', keywords: ['stripe'], priority: 'nice' },
    ];

    expect(features.length).toBeGreaterThanOrEqual(3);
    expect(features.length).toBeLessThanOrEqual(10);

    const mustHaves = features.filter((f) => f.priority === 'must');
    expect(mustHaves.length).toBe(2);
  });

  it('validates BestMatch candidate score properties', () => {
    const candidate: QueryResultItem = {
      repoId: 'repo-12345',
      fullName: 'shoptrack/inventory-lite',
      relevance: 0.88,
      matchedTerms: ['inventory', 'stock', 'jwt'],
      coverage: 85.0,
      viability: 78.0,
      final: 0.841,
      license: { spdx: 'MIT', name: 'MIT License' },
      lastCommitAt: '2023-01-15T10:00:00Z',
    };

    expect(candidate.coverage).toBe(85.0);
    expect(candidate.viability).toBe(78.0);
    expect(candidate.license?.spdx).toBe('MIT');
    expect(candidate.matchedTerms).toContain('inventory');
  });

  it('verifies coverage feature item citations', () => {
    const coverageFeatures: CoverageFeatureItem[] = [
      {
        featureId: 'f1',
        label: 'JWT Authentication',
        priority: 'must',
        status: 'present',
        evidence: [
          {
            path: 'src/controllers/auth.js',
            lineRange: '15-20',
            snippet: 'jwt.verify(token, secret)',
            verified: true,
          },
        ],
      },
      {
        featureId: 'f2',
        label: 'Dark Mode Theme',
        priority: 'nice',
        status: 'missing',
        evidence: [],
      },
    ];

    expect(coverageFeatures[0].status).toBe('present');
    expect(coverageFeatures[0].evidence[0].verified).toBe(true);
    expect(coverageFeatures[1].status).toBe('missing');
  });
});
