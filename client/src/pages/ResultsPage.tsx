import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ideasApi } from '../api/ideas';
import { SearchResultsResponse } from '../api/types';
import { BestMatchCard } from '../components/BestMatchCard';
import { AlternativeCard } from '../components/AlternativeCard';
import { CandidateList } from '../components/CandidateList';
import { Tooltip } from '../components/Tooltip';
import { Sparkles, RefreshCw, AlertCircle, Search, ArrowLeft } from 'lucide-react';

export const ResultsPage: React.FC = () => {
  const { ideaId } = useParams<{ ideaId: string }>();
  const [data, setData] = useState<SearchResultsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);

  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchResults = async (currentPoll: number) => {
    if (!ideaId) return;

    try {
      const res = await ideasApi.getResults(ideaId);
      setData(res);
      setLoading(false);

      // Check if polling should continue
      if (res.status === 'running' || res.status === 'queued') {
        // Exponential backoff: starts at 2s, increases up to 6s
        const delay = Math.min(2000 + currentPoll * 1000, 6000);
        pollTimeoutRef.current = setTimeout(() => {
          setPollCount(currentPoll + 1);
          fetchResults(currentPoll + 1);
        }, delay);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.response?.data?.error || 'Failed to fetch search results.'
      );
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults(0);

    return () => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
    };
  }, [ideaId]);

  if (loading && !data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <h3 className="text-lg font-bold text-slate-100">Scanning Ingested Repositories...</h3>
        <p className="text-xs text-slate-400">
          Computing TF-IDF cosine similarity and synonym expansions against stale GitHub projects.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center justify-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-400" />
          <span>{error}</span>
        </div>
        <Link
          to="/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Idea Wizard</span>
        </Link>
      </div>
    );
  }

  const isRunning = data?.status === 'running' || data?.status === 'queued';
  const progress = data?.progress || { completed: 0, total: 5 };
  const progressPct = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Repository Viability Matches</h2>
            {data?.cached && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                Cached Result
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            Top candidate repositories analyzed statically with read-only AI worker agents and deterministic scoring.
          </p>
        </div>

        <Link
          to="/new"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 self-start sm:self-center"
        >
          <span>Try Another Idea</span>
          <Search className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Progress Bar (while analyses run) */}
      {isRunning && (
        <div className="p-5 rounded-2xl glass-panel border-emerald-500/30 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-emerald-300 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              <span>Multi-Agent Inspection in Progress...</span>
            </span>
            <span className="font-mono text-slate-400">
              {progress.completed} of {progress.total} candidates audited ({Math.round(progressPct)}%)
            </span>
          </div>

          <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full transition-all duration-300"
              style={{ width: `${Math.max(5, progressPct)}%` }}
            />
          </div>

          <p className="text-[11px] text-slate-400">
            Running Scout, Structure, Coverage, Bug Risk, Dependency, and License audits concurrently. Results update in real-time.
          </p>
        </div>
      )}

      {/* Hero Best Match Card */}
      {data?.bestMatch ? (
        <section className="space-y-3">
          <BestMatchCard item={data.bestMatch} ideaId={ideaId || ''} />
        </section>
      ) : !isRunning ? (
        <div className="p-8 rounded-2xl glass-panel text-center space-y-2 border-slate-800">
          <AlertCircle className="w-6 h-6 text-amber-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-200">No Eligible Best Match Identified</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Discovered repositories were either missing licenses (which strictly blocks commercial reuse) or had low viability scores. Check the alternatives below.
          </p>
        </div>
      ) : null}

      {/* 2 Alternatives Grid */}
      {data?.alternatives && data.alternatives.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
              Strong Alternative Candidates
            </h3>
            <Tooltip
              term="Alternative Repositories"
              content="Second and third highest ranking repositories that match significant portions of your checklist or offer reusable architectures."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.alternatives.map((alt, index) => (
              <AlternativeCard key={alt.repoId} item={alt} rank={index + 2} />
            ))}
          </div>
        </section>
      )}

      {/* More Matches List */}
      {data?.candidates && data.candidates.length > 0 && (
        <section className="pt-4 border-t border-slate-800">
          <CandidateList candidates={data.candidates} />
        </section>
      )}
    </div>
  );
};
