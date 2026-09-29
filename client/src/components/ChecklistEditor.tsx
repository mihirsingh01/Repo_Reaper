import React, { useState } from 'react';
import { Feature } from '../api/types';
import { Tooltip } from './Tooltip';
import { Plus, Trash2, Tag, AlertCircle, CheckCircle2, Star } from 'lucide-react';

interface ChecklistEditorProps {
  features: Feature[];
  onChange: (features: Feature[]) => void;
}

export const ChecklistEditor: React.FC<ChecklistEditorProps> = ({ features, onChange }) => {
  const [newLabel, setNewLabel] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<'must' | 'nice'>('must');
  const [newKeywords, setNewKeywords] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleTogglePriority = (id: string) => {
    onChange(
      features.map((f) =>
        f.id === id ? { ...f, priority: f.priority === 'must' ? 'nice' : 'must' } : f
      )
    );
  };

  const handleUpdateLabel = (id: string, label: string) => {
    onChange(features.map((f) => (f.id === id ? { ...f, label } : f)));
  };

  const handleDelete = (id: string) => {
    if (features.length <= 3) {
      alert('You need at least 3 features in your checklist.');
      return;
    }
    onChange(features.filter((f) => f.id !== id));
  };

  const handleAddFeature = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;
    if (features.length >= 10) {
      alert('Maximum of 10 features allowed per idea.');
      return;
    }

    const kws = newKeywords
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    const newFeature: Feature = {
      id: `f${Date.now()}`,
      label: newLabel.trim(),
      plainDescription: newDesc.trim() || newLabel.trim(),
      keywords: kws.length > 0 ? kws : [newLabel.trim().toLowerCase()],
      priority: newPriority,
    };

    onChange([...features, newFeature]);
    setNewLabel('');
    setNewDesc('');
    setNewKeywords('');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <span>Feature Checklist</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {features.length} features
            </span>
          </h3>
          <p className="text-xs text-slate-400">
            Edit, prioritize, or add features. Must-have features weigh 2x more heavily in candidate matching.
          </p>
        </div>

        {features.length < 10 && !showAddForm && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Feature</span>
          </button>
        )}
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {features.map((feat, index) => (
          <div
            key={feat.id}
            className={`p-4 rounded-xl border transition-all ${
              feat.priority === 'must'
                ? 'bg-slate-900/90 border-slate-700/80 shadow-md'
                : 'bg-slate-900/50 border-slate-800/80'
            }`}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-slate-500">#{index + 1}</span>
                  <button
                    type="button"
                    onClick={() => handleTogglePriority(feat.id)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase transition-colors ${
                      feat.priority === 'must'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    <Star className={`w-3 h-3 ${feat.priority === 'must' ? 'fill-emerald-400 text-emerald-400' : ''}`} />
                    <span>{feat.priority === 'must' ? 'Must-have' : 'Nice-to-have'}</span>
                  </button>
                </div>

                <input
                  type="text"
                  value={feat.label}
                  onChange={(e) => handleUpdateLabel(feat.id, e.target.value)}
                  className="w-full bg-transparent font-semibold text-sm text-slate-100 border-b border-transparent hover:border-slate-700 focus:border-emerald-500 focus:outline-none transition-colors py-0.5"
                />
              </div>

              <button
                type="button"
                onClick={() => handleDelete(feat.id)}
                title="Delete feature"
                aria-label={`Delete feature ${feat.label}`}
                className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-800/60 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-3 line-clamp-2">{feat.plainDescription}</p>

            {/* Keywords / Technical Chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              <Tag className="w-3 h-3 text-slate-500" />
              {feat.keywords.map((kw, i) => (
                <span
                  key={i}
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono bg-slate-800/90 text-slate-300 border border-slate-700/60"
                  title={`Technical search term: ${kw}`}
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add Feature Inline Modal / Drawer */}
      {showAddForm && (
        <form
          onSubmit={handleAddFeature}
          className="p-4 rounded-xl border border-emerald-500/40 bg-slate-900/95 shadow-xl space-y-3 animate-in fade-in"
        >
          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">New Feature Item</h4>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-slate-400 hover:text-slate-200 text-xs"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Feature Name</label>
              <input
                type="text"
                placeholder="e.g. Automated PDF Invoices"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                required
                className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Priority</label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as 'must' | 'nice')}
                className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:border-emerald-500 focus:outline-none"
              >
                <option value="must">Must-have (2x weight)</option>
                <option value="nice">Nice-to-have (1x weight)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Description (for founder)</label>
            <input
              type="text"
              placeholder="e.g. Generates a receipt PDF upon successful order confirmation"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Technical Keywords (comma separated)
            </label>
            <input
              type="text"
              placeholder="e.g. pdfkit, puppeteer, invoice, receipt"
              value={newKeywords}
              onChange={(e) => setNewKeywords(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors"
          >
            Add to Checklist
          </button>
        </form>
      )}
    </div>
  );
};
