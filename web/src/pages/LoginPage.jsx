import AuthCard from '../components/AuthCard.jsx';
import LoginHero from '../components/LoginHero.jsx';

export default function LoginPage() {
  return (
    <main className="auth">
      <LoginHero />
      <section className="auth-form" aria-labelledby="auth-title">
        <AuthCard />
      </section>
    </main>
  );
}
