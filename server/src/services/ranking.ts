import { env } from "../config/env.js";

export const BLOCKING_FLAGS = [
  "NO_LICENSE",
  "ARCHIVED",
  "EMPTY_REPO",
  "CRITICAL_VULN",
] as const;

export type BlockingFlag = (typeof BLOCKING_FLAGS)[number];

export interface RankingWeights {
  wRelevance: number;
  wCoverage: number;
  wViability: number;
}

export const DEFAULT_WEIGHTS: RankingWeights = {
  wRelevance: env.RANK_W_RELEVANCE ?? 0.4,
  wCoverage: env.RANK_W_COVERAGE ?? 0.3,
  wViability: env.RANK_W_VIABILITY ?? 0.3,
};

export interface Candidate {
  repoId: string;
  fullName?: string;
  relevance: number; // 0 - 1
  coverage?: number; // 0 - 100
  viability?: number; // 0 - 100
  bugRiskPenalty?: number;
  lastCommitAt?: Date | string;
  flags?: string[];
  final?: number;
  [key: string]: any;
}

export interface RankedOutput<T extends Candidate = Candidate> {
  ranked: T[];
  bestMatch: T | null;
  alternatives: T[];
}

/**
 * Computes deterministic final score:
 * final = w_rel * relevance + w_cov * (coverage / 100) + w_viab * (viability / 100)
 */
export function computeFinalScore(
  relevance: number,
  coverage?: number,
  viability?: number,
  weights: RankingWeights = DEFAULT_WEIGHTS
): number | undefined {
  if (coverage === undefined || viability === undefined) {
    return undefined;
  }
  const score =
    weights.wRelevance * relevance +
    weights.wCoverage * (coverage / 100) +
    weights.wViability * (viability / 100);

  return Math.round(score * 10000) / 10000;
}

/**
 * Checks if a candidate contains any disqualifying blocking flag.
 */
export function hasBlockingFlag(flags: string[] = []): boolean {
  const upperFlags = flags.map((f) => f.toUpperCase());
  return BLOCKING_FLAGS.some((bf) => upperFlags.includes(bf));
}

/**
 * Compares two candidates with final scores:
 * 1. Higher final score wins.
 * 2. Tie-break 1: Lower bug-risk penalty wins.
 * 3. Tie-break 2: Newer lastCommitAt wins.
 */
export function compareCandidates<T extends Candidate>(a: T, b: T): number {
  const scoreA = a.final ?? -1;
  const scoreB = b.final ?? -1;

  if (scoreB !== scoreA) {
    return scoreB - scoreA;
  }

  // Tie-breaker 1: Lower bug risk penalty
  const penaltyA = a.bugRiskPenalty ?? 0;
  const penaltyB = b.bugRiskPenalty ?? 0;
  if (penaltyA !== penaltyB) {
    return penaltyA - penaltyB;
  }

  // Tie-breaker 2: Newer last commit date
  const dateA = a.lastCommitAt ? new Date(a.lastCommitAt).getTime() : 0;
  const dateB = b.lastCommitAt ? new Date(b.lastCommitAt).getTime() : 0;
  return dateB - dateA;
}

/**
 * Ranks all candidates, calculates final scores, and selects:
 * - bestMatch: highest final score without blocking flags.
 * - alternatives: next 2 eligible or remaining candidates.
 */
export function rankCandidates<T extends Candidate>(
  candidates: T[],
  weights: RankingWeights = DEFAULT_WEIGHTS
): RankedOutput<T> {
  const scored = candidates.map((c) => ({
    ...c,
    final:
      c.final !== undefined
        ? c.final
        : computeFinalScore(c.relevance, c.coverage, c.viability, weights),
  }));

  const ranked = [...scored].sort(compareCandidates);

  // Eligible candidates for Best Match (must have final score & no blocking flags)
  const eligible = ranked.filter(
    (c) => c.final !== undefined && !hasBlockingFlag(c.flags || [])
  );

  const bestMatch = eligible.length > 0 ? eligible[0] : null;

  // Alternatives: next top candidates excluding the bestMatch
  const remaining = ranked.filter((c) => c.repoId !== bestMatch?.repoId);
  const alternatives = remaining.slice(0, 2);

  return {
    ranked,
    bestMatch,
    alternatives,
  };
}
