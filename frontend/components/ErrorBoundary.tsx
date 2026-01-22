import React from 'react';

interface State {
  hasError: boolean;
  error?: Error | null;
}

class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, State> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    // Log error to console so user can see it in DevTools
    // (Could be extended to send to telemetry)
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{padding: 24, fontFamily: 'Inter, Arial, sans-serif'}}>
          <h2 style={{color: '#b91c1c'}}>Application error</h2>
          <pre style={{whiteSpace: 'pre-wrap', color: '#111'}}>{this.state.error?.message}</pre>
          <p style={{color: '#555'}}>Open DevTools console for stack trace.</p>
        </div>
      );
    }

    return this.props.children as React.ReactElement;
  }
}

export default ErrorBoundary;
