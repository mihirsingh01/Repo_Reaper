import { describe, it, expect } from 'vitest';
import {
  formatScore,
  formatHours,
  getVerdictBadgeColor,
  getLicenseBadgeColor,
  timeAgo,
} from '../utils/formatters';

describe('Formatters utility tests', () => {
  it('formats numerical scores and handles null/undefined', () => {
    expect(formatScore(84.6)).toBe('85');
    expect(formatScore(0)).toBe('0');
    expect(formatScore(undefined)).toBe('N/A');
    expect(formatScore(null as any)).toBe('N/A');
  });

  it('formats effort hours ranges', () => {
    expect(formatHours(10, 25)).toBe('10 - 25 hrs');
    expect(formatHours(15, 15)).toBe('15 hrs');
  });

  it('returns appropriate verdict badge colors', () => {
    expect(getVerdictBadgeColor('Ready to build on')).toContain('emerald');
    expect(getVerdictBadgeColor('Usable with work')).toContain('cyan');
    expect(getVerdictBadgeColor('Borrow parts only')).toContain('amber');
    expect(getVerdictBadgeColor('Not worth it')).toContain('rose');
  });

  it('flags missing licenses in red', () => {
    const noLic = getLicenseBadgeColor('NO_LICENSE');
    expect(noLic.text).toContain('rose');
    expect(noLic.border).toContain('rose');

    const mit = getLicenseBadgeColor('MIT');
    expect(mit.text).toContain('emerald');
  });

  it('calculates human-readable time ago', () => {
    const twoMonthsAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(twoMonthsAgo)).toContain('mo');
  });
});
