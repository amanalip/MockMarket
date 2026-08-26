export type ThemeMode = 'dark' | 'light';

export interface ThemeColors {
  bgPrimary: string;
  bgSecondary: string;
  bgCard: string;
  bgCardHover: string;
  border: string;
  borderSubtle: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentHover: string;
  upGreen: string;
  downRed: string;
  chartGrid: string;
  chartBackground: string;
  chartText: string;
  chartCrosshair: string;
}

export const darkTheme: ThemeColors = {
  bgPrimary: '#0b0f19',
  bgSecondary: '#111827',
  bgCard: '#182234',
  bgCardHover: '#1e293b',
  border: '#2a374d',
  borderSubtle: '#1e293b',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  accent: '#3b82f6',
  accentHover: '#2563eb',
  upGreen: '#10b981',
  downRed: '#ef4444',
  chartGrid: '#1e293b',
  chartBackground: '#0b0f19',
  chartText: '#94a3b8',
  chartCrosshair: '#64748b',
};

export const lightTheme: ThemeColors = {
  bgPrimary: '#f8fafc',
  bgSecondary: '#ffffff',
  bgCard: '#ffffff',
  bgCardHover: '#f1f5f9',
  border: '#e2e8f0',
  borderSubtle: '#cbd5e1',
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  accent: '#2563eb',
  accentHover: '#1d4ed8',
  upGreen: '#059669',
  downRed: '#dc2626',
  chartGrid: '#e2e8f0',
  chartBackground: '#ffffff',
  chartText: '#475569',
  chartCrosshair: '#94a3b8',
};

export function getTheme(mode: ThemeMode): ThemeColors {
  return mode === 'light' ? lightTheme : darkTheme;
}
