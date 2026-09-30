import React, { useState, useEffect } from 'react';
import { adminApi } from '../api/admin';
import { IngestionJobItem } from '../api/types';
import { Shield, Play, RefreshCw, CheckCircle2, AlertCircle, Database, Server } from 'lucide-react';
import { Tooltip } from '../components/Tooltip';

export const AdminPage: React.FC = () => {
  const [language, setLanguage] = useState('TypeScript');
  const [windowStr, setWindowStr] = useState('2022-01..2023-01');
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<IngestionJobItem | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTriggerIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setTriggering(true);

    try {
      const res = await adminApi.triggerIngest(language, windowStr);
      setJobId(res.jobId);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to trigger ingestion job.');
    } finally {
      setTriggering(false);
    }
  };

  useEffect(() => {
    if (!jobId) return;

    const interval = setInterval(async () => {
      try {
        const data = await adminApi.getIngestJob(jobId);
        setJob(data);
        if (data.status === 'done' || data.status === 'failed') {
          clearInterval(interval);
        }
      } catch (err) {
        clearInterval(interval);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [jobId]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-6 h-6 text-indigo-400" />
            <h2 className="text-2xl font-extrabold text-white">System Administration</h2>
          </div>
          <p className="text-xs text-slate-400">
            Trigger GitHub ingestion pipeline shards, monitor filtering jobs, and review system topology.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Ingestion Trigger Form */}
      <div className="p-6 rounded-2xl glass-panel border-indigo-500/30 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-400" />
            <span>Trigger GitHub Ingestion Shard</span>
          </h3>
          <span className="text-[11px] font-mono text-slate-400">ETag Caching & Rate-limit Safe</span>
        </div>

        <form onSubmit={handleTriggerIngest} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Target Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:border-indigo-500 focus:outline-none"
            >
              <option value="TypeScript">TypeScript</option>
              <option value="JavaScript">JavaScript</option>
              <option value="Python">Python</option>
              <option value="Go">Go</option>
              <option value="Rust">Rust</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Stale Push Window</label>
            <input
              type="text"
              value={windowStr}
              onChange={(e) => setWindowStr(e.target.value)}
              placeholder="e.g. 2022-01..2023-01"
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={triggering}
              className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {triggering ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Ingestion Job</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Live Job Monitor */}
      {job && (
        <div className="p-6 rounded-2xl glass-panel border-slate-800 space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <span className="text-xs font-mono text-slate-400 block">Job #{job._id}</span>
              <span className="text-sm font-bold text-slate-100">
                {job.params.language} ({job.params.window})
              </span>
            </div>

            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                job.status === 'done'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : job.status === 'running'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {job.status === 'running' && <RefreshCw className="w-3 h-3 animate-spin" />}
              <span>{job.status}</span>
            </span>
          </div>

          {/* Counts */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase block">Candidate Repos Seen</span>
              <span className="text-xl font-bold font-mono text-slate-200">{job.counts.seen}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] text-emerald-400 uppercase block">Verified & Kept</span>
              <span className="text-xl font-bold font-mono text-emerald-400">{job.counts.kept}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] text-rose-400 uppercase block">Rejected</span>
              <span className="text-xl font-bold font-mono text-rose-400">{job.counts.rejected}</span>
            </div>
          </div>

          {/* Rejection Reasons Breakdown */}
          {job.counts.byReason && Object.keys(job.counts.byReason).length > 0 && (
            <div className="pt-2">
              <span className="text-xs font-semibold text-slate-300 block mb-2">Rejection Distribution:</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {Object.entries(job.counts.byReason).map(([reason, count]) => (
                  <div key={reason} className="p-2 rounded bg-slate-950 border border-slate-850 flex justify-between">
                    <span className="text-slate-400 truncate">{reason}</span>
                    <span className="font-mono text-slate-200 font-bold">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
