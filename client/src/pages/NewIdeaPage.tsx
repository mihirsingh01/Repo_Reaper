import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ideasApi } from '../api/ideas';
import { Feature, IdeaRefined } from '../api/types';
import { ChecklistEditor } from '../components/ChecklistEditor';
import { Tooltip } from '../components/Tooltip';
import { Sparkles, ArrowRight, ArrowLeft, Search, CheckCircle2, Lightbulb, AlertCircle } from 'lucide-react';

const SAMPLE_IDEAS = [
  {
    title: 'Retail Inventory & Stock Tracker',
    text: 'An app where small retail shop owners can track stock levels, scan barcodes, record walk-in sales, and receive automated low-stock reorder alerts on WhatsApp.',
  },
  {
    title: 'Habit Tracker with Analytics',
    text: 'A clean personal habit tracking dashboard with visual streak heatmaps, daily browser reminders, and markdown-enabled daily journaling notes.',
  },
  {
    title: 'Tutor & Student Collaborative Whiteboard',
    text: 'A collaborative real-time digital whiteboard for remote math tutors and students featuring live vector drawing, audio chat, and formula LaTeX rendering.',
  },
  {
    title: 'Custom URL Shortener & Analytics',
    text: 'An open-source self-hosted URL shortener with custom branded domains, dynamic QR code generation, and country-level geographic click analytics.',
  },
];

export const NewIdeaPage: React.FC = () => {
  const [step, setStep] = useState<1 | 2>(1);
  const [rawText, setRawText] = useState('');
  const [ideaId, setIdeaId] = useState<string | null>(null);
  const [refined, setRefined] = useState<IdeaRefined | null>(null);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  // Character limits per API specification (30 - 2,000 characters)
  const charCount = rawText.length;
  const isTextValid = charCount >= 30 && charCount <= 2000;

  const handleRefineIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isTextValid) return;
    setError(null);
    setLoading(true);

    try {
      const res = await ideasApi.submitIdea(rawText);
      setIdeaId(res.ideaId);
      setRefined(res.refined);
      setFeatures(res.refined?.features || []);
      setStep(2);
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.response?.data?.error || 'Failed to refine idea. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAndSearch = async () => {
    if (!ideaId) return;
    setError(null);
    setSearchLoading(true);

    try {
      // Step 2a: Confirm edited checklist
      await ideasApi.confirmChecklist(ideaId, features);

      // Step 2b: Trigger search
      await ideasApi.startSearch(ideaId);

      // Navigate to Results page with polling
      navigate(`/results/${ideaId}`);
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.response?.data?.error || 'Failed to start search. Please try again.'
      );
      setSearchLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      {/* Wizard Steps Indicator */}
      <div className="flex items-center justify-center gap-3 sm:gap-6 mb-8 text-xs font-semibold">
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
            step === 1
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
              : 'bg-slate-900 border-slate-800 text-slate-400'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono text-[11px]">
            1
          </span>
          <span>Describe Your Idea</span>
        </div>

        <div className="w-8 h-px bg-slate-800" />

        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
            step === 2
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
              : 'bg-slate-900 border-slate-800 text-slate-500'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-mono text-[11px]">
            2
          </span>
          <span>Confirm Feature Checklist</span>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: Describe Idea */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="text-center max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
              What are you building?
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Describe your software product in simple founder language. Our AI will distill it into a technical feature checklist without inventing business facts.
            </p>
          </div>

          <form onSubmit={handleRefineIdea} className="glass-panel rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="relative">
              <textarea
                rows={5}
                required
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Describe your product idea in plain words... (e.g. An app for local bakeries to take custom cake pre-orders, manage deposits, and send pickup SMS notifications)"
                className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:border-emerald-500 focus:outline-none transition-colors resize-none leading-relaxed"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 px-1">
                <span>Min 30 characters</span>
                <span className={charCount > 2000 ? 'text-rose-400 font-bold' : ''}>
                  {charCount} / 2,000 characters
                </span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!isTextValid || loading}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-lg shadow-emerald-500/25 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Distilling Features...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Feature Checklist</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Sample Ideas */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
              <span>Or pick an example idea to test:</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SAMPLE_IDEAS.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setRawText(sample.text)}
                  className="p-3.5 rounded-xl glass-panel glass-panel-hover text-left border-slate-800/80 hover:border-emerald-500/40 transition-colors"
                >
                  <h4 className="text-xs font-bold text-slate-200 mb-1">{sample.title}</h4>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {sample.text}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Review and Confirm Checklist */}
      {step === 2 && refined && (
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 mb-2 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Idea Description</span>
              </button>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                Review & Confirm Checklist
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Our AI extracted technical keywords from your idea. Edit or prioritize features before matching.
              </p>
            </div>

            <button
              onClick={handleConfirmAndSearch}
              disabled={searchLoading || features.length < 3}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-lg shadow-emerald-500/25 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {searchLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Matching Repositories...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Confirm & Find Matching Repos</span>
                </>
              )}
            </button>
          </div>

          {/* AI Distillation Summary Card */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block mb-0.5">
                Product Summary
              </span>
              <p className="text-slate-200 font-medium">{refined.summary}</p>
            </div>

            {refined.targetUsers && refined.targetUsers.length > 0 && (
              <div className="self-start sm:self-center">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-0.5">
                  Target Users
                </span>
                <div className="flex flex-wrap gap-1">
                  {refined.targetUsers.map((u, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]">
                      {u}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Clarifying Questions (if any were flagged) */}
          {refined.clarifications && refined.clarifications.length > 0 && (
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 text-xs text-amber-300 space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-amber-400">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Clarification Notes from Idea Refiner:</span>
              </span>
              <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                {refined.clarifications.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Interactive Checklist Editor */}
          <div className="glass-panel rounded-2xl p-6">
            <ChecklistEditor features={features} onChange={setFeatures} />
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleConfirmAndSearch}
              disabled={searchLoading || features.length < 3}
              className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-emerald-500/25 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {searchLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Searching Stale Repositories...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Confirm Checklist & Start Search</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
