import React from 'react';
import { TraceStepItem } from '../api/types';
import { Terminal, Clock, Cpu, CheckCircle } from 'lucide-react';
import { Tooltip } from './Tooltip';

interface AgentTraceViewProps {
  trace?: TraceStepItem[];
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export const AgentTraceView: React.FC<AgentTraceViewProps> = ({ trace = [], tokenUsage }) => {
  if (!trace || trace.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm glass-panel rounded-xl">
        No execution trace recorded.
      </div>
    );
  }

  const totalDurationMs = trace.reduce((acc, t) => acc + (t.latencyMs || 0), 0);

  return (
    <div className="space-y-6">
      {/* Telemetry Header */}
      <div className="p-6 rounded-2xl glass-panel border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Terminal className="w-5 h-5 text-emerald-400" />
              <span>Multi-Agent Execution Trace</span>
            </h3>
            <Tooltip
              term="Agent Traces"
              content="Complete audit log recording every agent invocation, tool call, latency, and token consumption throughout the pipeline."
            />
          </div>
          <p className="text-xs text-slate-400">
            Transparent, reproducible agent actions. Strictly read-only tool usage.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="text-right">
            <span className="text-[10px] text-slate-500 block uppercase">Total Latency</span>
            <span className="text-emerald-400 font-bold">{roundMs(totalDurationMs)}</span>
          </div>
          {tokenUsage && (
            <div className="text-right">
              <span className="text-[10px] text-slate-500 block uppercase">Token Usage</span>
              <span className="text-cyan-400 font-bold">{tokenUsage.totalTokens} tokens</span>
            </div>
          )}
        </div>
      </div>

      {/* Step by Step Timeline */}
      <div className="space-y-3">
        {trace.map((step) => (
          <div
            key={step.step}
            className="p-4 rounded-xl glass-panel border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
          >
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 font-mono text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5 border border-slate-700">
                {step.step}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-slate-100 capitalize">{step.agent}</span>
                  {step.tool && (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[10px]">
                      {step.tool}
                    </span>
                  )}
                </div>

                {step.argsSummary && (
                  <p className="text-slate-400 font-mono text-[11px] mb-1">
                    <span className="text-slate-500">args:</span> {step.argsSummary}
                  </p>
                )}

                {step.resultSummary && (
                  <p className="text-slate-300 text-[11px]">
                    <span className="text-slate-500">result:</span> {step.resultSummary}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-center text-slate-400 font-mono text-[11px]">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>{Math.round(step.latencyMs)}ms</span>
              </span>
              <span className="flex items-center gap-1">
                <Cpu className="w-3 h-3 text-slate-500" />
                <span>{step.tokensIn + step.tokensOut} tok</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

function roundMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}
