import React, { Component, ErrorInfo, ReactNode } from 'react';
import { FIGMA_DESIGN } from '../utils/constants';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    console.error('Bracket component error:', error);
    console.error('Error info:', errorInfo);

    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div 
          className="flex items-center justify-center w-full h-full min-h-[400px] p-8"
          style={{ backgroundColor: FIGMA_DESIGN.COLORS.BACKGROUND }}
        >
          <div className="text-center space-y-4 max-w-md">
            {/* Error icon */}
            <div 
              className="mx-auto w-16 h-16 flex items-center justify-center rounded-lg border-2"
              style={{ 
                borderColor: '#EF4444',
                backgroundColor: '#FEF2F2',
                color: '#EF4444'
              }}
            >
              <svg 
                width="32" 
                height="32" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            
            {/* Error message */}
            <div className="space-y-2">
              <h3 
                className="font-bold"
                style={{
                  fontFamily: FIGMA_DESIGN.TYPOGRAPHY.ROUND_LABEL.FONT_FAMILY,
                  fontSize: `${FIGMA_DESIGN.TYPOGRAPHY.ROUND_LABEL.FONT_SIZE}px`,
                  fontWeight: FIGMA_DESIGN.TYPOGRAPHY.ROUND_LABEL.FONT_WEIGHT,
                  color: '#EF4444',
                  lineHeight: FIGMA_DESIGN.TYPOGRAPHY.ROUND_LABEL.LINE_HEIGHT,
                }}
              >
                Bracket Display Error
              </h3>
              
              <p 
                style={{
                  fontFamily: FIGMA_DESIGN.TYPOGRAPHY.TEAM_TEXT.FONT_FAMILY,
                  fontSize: `${FIGMA_DESIGN.TYPOGRAPHY.TEAM_TEXT.FONT_SIZE}px`,
                  fontWeight: FIGMA_DESIGN.TYPOGRAPHY.TEAM_TEXT.FONT_WEIGHT,
                  color: FIGMA_DESIGN.COLORS.GRAY_TEXT,
                  lineHeight: FIGMA_DESIGN.TYPOGRAPHY.TEAM_TEXT.LINE_HEIGHT,
                }}
              >
                Something went wrong while displaying the tournament bracket.
              </p>

              {/* Show error details in development */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4 text-left">
                  <summary 
                    className="cursor-pointer text-sm"
                    style={{ color: FIGMA_DESIGN.COLORS.GRAY_TEXT }}
                  >
                    Error Details (Development)
                  </summary>
                  <div 
                    className="mt-2 p-3 rounded text-xs font-mono whitespace-pre-wrap"
                    style={{ 
                      backgroundColor: '#F1F5F9',
                      color: '#475569',
                      maxHeight: '200px',
                      overflow: 'auto'
                    }}
                  >
                    <div className="font-bold mb-2">Error:</div>
                    <div className="mb-4">{this.state.error.message}</div>
                    
                    {this.state.errorInfo && (
                      <>
                        <div className="font-bold mb-2">Component Stack:</div>
                        <div>{this.state.errorInfo.componentStack}</div>
                      </>
                    )}
                  </div>
                </details>
              )}
            </div>

            {/* Retry button */}
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 rounded font-medium transition-colors"
              style={{
                backgroundColor: FIGMA_DESIGN.COLORS.REGULAR_BORDER,
                color: 'white',
                fontFamily: FIGMA_DESIGN.TYPOGRAPHY.TEAM_TEXT.FONT_FAMILY,
                fontSize: `${FIGMA_DESIGN.TYPOGRAPHY.TEAM_TEXT.FONT_SIZE}px`,
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#1D4ED8';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = FIGMA_DESIGN.COLORS.REGULAR_BORDER;
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;