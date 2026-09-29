import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface TooltipProps {
  content: string;
  children?: React.ReactNode;
  term?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, term }) => {
  const [visible, setVisible] = useState(false);

  return (
    <span className="relative inline-flex items-center group">
      {children ? (
        <span
          onMouseEnter={() => setVisible(true)}
          onMouseLeave={() => setVisible(false)}
          onFocus={() => setVisible(true)}
          onBlur={() => setVisible(false)}
          tabIndex={0}
          className="cursor-help border-b border-dotted border-slate-500 hover:border-emerald-400 focus:outline-none focus:border-emerald-400"
        >
          {children}
        </span>
      ) : (
        <button
          type="button"
          aria-label={term ? `Learn more about ${term}` : 'Learn more'}
          onMouseEnter={() => setVisible(true)}
          onMouseLeave={() => setVisible(false)}
          onFocus={() => setVisible(true)}
          onBlur={() => setVisible(false)}
          className="text-slate-400 hover:text-emerald-400 focus:outline-none p-0.5"
        >
          <HelpCircle className="w-3.5 h-3.5 inline" />
        </button>
      )}

      {visible && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-64 p-2.5 text-xs text-slate-200 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl backdrop-blur-md pointer-events-none transition-opacity duration-150 animate-in fade-in"
        >
          {term && <span className="block font-semibold text-emerald-400 mb-0.5">{term}</span>}
          {content}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-700" />
        </span>
      )}
    </span>
  );
};
