import React from 'react';
import { Link } from 'react-router-dom';
import { QueryResultItem } from '../api/types';
import { formatScore, getLicenseBadgeColor, timeAgo } from '../utils/formatters';
import { Tooltip } from './Tooltip';
import { ExternalLink, ArrowRight, ShieldAlert, GitFork } from 'lucide-react';

interface AlternativeCardProps {
  item: QueryResultItem;
  rank: number;
}

export const AlternativeCard: React.FC<AlternativeCardProps> = ({ item, rank }) => {
  const licenseColors = getLicenseBadgeColor(item.license?.spdx);
  const repoName = item.fullName || `Repository #${item.repoId.slice(-4)}`;
  const ghUrl = `https://github.com/${repoName}`;

  return (
    <div className="rounded-xl glass-panel glass-panel-hover p-5 flex flex-col justify-between border-slate-800">
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            Alternative #{rank}
          </span>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${licenseColors.bg} ${licenseColors.text} ${licenseColors.border}`}
          >
            {item.license?.spdx === 'NO_LICENSE' || !item.license?.spdx ? 'NO_LICENSE' : item.license.spdx}
          </span>
        </div>

        <h4 className="text-base font-bold text-white hover:text-emerald-400 transition-colors mb-1.5 truncate">
          <a href={ghUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5">
            <span>{repoName}</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
          </a>
        </h4>

        <p className="text-xs text-slate-400 mb-4 line-clamp-2">
          {item.description || 'No description provided.'}
        </p>

        {/* Scores */}
        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 mb-4 text-center">
          <div>
            <span className="text-[10px] text-slate-500 block">Coverage</span>
            <span className="text-sm font-black text-emerald-400">{formatScore(item.coverage)}%</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block">Viability</span>
            <span className="text-sm font-black text-cyan-400">{formatScore(item.viability)}/100</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs">
        <span className="text-[11px] text-slate-500">
          Updated {timeAgo(item.lastCommitAt)}
        </span>

        {item.analysisId ? (
          <Link
            to={`/analyses/${item.analysisId}`}
            className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold"
          >
            <span>Report</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        ) : (
          <span className="text-slate-500 text-[11px]">Queued</span>
        )}
      </div>
    </div>
  );
};
