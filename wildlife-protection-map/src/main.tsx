import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ApplicationProvider } from './store'
import { ErrorBoundary } from './components'
import './components/ErrorBoundary.css'
import { handleError, reportError } from './utils/errorHandler'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary
      onError={(error, errorInfo) => {
        const appError = handleError(error, 'Root ErrorBoundary');
        reportError(appError, { errorInfo });
      }}
    >
      <ApplicationProvider>
        <App />
      </ApplicationProvider>
    </ErrorBoundary>
  </StrictMode>,
)
