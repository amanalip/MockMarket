export type ClientErrorSource = 'render' | 'window' | 'promise';

export interface ClientErrorReport {
  id: string;
  timestamp: string;
  release: string;
  environment: 'production';
  source: ClientErrorSource;
  errorType: string;
}

const REPORTS_KEY = 'mockmarket_client_errors_v1';
const MAX_REPORTS = 20;
const release = import.meta.env.VITE_APP_RELEASE?.trim() || 'unreleased';

function safeErrorType(error: unknown): string {
  if (error instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(error.name)) return error.name;
  return 'UnknownError';
}

export function reportClientError(error: unknown, source: ClientErrorSource): string | null {
  if (!import.meta.env.PROD) return null;

  const report: ClientErrorReport = {
    id: `err_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    release,
    environment: 'production',
    source,
    errorType: safeErrorType(error),
  };

  try {
    const current: unknown = JSON.parse(localStorage.getItem(REPORTS_KEY) || '[]');
    const reports = Array.isArray(current) ? current.slice(-(MAX_REPORTS - 1)) : [];
    localStorage.setItem(REPORTS_KEY, JSON.stringify([...reports, report]));
  } catch {
    // Diagnostics must never interfere with application recovery.
  }

  return report.id;
}

export function installGlobalErrorReporting(): void {
  if (!import.meta.env.PROD || typeof window === 'undefined') return;
  window.addEventListener('error', (event) => reportClientError(event.error, 'window'));
  window.addEventListener('unhandledrejection', (event) => reportClientError(event.reason, 'promise'));
}

export function getAppRelease(): string {
  return release;
}

export function getErrorReportUrl(reportId: string): string | null {
  try {
    const current: unknown = JSON.parse(localStorage.getItem(REPORTS_KEY) || '[]');
    if (!Array.isArray(current)) return null;
    const report = current.find((item): item is ClientErrorReport => (
      item !== null && typeof item === 'object' && (item as ClientErrorReport).id === reportId
    ));
    if (!report) return null;
    const body = [
      'A sanitized MockMarket client error occurred.',
      '',
      `Reference: ${report.id}`,
      `Release: ${report.release}`,
      `Environment: ${report.environment}`,
      `Source: ${report.source}`,
      `Error type: ${report.errorType}`,
      `Timestamp: ${report.timestamp}`,
      '',
      'No simulation, URL, portfolio, ticker, strategy, or personal data is included.',
    ].join('\n');
    const params = new URLSearchParams({ title: `Client error ${report.id}`, body });
    return `https://github.com/amanalip/MockMarket/issues/new?${params}`;
  } catch {
    return null;
  }
}
