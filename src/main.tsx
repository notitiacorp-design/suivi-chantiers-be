import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
          <h1 style={{ color: 'red' }}>Erreur de chargement</h1>
          <p>L'application a rencontrÃ© une erreur.</p>
          <pre style={{ background: '#f5f5f5', padding: '1rem', overflow: 'auto', fontSize: '0.875rem' }}>
            {this.state.error?.message}
          </pre>
          <button onClick={() => window.location.reload()} style={{ padding: '0.5rem 1rem', marginTop: '1rem', cursor: 'pointer' }}>
            Recharger
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
