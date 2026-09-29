import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ideasApi } from '../api/ideas';
import { Idea } from '../api/types';
import { PlusCircle, ArrowRight, Clock, CheckCircle2, History as HistoryIcon } from 'lucide-react';
import { timeAgo } from '../utils/formatters';

export const HistoryPage: React.FC = () => {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ideasApi
      .getIdeas()
      .then((data) => {
        setIdeas(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Failed to load past ideas.');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-400">Loading your saved ideas...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <HistoryIcon className="w-6 h-6 text-emerald-400" />
            <span>Past Ideas & Analyses</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Review previous software concepts, checklists, and matched candidate repositories.
          </p>
        </div>

        <Link
          to="/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Idea</span>
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {ideas.length === 0 ? (
        <div className="p-12 text-center rounded-2xl glass-panel border-slate-800 space-y-4">
          <p className="text-sm text-slate-400">You haven't submitted any product ideas yet.</p>
          <Link
            to="/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Submit Your First Idea</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {ideas.map((idea) => {
            const featureCount = idea.refined?.features?.length || 0;
            const isDone = idea.status === 'done' || idea.status === 'searching';

            return (
              <div
                key={idea._id}
                className="p-5 rounded-xl glass-panel glass-panel-hover border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        idea.status === 'done'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : idea.status === 'searching'
                          ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 animate-pulse'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {idea.status}
                    </span>

                    <span className="text-[11px] text-slate-500">
                      {timeAgo(idea.createdAt)}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-100 line-clamp-1 mb-1">
                    {idea.refined?.summary || idea.rawText}
                  </h3>

                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {idea.rawText}
                  </p>

                  {featureCount > 0 && (
                    <div className="flex items-center gap-1.5 mt-2.5 text-[11px] text-slate-500">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/70" />
                      <span>{featureCount} confirmed features</span>
                    </div>
                  )}
                </div>

                <div className="self-end sm:self-center">
                  <Link
                    to={isDone ? `/results/${idea._id}` : `/new`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
                  >
                    <span>{isDone ? 'View Results' : 'Continue Draft'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
