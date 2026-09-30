import React from 'react';
import { BugRiskItem } from '../api/types';
import { Tooltip } from './Tooltip';
import { AlertCircle, Bug, CheckCircle2, XCircle, Code2, Clock } from 'lucide-react';

interface BugRiskCardProps {
  bugRisk?: BugRiskItem;
}

export const BugRiskCard: React.FC<BugRiskCardProps> = ({ bugRisk }) => {
  if (!bugRisk) {
    return (
      <div className="p-6 rounded-xl glass-panel text-center text-slate-500 text-sm">
        Bug risk data is pending or unavailable.
      </div>
    );
  }

  const penalty = bugRisk.penalty || 0;
  let severityLabel = 'Low Risk';
  let severityColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  let meaning = 'Few verified bug signals detected. Codebase appears relatively stable.';

  if (penalty >= 12) {
    severityLabel = 'High Risk';
    severityColor = 'text-rose-400 bg-rose-500/10 border-rose-500/30';
    meaning = 'Substantial bug signals detected (failing CI, open bug issues, or high lint density).';
  } else if (penalty >= 6) {
    severityLabel = 'Medium Risk';
    severityColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    meaning = 'Moderate bug signals detected. Review open issues and lint errors before deploying.';
  }

  return (
    <div className="space-y-6">
      {/* Risk Summary Header */}
      <div className="p-6 rounded-2xl glass-panel border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-slate-100">Verifiable Bug Risk Audit</h3>
            <Tooltip
              term="Verifiable Bug Signals"
              content="Proving code is 100% bug-free is scientifically impossible. RepoRevive measures verifiable bug signals: open bug-labeled issues, static lint density, CI conclusion, and TODO/FIXME markers."
            />
          </div>
          <p className="text-xs text-slate-400">{meaning}</p>
        </div>

        <div className="flex items-center gap-3">
          <span className={`px-3 py-1.5 rounded-xl border text-sm font-black uppercase ${severityColor}`}>
            {severityLabel}
          </span>
          <div className="text-right">
            <span className="text-[10px] text-slate-500 block uppercase">Deduction Penalty</span>
            <span className="text-sm font-mono font-bold text-rose-400">-{penalty}/20 pts</span>
          </div>
        </div>
      </div>

      {/* Signals Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Signal 1: Open Bug Issues */}
        <div className="p-4 rounded-xl glass-panel border-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300">Open Bug Issues</span>
            <Bug className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-black text-slate-100 mb-1">{bugRisk.openBugs}</div>
          <p className="text-[11px] text-slate-400">
            {bugRisk.openBugs === 0
              ? 'No unresolved bug-labeled issues on GitHub.'
              : `${bugRisk.openBugs} open community bug reports awaiting fixes.`}
          </p>
        </div>

        {/* Signal 2: Automated CI Status */}
        <div className="p-4 rounded-xl glass-panel border-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300">CI Build Status</span>
            {bugRisk.ciConclusion === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : bugRisk.ciConclusion === 'failure' ? (
              <XCircle className="w-4 h-4 text-rose-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-slate-500" />
            )}
          </div>
          <div className="text-lg font-bold text-slate-100 capitalize mb-1">
            {bugRisk.ciConclusion || 'No CI Runs'}
          </div>
          <p className="text-[11px] text-slate-400">
            {bugRisk.ciConclusion === 'success'
              ? 'Latest GitHub Actions workflow passed cleanly.'
              : bugRisk.ciConclusion === 'failure'
              ? 'Latest automated build/test workflow failed.'
              : 'No automated workflow conclusion recorded.'}
          </p>
        </div>

        {/* Signal 3: Static Lint Density */}
        <div className="p-4 rounded-xl glass-panel border-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300">Static Lint Errors</span>
            <Code2 className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-black text-slate-100 mb-1">
            {bugRisk.lintErrorsPer1k}
            <span className="text-xs font-normal text-slate-400"> /1k lines</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Checked via fixed Ruff (Python) & ESLint core rules; repo configs ignored for safety.
          </p>
        </div>

        {/* Signal 4: TODO / FIXME Density */}
        <div className="p-4 rounded-xl glass-panel border-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300">Unfinished Work Markers</span>
            <Clock className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-black text-slate-100 mb-1">
            {bugRisk.todoPer1k}
            <span className="text-xs font-normal text-slate-400"> /1k lines</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Density of TODO, FIXME, and HACK comment markers indicating incomplete logic.
          </p>
        </div>
      </div>
    </div>
  );
};
