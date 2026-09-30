import React from 'react';
import { FindingItem, RepoFactsItem } from '../api/types';
import { Package, ShieldAlert, AlertTriangle, FileCode } from 'lucide-react';
import { Tooltip } from './Tooltip';

interface DependenciesTableProps {
  findings?: FindingItem[];
  facts?: RepoFactsItem;
}

export const DependenciesTable: React.FC<DependenciesTableProps> = ({ findings = [], facts }) => {
  const depFindings = findings.filter((f) => f.agent === 'deps' || f.claim.toLowerCase().includes('depend'));
  const manifests = facts?.manifestFiles || [];

  return (
    <div className="space-y-6">
      {/* Manifest Overview */}
      <div className="p-6 rounded-2xl glass-panel border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-slate-100">Dependency Health & OSV Vulnerabilities</h3>
            <Tooltip
              term="Dependency Audits"
              content="Read-only parsing of package manifests (package.json, requirements.txt) and automated queries to the OSV.dev open vulnerability database."
            />
          </div>
          <p className="text-xs text-slate-400">
            Static analysis of package manifests. Zero third-party scripts or packages are ever executed or installed.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {manifests.length > 0 ? (
            manifests.map((m, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono bg-slate-800 text-slate-300 border border-slate-700"
              >
                <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                <span>{m}</span>
              </span>
            ))
          ) : (
            <span className="text-xs text-slate-500">No package manifests found</span>
          )}
        </div>
      </div>

      {/* Dependency Findings */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Package className="w-4 h-4 text-cyan-400" />
          <span>Dependency Audit Findings ({depFindings.length})</span>
        </h4>

        {depFindings.length > 0 ? (
          <div className="space-y-2">
            {depFindings.map((item, idx) => {
              const isCrit = item.severity === 'critical';
              const isHigh = item.severity === 'high';

              return (
                <div
                  key={idx}
                  className={`p-4 rounded-xl glass-panel border transition-colors flex items-start gap-3 ${
                    isCrit
                      ? 'border-rose-500/50 bg-rose-500/5'
                      : isHigh
                      ? 'border-amber-500/40 bg-amber-500/5'
                      : 'border-slate-800/80'
                  }`}
                >
                  <div className="mt-0.5">
                    {isCrit ? (
                      <ShieldAlert className="w-4 h-4 text-rose-400" />
                    ) : isHigh ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Package className="w-4 h-4 text-cyan-400" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-100">{item.claim}</span>
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                          isCrit
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                            : isHigh
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {item.severity}
                      </span>
                    </div>

                    {item.evidence && item.evidence.length > 0 && (
                      <div className="mt-2 text-xs font-mono text-slate-400 bg-slate-950/80 p-2 rounded border border-slate-850">
                        {item.evidence[0].snippet}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500 text-sm glass-panel rounded-xl">
            No known critical vulnerabilities or deprecation flags recorded for dependencies.
          </div>
        )}
      </div>
    </div>
  );
};
