export function formatScore(score?: number): string {
  if (score === undefined || score === null) return 'N/A';
  return Math.round(score).toString();
}

export function formatHours(min: number, max: number): string {
  if (min === max) return `${min} hrs`;
  return `${min} - ${max} hrs`;
}

export function getVerdictBadgeColor(verdict?: string): string {
  switch (verdict) {
    case 'Ready to build on':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    case 'Usable with work':
      return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
    case 'Borrow parts only':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    case 'Not worth it':
      return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    default:
      return 'bg-slate-800 text-slate-300 border-slate-700';
  }
}

export function getLicenseBadgeColor(spdx?: string): { bg: string; text: string; border: string } {
  if (!spdx || spdx.toLowerCase() === 'none' || spdx.toLowerCase() === 'noassertion') {
    return {
      bg: 'bg-rose-500/15',
      text: 'text-rose-400 font-bold',
      border: 'border-rose-500/50',
    };
  }
  const clean = spdx.toLowerCase();
  if (['mit', 'apache-2.0', 'bsd-2-clause', 'bsd-3-clause', 'isc', 'unlicense'].includes(clean)) {
    return {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
    };
  }
  if (['lgpl-2.1', 'lgpl-3.0', 'mpl-2.0', 'epl-2.0'].includes(clean)) {
    return {
      bg: 'bg-blue-500/10',
      text: 'text-blue-400',
      border: 'border-blue-500/30',
    };
  }
  return {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
  };
}

export function timeAgo(dateStr?: string): string {
  if (!dateStr) return 'Unknown';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const months = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.4));
  if (months > 12) {
    const years = Math.floor(months / 12);
    return `${years} yr${years > 1 ? 's' : ''} ago`;
  }
  if (months > 0) return `${months} mo${months > 1 ? 's' : ''} ago`;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return `${days} day${days > 1 ? 's' : ''} ago`;
}
