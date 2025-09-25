'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginUser, registerUser } from '../lib/api';
import { useAuth } from '../components/AuthProvider';

export default function OnboardingPage() {
  const router = useRouter();
  const { setAuth, token, userEmail } = useAuth();
  const [registerMessage, setRegisterMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email'));
    const password = String(formData.get('password'));
    const fullName = String(formData.get('fullName'));

    try {
      setIsSubmitting(true);
      setError(null);
      await registerUser({ email, password, fullName });
      setRegisterMessage('Usuario creado correctamente. Ahora puedes iniciar sesión.');
      setLoginEmail(email);
      setLoginPassword('');
    } catch (err) {
      setRegisterMessage(null);
      setError(err instanceof Error ? err.message : 'No pudimos completar el registro.');
    } finally {
      setIsSubmitting(false);
      event.currentTarget.reset();
    }
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setIsSubmitting(true);
      setError(null);
      const response = await loginUser({ email: loginEmail, password: loginPassword });
      setAuth(response.access_token, loginEmail);
      router.push('/connect');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos iniciar sesión.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid" style={{ gap: '32px' }}>
      <header>
        <span className="section-title">Demo end-to-end</span>
        <h1>SalomónAI · Onboarding inteligente</h1>
        <p>
          Explora el flujo completo de onboarding, conexión bancaria simulada y dashboard con datos de ejemplo.
          Todo corre 100% local utilizando Docker.
        </p>
      </header>

      <section className="card" style={{ display: 'grid', gap: '24px' }}>
        <div style={{ display: 'grid', gap: '8px' }}>
          <h2>1. Crea tu cuenta</h2>
          <p>Utiliza un correo válido. La contraseña debe tener al menos 8 caracteres.</p>
        </div>

        <form onSubmit={handleRegister} style={{ display: 'grid', gap: '16px' }}>
          <div style={{ display: 'grid', gap: '8px' }}>
            <label htmlFor="fullName">Nombre completo</label>
            <input className="input" id="fullName" name="fullName" placeholder="Francisca Salazar" required />
          </div>
          <div style={{ display: 'grid', gap: '8px' }}>
            <label htmlFor="email">Correo electrónico</label>
            <input className="input" id="email" name="email" type="email" placeholder="fran@salomon.ai" required />
          </div>
          <div style={{ display: 'grid', gap: '8px' }}>
            <label htmlFor="password">Contraseña</label>
            <input className="input" id="password" name="password" type="password" placeholder="********" required minLength={8} />
          </div>
          <button className="button-primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creando usuario…' : 'Crear cuenta demo'}
          </button>
        </form>
      </section>

      <section className="card" style={{ display: 'grid', gap: '24px' }}>
        <div style={{ display: 'grid', gap: '8px' }}>
          <h2>2. Inicia sesión</h2>
          <p>Al autenticarse se guardará un token JWT local para consumir el resto de endpoints protegidos.</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'grid', gap: '16px' }}>
          <div style={{ display: 'grid', gap: '8px' }}>
            <label htmlFor="loginEmail">Correo electrónico</label>
            <input
              className="input"
              id="loginEmail"
              name="loginEmail"
              type="email"
              placeholder="fran@salomon.ai"
              required
              value={loginEmail}
              onChange={event => setLoginEmail(event.target.value)}
            />
          </div>
          <div style={{ display: 'grid', gap: '8px' }}>
            <label htmlFor="loginPassword">Contraseña</label>
            <input
              className="input"
              id="loginPassword"
              name="loginPassword"
              type="password"
              placeholder="********"
              required
              minLength={8}
              value={loginPassword}
              onChange={event => setLoginPassword(event.target.value)}
            />
          </div>
          <button className="button-primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Verificando…' : 'Entrar a mi panel'}
          </button>
        </form>

        {registerMessage && <p style={{ color: '#34d399' }}>{registerMessage}</p>}
        {error && <p style={{ color: '#f87171' }}>{error}</p>}
        {token && (
          <p style={{ color: '#38bdf8' }}>
            Sesión activa como <strong>{userEmail}</strong>. Continúa con la conexión bancaria.
          </p>
        )}
      </section>
    </div>
  );
}
