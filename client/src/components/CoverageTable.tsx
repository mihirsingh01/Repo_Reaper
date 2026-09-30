import React from 'react';
import { CoverageFeatureItem } from '../api/types';
import { CheckCircle2, AlertCircle, XCircle, ExternalLink, ShieldCheck } from 'lucide-react';
import { Tooltip } from './Tooltip';

interface CoverageTableProps {
  features: CoverageFeatureItem[];
  repoFullName?: string;
  defaultBranch?: string;
}

export const CoverageTable: React.FC<CoverageTableProps> = ({
  features,
  repoFullName = 'owner/repo',
  defaultBranch = 'main',
}) => {
  if (!features || features.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        No feature coverage data available for this analysis.
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Present</span>
          </span>
        );
      case 'partial':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Partial</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
            <XCircle className="w-3.5 h-3.5 text-slate-500" />
            <span>Missing</span>
          </span>
        );
    }
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <th className="py-3 px-4">Status</th>
            <th className="py-3 px-4">Feature</th>
            <th className="py-3 px-4">Priority</th>
            <th className="py-3 px-4">Ground-Truth Evidence & Code Citation</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 text-xs">
          {features.map((feat) => (
            <tr key={feat.featureId} className="hover:bg-slate-850/50 transition-colors">
              <td className="py-3.5 px-4 align-top w-28 whitespace-nowrap">
                {getStatusBadge(feat.status)}
              </td>

              <td className="py-3.5 px-4 align-top max-w-xs">
                <span className="font-semibold text-slate-100 block text-sm mb-0.5">{feat.label}</span>
                {feat.explanation && (
                  <span className="text-slate-400 text-xs block">{feat.explanation}</span>
                )}
              </td>

              <td className="py-3.5 px-4 align-top w-24 whitespace-nowrap">
                <span
                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    feat.priority === 'must'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {feat.priority === 'must' ? 'Must-have' : 'Nice-to-have'}
                </span>
              </td>

              <td className="py-3.5 px-4 align-top">
                {feat.evidence && feat.evidence.length > 0 ? (
                  <div className="space-y-2">
                    {feat.evidence.map((ev, i) => {
                      const lineHash = ev.lineRange ? `#L${ev.lineRange.split('-')[0]}` : '';
                      const fileUrl = `https://github.com/${repoFullName}/blob/${defaultBranch}/${ev.path}${lineHash}`;

                      return (
                        <div key={i} className="p-2 rounded bg-slate-950/80 border border-slate-800 text-xs">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-emerald-400 hover:underline inline-flex items-center gap-1 font-semibold truncate"
                            >
                              <span>{ev.path}</span>
                              <ExternalLink className="w-3 h-3 text-slate-500" />
                            </a>

                            {ev.verified && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
                                <ShieldCheck className="w-3 h-3" />
                                <span>Verified</span>
                              </span>
                            )}
                          </div>

                          <pre className="font-mono text-[11px] text-slate-300 bg-slate-900/90 p-1.5 rounded overflow-x-auto whitespace-pre-wrap break-all border border-slate-850">
                            {ev.snippet}
                          </pre>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <span className="text-slate-500 italic">No verifiable code evidence located</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
