import React from 'react';
import { Link } from 'react-router-dom';
import { QueryResultItem } from '../api/types';
import { formatScore, getVerdictBadgeColor, getLicenseBadgeColor, timeAgo } from '../utils/formatters';
import { Tooltip } from './Tooltip';
import { Award, ExternalLink, ArrowRight, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';

interface BestMatchCardProps {
  item: QueryResultItem;
  ideaId: string;
}

export const BestMatchCard: React.FC<BestMatchCardProps> = ({ item, ideaId }) => {
  const licenseColors = getLicenseBadgeColor(item.license?.spdx);
  const repoName = item.fullName || `Repository #${item.repoId.slice(-4)}`;
  const ghUrl = `https://github.com/${repoName}`;

  // Evaluate plain bug risk level from viability / flags
  let bugRiskText = 'Low';
  let bugRiskColor = 'text-emerald-400';
  if ((item.viability || 0) < 50) {
    bugRiskText = 'High';
    bugRiskColor = 'text-rose-400';
  } else if ((item.viability || 0) < 75) {
    bugRiskText = 'Medium';
    bugRiskColor = 'text-amber-400';
  }

  return (
    <div className="relative overflow-hidden rounded-2xl glass-panel border-emerald-500/40 p-6 md:p-8 glow-emerald transition-all duration-300">
      {/* Top Banner / Hero Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold uppercase tracking-wider">
          <Award className="w-4 h-4 text-emerald-400" />
          <span>Recommended Best Match</span>
        </div>

        {/* License Chip */}
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium border ${licenseColors.bg} ${licenseColors.text} ${licenseColors.border}`}
          >
            {item.license?.spdx === 'NO_LICENSE' || !item.license?.spdx ? (
              <span className="flex items-center gap-1 font-bold">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                NO_LICENSE (Risk)
              </span>
            ) : (
              <span>License: {item.license.spdx}</span>
            )}
          </span>
          <Tooltip
            term="License Safety"
            content="Permissive licenses (MIT, Apache-2.0, BSD) allow free commercial reuse. Repos without a license legally block reuse."
          />
        </div>
      </div>

      {/* Title & Description */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h3 className="text-xl md:text-2xl font-extrabold text-white hover:text-emerald-400 transition-colors">
            <a href={ghUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2">
              <span>{repoName}</span>
              <ExternalLink className="w-4 h-4 text-slate-500 hover:text-emerald-400" />
            </a>
          </h3>
          <span className="text-xs text-slate-500 font-mono">
            Abandoned ~{timeAgo(item.lastCommitAt)}
          </span>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
          {item.description || 'No description provided by repository author.'}
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
        <div>
          <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-1">
            <span>Feature Coverage</span>
            <Tooltip
              term="Feature Coverage"
              content="Calculates what % of your confirmed checklist is already verified in this codebase."
            />
          </div>
          <div className="text-xl md:text-2xl font-black text-emerald-400">
            {formatScore(item.coverage)}%
          </div>
          <span className="text-[11px] text-slate-400">Already Built</span>
        </div>

        <div>
          <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-1">
            <span>Viability Score</span>
            <Tooltip
              term="Viability Score"
              content="7-category objective rating based on code structure, dependencies, license, test health, and bug signals."
            />
          </div>
          <div className="text-xl md:text-2xl font-black text-cyan-400">
            {formatScore(item.viability)}/100
          </div>
          <span className="text-[11px] text-slate-400">Code Health</span>
        </div>

        <div>
          <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-1">
            <span>Bug Risk</span>
            <Tooltip
              term="Bug Risk Signals"
              content="Bug risk Low = few known bug signals (open bug issues, lint density, CI status), not zero bugs."
            />
          </div>
          <div className={`text-xl md:text-2xl font-black ${bugRiskColor}`}>
            {bugRiskText}
          </div>
          <span className="text-[11px] text-slate-400">Signal Density</span>
        </div>

        <div>
          <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-1">
            <span>Overall Verdict</span>
            <Tooltip
              term="Verdict"
              content="Standardized guidance: Ready to build on (≥75), Usable with work (50-74), Borrow parts only (25-49), or Not worth it (<25)."
            />
          </div>
          <div className="text-sm md:text-base font-bold text-slate-200 mt-1 truncate">
            {item.viability && item.viability >= 75
              ? 'Ready to build on'
              : item.viability && item.viability >= 50
              ? 'Usable with work'
              : 'Borrow parts only'}
          </div>
          <span className="text-[11px] text-slate-400">Recommendation</span>
        </div>
      </div>

      {/* Matched Terms / Why it matched */}
      {item.matchedTerms && item.matchedTerms.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Why it matched:</span>
          </span>
          {item.matchedTerms.slice(0, 6).map((term, i) => (
            <span
              key={i}
              className="px-2 py-0.5 rounded text-xs font-mono bg-slate-800 text-emerald-300 border border-slate-700"
            >
              {term}
            </span>
          ))}
        </div>
      )}

      {/* Action CTA */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800">
        <a
          href={ghUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1.5"
        >
          <span>Open on GitHub</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>

        {item.analysisId ? (
          <Link
            to={`/analyses/${item.analysisId}`}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-lg shadow-emerald-500/25 group"
          >
            <span>View Full Report & Founder Brief</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        ) : (
          <button
            disabled
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-800 text-slate-400 text-xs font-medium cursor-not-allowed"
          >
            <span>Analysis Queued...</span>
          </button>
        )}
      </div>
    </div>
  );
};
