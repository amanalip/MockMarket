import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { AppErrorBoundary } from './components/ui/AppErrorBoundary';
import { installGlobalErrorReporting } from './engine/reporting/client-reporting';
import { restoreSharedStateFromHash } from './store';
import './index.css';

restoreSharedStateFromHash();
installGlobalErrorReporting();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>
);
