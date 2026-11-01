import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './hooks/useAuth.jsx';
import { ConsentProvider } from './hooks/useConsent.jsx';
import { I18nProvider } from './hooks/useI18n.jsx';
import { ThemeProvider } from './hooks/useTheme.jsx';
import './styles/main.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <ConsentProvider>
          <ThemeProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </ThemeProvider>
        </ConsentProvider>
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>
);
