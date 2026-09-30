import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { analysesApi } from '../api/analyses';
import { AnalysisDetail } from '../api/types';
import { ArrowLeft, Download, Printer, FileText, CheckCircle2 } from 'lucide-react';

export const FounderBriefPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [briefText, setBriefText] = useState<string>('');
  const [analysis, setAnalysis] = useState<AnalysisDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    analysesApi
      .getAnalysis(id)
      .then((data) => {
        setAnalysis(data);
        if (data.founderBrief) {
          setBriefText(data.founderBrief);
        } else {
          return analysesApi.getBrief(id).then(setBriefText);
        }
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Failed to load Founder Brief.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleDownload = () => {
    const filename = `Founder_Brief_${analysis?.facts?.fullName?.replace('/', '_') || 'RepoRevive'}.md`;
    const blob = new Blob([briefText], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <h3 className="text-lg font-bold text-slate-100">Generating Executive Founder Brief...</h3>
      </div>
    );
  }

  if (error || !briefText) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
          {error || 'Founder brief content not available.'}
        </div>
        <Link
          to={`/analyses/${id}`}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Analysis Report</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-6">
      {/* Action Bar (hidden when printing) */}
      <div className="flex items-center justify-between no-print">
        <Link
          to={`/analyses/${id}`}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Report View</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save as PDF</span>
          </button>

          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Download .md</span>
          </button>
        </div>
      </div>

      {/* Rendered Brief Document */}
      <div className="glass-panel rounded-2xl p-8 sm:p-12 border-slate-800 space-y-6 text-slate-200 font-sans leading-relaxed">
        {/* Render markdown document blocks */}
        <div className="prose prose-invert max-w-none space-y-4">
          {briefText.split('\n\n').map((block, idx) => {
            if (block.startsWith('# ')) {
              return (
                <h1 key={idx} className="text-2xl sm:text-3xl font-black text-white pb-3 border-b border-slate-800">
                  {block.replace('# ', '')}
                </h1>
              );
            }
            if (block.startsWith('## ')) {
              return (
                <h2 key={idx} className="text-lg sm:text-xl font-extrabold text-emerald-400 pt-4 pb-1">
                  {block.replace('## ', '')}
                </h2>
              );
            }
            if (block.startsWith('---')) {
              return <hr key={idx} className="border-slate-800 my-6" />;
            }
            if (block.startsWith('- ')) {
              return (
                <ul key={idx} className="space-y-1.5 pl-4 list-disc text-sm text-slate-300">
                  {block.split('\n').map((li, lIdx) => (
                    <li key={lIdx}>{li.replace('- ', '')}</li>
                  ))}
                </ul>
              );
            }
            return (
              <p key={idx} className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                {block}
              </p>
            );
          })}
        </div>
      </div>

      {/* Hand-off Notice */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 text-xs text-slate-400 flex items-center gap-3 no-print">
        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
        <span>
          <strong>Ready for Hand-off:</strong> This brief contains grounded feature gaps, recommended revival steps, and technical risks. Hand it to a freelance developer or software agency to scope the project accurately.
        </span>
      </div>
    </div>
  );
};
