import React from 'react';
import { RevivalPlanItem } from '../api/types';
import { formatHours } from '../utils/formatters';
import { CheckCircle2, Clock, AlertTriangle, ArrowRight, ListOrdered } from 'lucide-react';
import { Tooltip } from './Tooltip';

interface RevivalPlanViewProps {
  plan?: RevivalPlanItem;
}

export const RevivalPlanView: React.FC<RevivalPlanViewProps> = ({ plan }) => {
  if (!plan) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm glass-panel rounded-xl">
        No revival plan available for this repository.
      </div>
    );
  }

  const { min = 0, max = 0 } = plan.effortHours || {};

  return (
    <div className="space-y-6">
      {/* Effort Header */}
      <div className="p-6 rounded-2xl glass-panel border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-slate-100">Engineering Revival Roadmap</h3>
            <Tooltip
              term="Effort Estimation"
              content="Calculated realistic hours for a competent freelance developer to modernize dependencies, implement gaps, and verify staging deployment."
            />
          </div>
          <p className="text-xs text-slate-400">
            Sequential blueprint to transform this stale repository into a production-ready product.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-right">
            <span className="text-[10px] text-slate-400 block uppercase font-semibold">Estimated Contractor Effort</span>
            <span className="text-lg sm:text-xl font-black text-emerald-400 font-mono">
              {formatHours(min, max)}
            </span>
          </div>
        </div>
      </div>

      {/* Feature Gaps Identified */}
      {plan.gaps && plan.gaps.length > 0 && (
        <div className="p-5 rounded-xl glass-panel border-slate-800 space-y-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Feature Gaps to Complete ({plan.gaps.length})</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {plan.gaps.map((gap, i) => (
              <div
                key={i}
                className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 text-xs text-slate-200 flex items-start gap-2"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                <span>{gap}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ordered Steps Timeline */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <ListOrdered className="w-4 h-4 text-emerald-400" />
          <span>Recommended Engineering Steps</span>
        </h4>

        <div className="space-y-3">
          {plan.steps && plan.steps.length > 0 ? (
            plan.steps.map((step) => (
              <div
                key={step.order}
                className="p-4 rounded-xl glass-panel border-slate-800/80 flex flex-col sm:flex-row sm:items-start justify-between gap-3 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center flex-shrink-0">
                    {step.order}
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-slate-100 mb-1">{step.title}</h5>
                    <p className="text-xs text-slate-400 leading-relaxed">{step.description}</p>
                  </div>
                </div>

                <div className="self-end sm:self-center px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-400 whitespace-nowrap">
                  ~{step.effortHours} hrs
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-500">No steps defined.</p>
          )}
        </div>
      </div>

      {/* Risks */}
      {plan.risks && plan.risks.length > 0 && (
        <div className="p-5 rounded-xl border border-rose-500/20 bg-rose-500/5 space-y-2">
          <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>Key Technical & Integration Risks</span>
          </h4>
          <ul className="space-y-1.5 text-xs text-slate-300">
            {plan.risks.map((risk, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-rose-400">•</span>
                <span>{risk}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
