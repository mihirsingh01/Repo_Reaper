import React from 'react';
import { SubScoresItem } from '../api/types';
import { Tooltip } from './Tooltip';

interface ScoreBreakdownProps {
  subScores?: SubScoresItem;
  viability?: number;
  confidence?: number;
}

interface CategoryConfig {
  key: keyof SubScoresItem;
  label: string;
  max: number;
  tooltip: string;
  color: string;
}

const CATEGORIES: CategoryConfig[] = [
  {
    key: 'structure',
    label: 'Codebase Structure',
    max: 15,
    tooltip: 'Evaluates detected entry points, standard layout folders (src/lib), and low stub/placeholder ratio.',
    color: 'bg-emerald-500',
  },
  {
    key: 'bugRisk',
    label: 'Bug Risk Health',
    max: 20,
    tooltip: '20 minus deductions for open bug issues, static lint density, failing CI, and unfinished TODOs.',
    color: 'bg-teal-500',
  },
  {
    key: 'deps',
    label: 'Dependency Health',
    max: 15,
    tooltip: 'Ratio of modern active packages and absence of known CVE vulnerabilities in OSV.dev database.',
    color: 'bg-cyan-500',
  },
  {
    key: 'docs',
    label: 'Documentation',
    max: 10,
    tooltip: 'Presence of comprehensive README with setup, usage examples, and architecture sections.',
    color: 'bg-sky-500',
  },
  {
    key: 'license',
    label: 'License Reusability',
    max: 15,
    tooltip: 'Permissive (MIT/Apache)=15 pts; Weak copyleft=10 pts; Strong copyleft=5 pts; No license=0 pts.',
    color: 'bg-indigo-500',
  },
  {
    key: 'history',
    label: 'Commit & Contributor History',
    max: 10,
    tooltip: 'Active development volume before abandonment (>=30 commits) and multiple human contributors.',
    color: 'bg-violet-500',
  },
  {
    key: 'tests',
    label: 'Automated Tests & CI',
    max: 15,
    tooltip: 'Presence of automated test files (test/spec) and passing CI status.',
    color: 'bg-purple-500',
  },
];

export const ScoreBreakdown: React.FC<ScoreBreakdownProps> = ({
  subScores = {},
  viability,
  confidence,
}) => {
  return (
    <div className="space-y-6">
      {/* Header with confidence meter */}
      <div className="p-6 rounded-2xl glass-panel border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <span>Viability Sub-Score Rubric</span>
            <Tooltip
              term="Viability Rubric"
              content="All sub-scores are calculated by pure deterministic code per docs/SCORING_RUBRIC.md. If a worker times out, scores are mathematically re-normalized over known points."
            />
          </h3>
          <p className="text-xs text-slate-400">
            Total possible score: 100 points across 7 objective maintainability dimensions.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-[10px] text-slate-500 block uppercase">Confidence Level</span>
            <span className="text-sm font-mono font-bold text-cyan-400">
              {confidence !== undefined ? `${Math.round(confidence * 100)}%` : '100%'}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-500 block uppercase">Overall Viability</span>
            <span className="text-xl font-black text-emerald-400">
              {viability !== undefined ? Math.round(viability) : '--'}/100
            </span>
          </div>
        </div>
      </div>

      {/* 7 Sub-score visual progress bars */}
      <div className="p-6 rounded-2xl glass-panel border-slate-800 space-y-5">
        {CATEGORIES.map((cat) => {
          const val = subScores[cat.key];
          const isUnknown = val === undefined || val === null;
          const points = isUnknown ? 0 : val;
          const pct = Math.min(100, Math.max(0, (points / cat.max) * 100));

          return (
            <div key={cat.key} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-200">{cat.label}</span>
                  <Tooltip term={cat.label} content={cat.tooltip} />
                </div>

                <div className="font-mono text-xs">
                  {isUnknown ? (
                    <span className="text-slate-500">Unmeasured</span>
                  ) : (
                    <span className="text-slate-200 font-bold">
                      {points} <span className="text-slate-500 font-normal">/ {cat.max} pts</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${isUnknown ? 'bg-slate-700' : cat.color}`}
                  style={{ width: `${isUnknown ? 0 : pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
