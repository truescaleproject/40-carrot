import React, { ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw, Copy, RotateCcw } from 'lucide-react';
import { APP_VERSION } from '../constants';
import { logError } from '../utils/logger';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logError(error, {
      source: 'ErrorBoundary',
      componentStack: errorInfo.componentStack || ''
    });
    this.setState({ errorInfo });
  }

  handleReload = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false
    });
  };

  handleHardReload = () => {
    window.location.reload();
  };

  handleCopyDebug = () => {
    const debugData = {
      appVersion: APP_VERSION,
      error: this.state.error?.toString(),
      componentStack: this.state.errorInfo?.componentStack,
      userAgent: navigator.userAgent,
      time: new Date().toISOString()
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(JSON.stringify(debugData, null, 2))
          .then(() => this.setState({ copied: true }))
          .catch(err => console.error("Failed to copy log:", err));
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 font-sans" style={{ backgroundColor: '#0f172a', color: '#e2e8f0' }}>
          <div className="max-w-md w-full rounded-xl shadow-2xl p-8 relative overflow-hidden" style={{ backgroundColor: '#1e293b', border: '1px solid rgba(220,38,38,0.3)' }}>
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ backgroundColor: 'rgba(127,29,29,0.08)' }} />
            <div className="absolute top-0 left-0 w-full h-1 animate-pulse" style={{ backgroundColor: '#dc2626' }} />

            <div className="relative z-10 flex flex-col items-center text-center space-y-6">
              <div className="p-4 rounded-full" style={{ backgroundColor: 'rgba(127,29,29,0.2)', border: '1px solid rgba(220,38,38,0.3)' }}>
                <ShieldAlert size={48} style={{ color: '#ef4444' }} />
              </div>

              <div>
                <h2 className="text-2xl font-bold uppercase tracking-widest mb-2" style={{ color: '#ef4444', fontFamily: '"Science Gothic", "Orbitron", sans-serif' }}>
                  Something Went Wrong
                </h2>
                <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>
                  An unexpected error occurred. You can try recovering by reinitializing, or copy the error details below to share with the development team.
                </p>
              </div>

              {this.state.error && (
                <div className="w-full p-3 rounded-lg text-left" style={{ backgroundColor: 'rgba(0,0,0,0.4)', border: '1px solid rgba(127,29,29,0.3)' }}>
                  <p className="text-[10px] font-mono uppercase font-bold mb-1" style={{ color: 'rgba(248,113,113,0.8)' }}>Error Details:</p>
                  <code className="text-[11px] font-mono break-all block" style={{ color: '#64748b' }}>
                    {this.state.error.toString()}
                  </code>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 w-full">
                <button
                  onClick={this.handleReload}
                  className="flex items-center justify-center gap-2 px-4 py-3 font-bold rounded-lg transition-all active:scale-95"
                  style={{ backgroundColor: '#fbbf24', color: '#0f172a' }}
                >
                  <RefreshCw size={16} />
                  Recover
                </button>

                <button
                  onClick={this.handleCopyDebug}
                  className="flex items-center justify-center gap-2 px-4 py-3 font-bold rounded-lg transition-all active:scale-95"
                  style={{ backgroundColor: '#334155', color: '#e2e8f0', border: '1px solid #475569' }}
                >
                  <Copy size={16} />
                  {this.state.copied ? 'Copied' : 'Copy Log'}
                </button>
              </div>

              <button
                onClick={this.handleHardReload}
                className="flex items-center justify-center gap-2 text-xs transition-colors"
                style={{ color: '#64748b' }}
              >
                <RotateCcw size={12} />
                Full page reload
              </button>
            </div>
          </div>
          <div className="mt-6 text-[10px] font-mono" style={{ color: '#475569' }}>
            40 CARROT v{APP_VERSION}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
