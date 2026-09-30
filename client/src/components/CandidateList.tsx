import React from 'react';
import { Link } from 'react-router-dom';
import { QueryResultItem } from '../api/types';
import { formatScore, timeAgo } from '../utils/formatters';
import { ExternalLink, Sparkles, ArrowRight } from 'lucide-react';

interface CandidateListProps {
  candidates: QueryResultItem[];
}

export const CandidateList: React.FC<CandidateListProps> = ({ candidates }) => {
  if (!candidates || candidates.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
        Other Discovered Candidates ({candidates.length})
      </h3>

      <div className="space-y-2">
        {candidates.map((cand, index) => {
          const repoName = cand.fullName || `Candidate #${index + 4}`;
          const ghUrl = `https://github.com/${repoName}`;

          return (
            <div
              key={cand.repoId || index}
              className="p-4 rounded-xl glass-panel glass-panel-hover flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-slate-800/80"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <a
                    href={ghUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-bold text-slate-100 hover:text-emerald-400 transition-colors truncate inline-flex items-center gap-1.5"
                  >
                    <span>{repoName}</span>
                    <ExternalLink className="w-3 h-3 text-slate-500" />
                  </a>

                  {cand.language && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                      {cand.language}
                    </span>
                  )}

                  <span className="text-[11px] text-slate-500">
                    ~{timeAgo(cand.lastCommitAt)}
                  </span>
                </div>

                <p className="text-xs text-slate-400 truncate max-w-2xl">
                  {cand.description || 'No description provided.'}
                </p>

                {cand.matchedTerms && cand.matchedTerms.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    {cand.matchedTerms.slice(0, 5).map((term, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-850 text-slate-400 border border-slate-800"
                      >
                        {term}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 self-end sm:self-center">
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block">Relevance</span>
                  <span className="text-xs font-mono font-bold text-cyan-400">
                    {Math.round((cand.relevance || 0) * 100)}%
                  </span>
                </div>

                {cand.analysisId ? (
                  <Link
                    to={`/analyses/${cand.analysisId}`}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                  >
                    <span>Report</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                ) : (
                  <span className="text-[11px] text-slate-500">Indexed</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
