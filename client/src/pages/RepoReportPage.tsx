import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { analysesApi } from '../api/analyses';
import { AnalysisDetail } from '../api/types';
import { CoverageTable } from '../components/CoverageTable';
import { BugRiskCard } from '../components/BugRiskCard';
import { ScoreBreakdown } from '../components/ScoreBreakdown';
import { DependenciesTable } from '../components/DependenciesTable';
import { RevivalPlanView } from '../components/RevivalPlanView';
import { AgentTraceView } from '../components/AgentTraceView';
import { Tooltip } from '../components/Tooltip';
import { formatScore, getVerdictBadgeColor, getLicenseBadgeColor, timeAgo } from '../utils/formatters';
import {
  FileText,
  ExternalLink,
  ShieldAlert,
  GitBranch,
  Star,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  Clock,
  ArrowLeft,
  Download,
} from 'lucide-react';

type TabKey = 'summary' | 'coverage' | 'bugRisk' | 'scores' | 'deps' | 'plan' | 'trace';

export const RepoReportPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [analysis, setAnalysis] = useState<AnalysisDetail | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('summary');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    analysesApi
      .getAnalysis(id)
      .then((data) => {
        setAnalysis(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Failed to load analysis report.');
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <h3 className="text-lg font-bold text-slate-100">Loading Deep Analysis Report...</h3>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
          {error || 'Analysis report not found.'}
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
      </div>
    );
  }

  const facts = analysis.facts;
  const repoName = facts?.fullName || 'Target Repository';
  const ghUrl = `https://github.com/${repoName}`;
  const licenseColors = getLicenseBadgeColor(facts?.licenseSpdx);

  const tabs: { key: TabKey; label: string; count?: string | number }[] = [
    { key: 'summary', label: 'Summary' },
    {
      key: 'coverage',
      label: 'Feature Coverage',
      count: analysis.coverage ? `${formatScore(analysis.coverage.score)}%` : undefined,
    },
    { key: 'bugRisk', label: 'Bug Risk Signals' },
    { key: 'scores', label: 'Sub-Scores Rubric' },
    { key: 'deps', label: 'Dependencies' },
    { key: 'plan', label: 'Revival Roadmap' },
    { key: 'trace', label: 'Agent Trace', count: analysis.trace?.length },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12 space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to={analysis.ideaId ? `/results/${analysis.ideaId}` : '/history'}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Search Results</span>
        </Link>

        {/* Founder Brief Export Link */}
        <Link
          to={`/analyses/${analysis._id}/brief`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all"
        >
          <FileText className="w-4 h-4" />
          <span>Open Founder Brief (.md / PDF)</span>
        </Link>
      </div>

      {/* Repository Title Banner */}
      <div className="p-6 md:p-8 rounded-2xl glass-panel border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{repoName}</h1>
              <a
                href={ghUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Open on GitHub"
                className="text-slate-400 hover:text-emerald-400 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
            <p className="text-xs text-slate-400">
              Primary Language: <span className="font-semibold text-slate-300">{facts?.language || 'Unknown'}</span> &bull; Default Branch: <span className="font-mono text-slate-300">{facts?.defaultBranch || 'main'}</span> &bull; Last Commit: <span className="text-slate-300">~{timeAgo(facts?.lastCommitAt)}</span>
            </p>
          </div>

          {/* Verdict and License Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold uppercase tracking-wider ${getVerdictBadgeColor(
                analysis.verdict
              )}`}
            >
              {analysis.verdict || 'Usable with work'}
            </span>

            <span
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold ${licenseColors.bg} ${licenseColors.text} ${licenseColors.border}`}
            >
              {facts?.licenseSpdx || 'NO_LICENSE'}
            </span>
          </div>
        </div>

        {/* Blocking Flags Warning */}
        {analysis.flags && analysis.flags.length > 0 && (
          <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>
              <strong>Flags Reported:</strong> {analysis.flags.join(', ')}
            </span>
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex overflow-x-auto no-scrollbar border-b border-slate-800 gap-1 pb-px">
        {tabs.map((tab) => {
          const isSelected = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-colors whitespace-nowrap flex items-center gap-2 ${
                isSelected
                  ? 'bg-slate-900 text-emerald-400 border-t border-l border-r border-slate-800 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="space-y-6">
        {/* TAB 1: Summary */}
        {activeTab === 'summary' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl glass-panel border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Feature Coverage</span>
                <div className="text-3xl font-black text-emerald-400">
                  {formatScore(analysis.coverage?.score)}%
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Verified code for {analysis.coverage?.features.filter((f) => f.status === 'present').length} of {analysis.coverage?.features.length} requested features.
                </p>
              </div>

              <div className="p-5 rounded-xl glass-panel border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Viability Score</span>
                <div className="text-3xl font-black text-cyan-400">
                  {formatScore(analysis.viability)}/100
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Confidence: {Math.round((analysis.confidence || 0) * 100)}% based on available signals.
                </p>
              </div>

              <div className="p-5 rounded-xl glass-panel border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Estimated Effort</span>
                <div className="text-2xl font-black text-amber-400 font-mono">
                  {analysis.revivalPlan?.effortHours
                    ? `${analysis.revivalPlan.effortHours.min} - ${analysis.revivalPlan.effortHours.max} hrs`
                    : 'N/A'}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Estimated contractor hours to modernize and implement missing gaps.
                </p>
              </div>
            </div>

            {/* Quick Preview of Findings */}
            <div className="p-6 rounded-2xl glass-panel border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                Key Agent Discoveries ({analysis.findings?.length || 0})
              </h3>
              <div className="space-y-2.5">
                {analysis.findings && analysis.findings.length > 0 ? (
                  analysis.findings.slice(0, 6).map((finding, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 text-xs flex items-start gap-2.5"
                    >
                      <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-mono bg-slate-800 text-slate-400 mt-0.5">
                        {finding.agent}
                      </span>
                      <p className="text-slate-300 flex-1">{finding.claim}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">No findings logged.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Coverage */}
        {activeTab === 'coverage' && (
          <CoverageTable
            features={analysis.coverage?.features || []}
            repoFullName={repoName}
            defaultBranch={facts?.defaultBranch || 'main'}
          />
        )}

        {/* TAB 3: Bug Risk */}
        {activeTab === 'bugRisk' && <BugRiskCard bugRisk={analysis.bugRisk} />}

        {/* TAB 4: Scores Rubric */}
        {activeTab === 'scores' && (
          <ScoreBreakdown
            subScores={analysis.subScores}
            viability={analysis.viability}
            confidence={analysis.confidence}
          />
        )}

        {/* TAB 5: Dependencies */}
        {activeTab === 'deps' && (
          <DependenciesTable findings={analysis.findings} facts={analysis.facts} />
        )}

        {/* TAB 6: Revival Plan */}
        {activeTab === 'plan' && <RevivalPlanView plan={analysis.revivalPlan} />}

        {/* TAB 7: Agent Trace */}
        {activeTab === 'trace' && (
          <AgentTraceView trace={analysis.trace} tokenUsage={analysis.tokenUsage} />
        )}
      </div>
    </div>
  );
};
