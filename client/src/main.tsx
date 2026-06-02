import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import { TimerProvider } from './lib/TimerContext';
import { AuthProvider } from './lib/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <TimerProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </TimerProvider>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
);
