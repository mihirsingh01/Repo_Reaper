import { describe, it, expect } from "vitest";
import {
  computeFinalScore,
  hasBlockingFlag,
  rankCandidates,
  Candidate,
  DEFAULT_WEIGHTS,
} from "../src/services/ranking.js";

describe("Ranking Service – Unit Tests", () => {
  describe("computeFinalScore", () => {
    it.each([
      {
        relevance: 1.0,
        coverage: 100,
        viability: 100,
        expected: 1.0,
      },
      {
        relevance: 0.8,
        coverage: 60,
        viability: 70,
        // 0.40 * 0.8 + 0.30 * 0.60 + 0.30 * 0.70 = 0.32 + 0.18 + 0.21 = 0.71
        expected: 0.71,
      },
      {
        relevance: 0.5,
        coverage: 50,
        viability: 50,
        // 0.40 * 0.5 + 0.30 * 0.5 + 0.30 * 0.5 = 0.5
        expected: 0.5,
      },
      {
        relevance: 0.9,
        coverage: 0,
        viability: 0,
        // 0.40 * 0.9 = 0.36
        expected: 0.36,
      },
    ])(
      "computes final score accurately for relevance=$relevance, coverage=$coverage, viability=$viability",
      ({ relevance, coverage, viability, expected }) => {
        const score = computeFinalScore(relevance, coverage, viability, DEFAULT_WEIGHTS);
        expect(score).toBeCloseTo(expected, 4);
      }
    );

    it("returns undefined when coverage or viability are undefined", () => {
      expect(computeFinalScore(0.8, undefined, 70)).toBeUndefined();
      expect(computeFinalScore(0.8, 60, undefined)).toBeUndefined();
    });
  });

  describe("hasBlockingFlag", () => {
    it("identifies all four blocking flags", () => {
      expect(hasBlockingFlag(["NO_LICENSE"])).toBe(true);
      expect(hasBlockingFlag(["ARCHIVED"])).toBe(true);
      expect(hasBlockingFlag(["EMPTY_REPO"])).toBe(true);
      expect(hasBlockingFlag(["CRITICAL_VULN"])).toBe(true);
    });

    it("is case-insensitive", () => {
      expect(hasBlockingFlag(["no_license"])).toBe(true);
      expect(hasBlockingFlag(["archived"])).toBe(true);
    });

    it("returns false for warning flags or empty flags", () => {
      expect(hasBlockingFlag([])).toBe(false);
      expect(hasBlockingFlag(["CI_FAILING", "UNPARSEABLE_MANIFEST"])).toBe(false);
      expect(hasBlockingFlag(["LOW_STARS", "FEW_CONTRIBUTORS"])).toBe(false);
    });
  });

  describe("rankCandidates", () => {
    it("ranks candidates in descending order of final score", () => {
      const candidates: Candidate[] = [
        { repoId: "r1", relevance: 0.6, coverage: 60, viability: 60 }, // 0.60
        { repoId: "r2", relevance: 0.9, coverage: 90, viability: 90 }, // 0.90
        { repoId: "r3", relevance: 0.75, coverage: 75, viability: 75 }, // 0.75
      ];

      const { ranked, bestMatch, alternatives } = rankCandidates(candidates);

      expect(ranked[0].repoId).toBe("r2");
      expect(ranked[1].repoId).toBe("r3");
      expect(ranked[2].repoId).toBe("r1");
      expect(bestMatch?.repoId).toBe("r2");
      expect(alternatives).toHaveLength(2);
      expect(alternatives[0].repoId).toBe("r3");
      expect(alternatives[1].repoId).toBe("r1");
    });

    it("disqualifies repos with NO_LICENSE from being Best match, even with higher score", () => {
      const candidates: Candidate[] = [
        {
          repoId: "unlicensed-winner",
          relevance: 0.99,
          coverage: 95,
          viability: 95,
          flags: ["NO_LICENSE"], // Disqualified!
        },
        {
          repoId: "licensed-clean",
          relevance: 0.8,
          coverage: 75,
          viability: 80,
          flags: [],
        },
        {
          repoId: "licensed-alt",
          relevance: 0.7,
          coverage: 70,
          viability: 70,
          flags: [],
        },
      ];

      const { bestMatch, alternatives, ranked } = rankCandidates(candidates);

      // Unlicensed is still ranked #1 by pure score
      expect(ranked[0].repoId).toBe("unlicensed-winner");

      // But bestMatch MUST be the licensed candidate!
      expect(bestMatch).not.toBeNull();
      expect(bestMatch?.repoId).toBe("licensed-clean");
      expect(bestMatch?.flags).not.toContain("NO_LICENSE");

      // Alternatives should contain remaining candidates
      expect(alternatives.map((a) => a.repoId)).toContain("unlicensed-winner");
      expect(alternatives.map((a) => a.repoId)).toContain("licensed-alt");
    });

    it("disqualifies repos with ARCHIVED, EMPTY_REPO, and CRITICAL_VULN from Best match", () => {
      const candidates: Candidate[] = [
        {
          repoId: "archived-repo",
          relevance: 0.95,
          coverage: 90,
          viability: 90,
          flags: ["ARCHIVED"],
        },
        {
          repoId: "vuln-repo",
          relevance: 0.92,
          coverage: 88,
          viability: 88,
          flags: ["CRITICAL_VULN"],
        },
        {
          repoId: "valid-candidate",
          relevance: 0.75,
          coverage: 70,
          viability: 75,
          flags: [],
        },
      ];

      const { bestMatch } = rankCandidates(candidates);
      expect(bestMatch?.repoId).toBe("valid-candidate");
    });

    it("tie-break 1: picks candidate with lower bugRiskPenalty when final scores are identical", () => {
      const candidates: Candidate[] = [
        {
          repoId: "high-bugs",
          relevance: 0.8,
          coverage: 80,
          viability: 80,
          final: 0.8,
          bugRiskPenalty: 12,
          lastCommitAt: "2023-01-01T00:00:00Z",
        },
        {
          repoId: "low-bugs",
          relevance: 0.8,
          coverage: 80,
          viability: 80,
          final: 0.8,
          bugRiskPenalty: 3, // Lower penalty wins!
          lastCommitAt: "2023-01-01T00:00:00Z",
        },
      ];

      const { bestMatch } = rankCandidates(candidates);
      expect(bestMatch?.repoId).toBe("low-bugs");
    });

    it("tie-break 2: picks candidate with newer lastCommitAt when scores and bug penalties are equal", () => {
      const candidates: Candidate[] = [
        {
          repoId: "older-commit",
          relevance: 0.8,
          coverage: 80,
          viability: 80,
          final: 0.8,
          bugRiskPenalty: 4,
          lastCommitAt: "2022-06-01T00:00:00Z",
        },
        {
          repoId: "newer-commit",
          relevance: 0.8,
          coverage: 80,
          viability: 80,
          final: 0.8,
          bugRiskPenalty: 4,
          lastCommitAt: "2023-09-01T00:00:00Z", // Newer date wins!
        },
      ];

      const { bestMatch } = rankCandidates(candidates);
      expect(bestMatch?.repoId).toBe("newer-commit");
    });
  });
});
