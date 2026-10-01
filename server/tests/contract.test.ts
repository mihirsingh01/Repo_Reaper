import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';

// Define exact Zod contracts representing the FastAPI AI Service schemas
const FeatureSpecSchema = z.object({
  id: z.string(),
  label: z.string(),
  plainDescription: z.string(),
  keywords: z.array(z.string()),
  priority: z.enum(['must', 'nice']),
});

const IdeaSpecSchema = z.object({
  summary: z.string(),
  targetUsers: z.array(z.string()),
  features: z.array(FeatureSpecSchema).min(3).max(10),
  clarifications: z.array(z.string()).optional(),
});

const MatchItemSchema = z.object({
  repoId: z.string(),
  relevance: z.number().min(0).max(1),
  matchedTerms: z.array(z.string()),
  expansionsUsed: z.array(z.any()).optional(),
});

const AnalysisReportSchema = z.object({
  status: z.enum(['done', 'partial', 'failed']),
  repoFullName: z.string(),
  facts: z.object({
    fullName: z.string(),
    defaultBranch: z.string(),
    commitCount: z.number(),
    contributorCount: z.number(),
    language: z.string().nullable().optional(),
    stars: z.number(),
    licenseSpdx: z.string().nullable().optional(),
  }).optional(),
  coverage: z.object({
    score: z.number().min(0).max(100),
    features: z.array(z.object({
      featureId: z.string(),
      label: z.string(),
      priority: z.enum(['must', 'nice']),
      status: z.enum(['present', 'partial', 'missing']),
      evidence: z.array(z.object({
        path: z.string(),
        snippet: z.string().max(200),
        verified: z.boolean().optional(),
      })),
    })),
  }).optional(),
  viability: z.number().min(0).max(100).optional(),
  confidence: z.number().min(0).max(1).optional(),
  verdict: z.string().optional(),
  flags: z.array(z.string()),
  revivalPlan: z.object({
    gaps: z.array(z.string()),
    steps: z.array(z.object({
      order: z.number(),
      title: z.string(),
      description: z.string(),
      effortHours: z.number(),
    })),
    effortHours: z.object({
      min: z.number(),
      max: z.number(),
    }),
    risks: z.array(z.string()),
  }).optional(),
  founderBrief: z.string().optional(),
  trace: z.array(z.any()),
  tokenUsage: z.object({
    totalTokens: z.number(),
  }),
});

describe('Express <-> FastAPI Schema Contract Validation', () => {
  it('validates POST /ideas/refine response contract', () => {
    const mockRefineResponse = {
      summary: 'A stock management tool for small retail stores with barcode scanning.',
      targetUsers: ['Small shop owners', 'Retail managers'],
      features: [
        {
          id: 'f1',
          label: 'Inventory SKU Tracking',
          plainDescription: 'Track item quantities by SKU',
          keywords: ['inventory', 'sku', 'stock'],
          priority: 'must',
        },
        {
          id: 'f2',
          label: 'Barcode Scanning',
          plainDescription: 'Scan barcode numbers via device camera',
          keywords: ['barcode', 'scanner', 'upc'],
          priority: 'must',
        },
        {
          id: 'f3',
          label: 'Low Stock WhatsApp Alerts',
          plainDescription: 'Send automated alerts when stock drops',
          keywords: ['alert', 'whatsapp', 'notification'],
          priority: 'nice',
        },
      ],
      clarifications: [],
    };

    const parsed = IdeaSpecSchema.safeParse(mockRefineResponse);
    expect(parsed.success).toBe(true);
  });

  it('validates POST /nlp/match response contract', () => {
    const mockMatchResponse = [
      {
        repoId: '507f1f77bcf86cd799439011',
        relevance: 0.865,
        matchedTerms: ['inventory', 'stock', 'barcode'],
        expansionsUsed: [{ term: 'stock', expandedTo: ['sku', 'inventory'], weight: 0.5 }],
      },
    ];

    const parsed = z.array(MatchItemSchema).safeParse(mockMatchResponse);
    expect(parsed.success).toBe(true);
  });

  it('validates POST /agents/analyze response contract', () => {
    const mockAnalysisResponse = {
      status: 'done',
      repoFullName: 'shoptrack/inventory-lite',
      facts: {
        fullName: 'shoptrack/inventory-lite',
        defaultBranch: 'main',
        commitCount: 68,
        contributorCount: 3,
        language: 'JavaScript',
        stars: 142,
        licenseSpdx: 'MIT',
      },
      coverage: {
        score: 80.0,
        features: [
          {
            featureId: 'f1',
            label: 'Inventory Tracking',
            priority: 'must',
            status: 'present',
            evidence: [
              {
                path: 'src/inventory.js',
                snippet: 'class InventoryManager { updateStock() {} }',
                verified: true,
              },
            ],
          },
        ],
      },
      viability: 82.5,
      confidence: 1.0,
      verdict: 'Ready to build on',
      flags: [],
      revivalPlan: {
        gaps: ['Low stock SMS alerts not configured'],
        steps: [
          {
            order: 1,
            title: 'Modernize Node.js runtime',
            description: 'Upgrade dependencies and runtime to Node 20',
            effortHours: 8,
          },
        ],
        effortHours: { min: 20, max: 40 },
        risks: ['Abandoned for 18 months; third-party APIs need verification'],
      },
      founderBrief: '# Founder Brief\nRepository is viable.',
      trace: [
        {
          step: 1,
          agent: 'Scout',
          tool: 'github_tree',
          tokensIn: 100,
          tokensOut: 50,
          latencyMs: 120,
        },
      ],
      tokenUsage: { totalTokens: 1500 },
    };

    const parsed = AnalysisReportSchema.safeParse(mockAnalysisResponse);
    expect(parsed.success).toBe(true);
  });
});
