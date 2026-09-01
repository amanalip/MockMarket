import React from 'react';
import { getAppRelease, getErrorReportUrl, reportClientError } from '../../engine/reporting/client-reporting';

interface AppErrorBoundaryState {
  hasError: boolean;
  reportId: string | null;
}

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false, reportId: null };
  private headingRef = React.createRef<HTMLHeadingElement>();

  static getDerivedStateFromError(): Partial<AppErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    this.setState({ reportId: reportClientError(error, 'render') }, () => this.headingRef.current?.focus());
  }

  private recover = (): void => {
    this.setState({ hasError: false, reportId: null });
  };

  render(): React.ReactNode {
    if (!this.state.hasError) return this.props.children;
    const reportUrl = this.state.reportId ? getErrorReportUrl(this.state.reportId) : null;

    return (
      <main
        role="alert"
        aria-live="assertive"
        style={{ maxWidth: 640, margin: '10vh auto', padding: 24, color: 'var(--text-primary)' }}
      >
        <h1 ref={this.headingRef} tabIndex={-1}>MockMarket could not display this screen</h1>
        <p>Your simulation data remains in this browser. Try rendering the app again, or reload the page if the problem continues.</p>
        <button type="button" onClick={this.recover}>Try again</button>{' '}
        <button type="button" onClick={() => window.location.reload()}>Reload application</button>
        {reportUrl && (
          <p>
            <a href={reportUrl} target="_blank" rel="noopener noreferrer">Report this technical problem</a>
            {' '}Only the release, time, error type, and reference above will be sent to GitHub after you submit.
          </p>
        )}
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          Release: {getAppRelease()}{this.state.reportId ? ` | Local error reference: ${this.state.reportId}` : ''}
        </p>
      </main>
    );
  }
}
