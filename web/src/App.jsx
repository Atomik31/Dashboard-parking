import { Navigate, Route, Routes } from 'react-router-dom';
import CookieBanner from './components/CookieBanner.jsx';
import Footer from './components/Footer.jsx';
import Loader from './components/Loader.jsx';
import { useAuth } from './hooks/useAuth.jsx';
import { useI18n } from './hooks/useI18n.jsx';
import Dashboard from './pages/Dashboard.jsx';
import LegalPage from './pages/LegalPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import NotFound from './pages/NotFound.jsx';

/* Écran de connexion plein écran tant que l'utilisateur n'est pas connecté. */
function Home() {
  const { user, ready } = useAuth();
  const { t } = useI18n();
  if (!ready) return <Loader message={t.app_name} />;
  return user ? <Dashboard /> : <LoginPage />;
}

export default function App() {
  return (
    <div className="pk-app">
      <div className="pk-content">
        <Routes>
          <Route path="/" element={<Home />} />
          {/* pages juridiques : accessibles sans être connecté */}
          <Route path="/cgu" element={<LegalPage page="cgu" />} />
          <Route path="/confidentialite" element={<LegalPage page="confidentialite" />} />
          <Route path="/mentions-legales" element={<LegalPage page="mentions-legales" />} />
          <Route path="/index.html" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      <Footer />
      <CookieBanner />
    </div>
  );
}
