import { describe, it, expect } from 'vitest';
import { encodeShareState, decodeShareState } from '../engine/export/url-state';
import { getTheme, darkTheme, lightTheme } from '../theme';
import { render } from '@testing-library/react';
import { Header } from '../components/ui/Header';
import React from 'react';

describe('Security & A11y', () => {
  it('encodeShareState handles XSS payload without execution', () => {
    const payload: any = { version: 1, backtest: { ticker: 'AAPL', entryRule: '<script>alert(1)</script>', exitRule: 'CLOSE > 0' } };
    const enc = encodeShareState(payload);
    const dec = decodeShareState(enc) as any;
    expect(dec.backtest.entryRule).toBe('<script>alert(1)</script>');
    // no code execution, just string
  });

  it('decodeShareState rejects invalid JSON', () => {
    const bad = btoa('not json');
    expect(decodeShareState(encodeURIComponent(bad))).toBeNull();
  });

  it('decodeShareState handles empty string', () => {
    expect(decodeShareState('')).toBeNull();
  });

  it('encodeShareState returns empty on circular?', () => {
    // circular would throw and return ''
    const circular: any = { version: 1 };
    circular.self = circular;
    const res = encodeShareState(circular);
    expect(res).toBe('');
  });

  it('dark theme contrast ratio >3 for WCAG AA (secondary)', () => {
    const hexToLum = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
      const lin = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    };
    const contrast = (a: string, b: string) => {
      const la = hexToLum(a), lb = hexToLum(b);
      return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
    };
    expect(contrast(darkTheme.bgPrimary, darkTheme.textSecondary)).toBeGreaterThan(3);
    expect(contrast(lightTheme.bgPrimary, lightTheme.textSecondary)).toBeGreaterThan(3);
  });

  it('light theme upGreen vs downRed distinct', () => {
    expect(darkTheme.upGreen).not.toBe(darkTheme.downRed);
    expect(lightTheme.upGreen).not.toBe(lightTheme.downRed);
  });

  it('getTheme returns stable object', () => {
    expect(getTheme('dark')).toEqual(darkTheme);
    expect(getTheme('light')).toEqual(lightTheme);
    expect(getTheme('dark')).not.toBe(getTheme('light'));
  });

  it('Header has accessible aria-labels', () => {
    const { container } = render(<Header />);
    expect(container.querySelector('[aria-label="Toggle theme"]')).toBeTruthy();
    expect(container.querySelector('[aria-label="GitHub Repository"]')).toBeTruthy();
    expect(container.querySelector('[aria-label="Share session"]')).toBeTruthy();
  });

  it('Header GitHub link has rel noopener', () => {
    const { container } = render(<Header />);
    const link = container.querySelector('a[href*="github"]') as HTMLAnchorElement;
    expect(link.rel).toContain('noopener');
  });

  it('theme colors hex format valid', () => {
    const hex = /^#[0-9a-fA-F]{6}$/;
    [...Object.values(darkTheme), ...Object.values(lightTheme)].forEach(c => expect(c).toMatch(hex));
  });

  it('encodeShareState unicode emoji preserved', () => {
    const p: any = { version: 1, etf: { name: 'Test Unicorn <> &' } };
    const dec = decodeShareState(encodeShareState(p)) as any;
    expect(dec.etf.name).toBe('Test Unicorn <> &');
  });

  it('no theme color is transparent', () => {
    expect(darkTheme.bgPrimary).not.toBe('transparent');
    expect(lightTheme.bgPrimary).not.toBe('transparent');
  });

  it('Header renders without crashing when no positions', () => {
    expect(() => render(<Header />)).not.toThrow();
  });
});
