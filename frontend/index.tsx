import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

// Basic global handlers to ensure errors are visible in console
window.addEventListener('error', (e) => {
  // eslint-disable-next-line no-console
  console.error('Window error:', e.error || e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  // eslint-disable-next-line no-console
  console.error('Unhandled rejection:', e.reason);
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Diagnostic log so you can confirm the app boot is attempted
// eslint-disable-next-line no-console
console.log('Mounting React app...');

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// eslint-disable-next-line no-console
console.log('Render call completed.');