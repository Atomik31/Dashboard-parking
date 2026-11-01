import { useI18n } from '../hooks/useI18n.jsx';
import { useTheme } from '../hooks/useTheme.jsx';

export default function ThemeToggle() {
  const { t } = useI18n();
  const { theme, basculer } = useTheme();
  const versClair = theme === 'dark';
  return (
    <button type="button" className="btn btn-icon" onClick={basculer} aria-label={versClair ? t.theme_to_light : t.theme_to_dark} title={versClair ? t.theme_to_light : t.theme_to_dark}>
      {versClair ? '☀' : '☾'}
    </button>
  );
}
