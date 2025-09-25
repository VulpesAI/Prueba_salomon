'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createConnection, fetchConnections, fetchInstitutions, BelvoInstitution } from '../../lib/api';
import { useAuth } from '../../components/AuthProvider';

interface ConnectionView {
  id: string;
  institutionName: string;
  status: string;
  lastSyncAt: string | null;
  isHealthy: boolean;
}

export default function ConnectBankPage() {
  const router = useRouter();
  const { token, userEmail, logout, isLoading } = useAuth();
  const [institutions, setInstitutions] = useState<BelvoInstitution[]>([]);
  const [connections, setConnections] = useState<ConnectionView[]>([]);
  const [selectedInstitution, setSelectedInstitution] = useState('');
  const [username, setUsername] = useState('demo_user');
  const [password, setPassword] = useState('demo_password');
  const [isFetching, setIsFetching] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !token) {
      router.replace('/');
    }
  }, [isLoading, token, router]);

  useEffect(() => {
    if (!token) return;

    const loadData = async () => {
      try {
        setIsFetching(true);
        setError(null);
        const [institutionsResponse, connectionsResponse] = await Promise.all([
          fetchInstitutions(token),
          fetchConnections(token),
        ]);
        setInstitutions(institutionsResponse.institutions);
        setConnections(connectionsResponse.connections);
        if (!selectedInstitution && institutionsResponse.institutions.length > 0) {
          setSelectedInstitution(institutionsResponse.institutions[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No pudimos obtener datos del banco.');
      } finally {
        setIsFetching(false);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleConnect = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;

    try {
      setIsConnecting(true);
      setFeedback(null);
      setError(null);
      await createConnection(token, { institution: selectedInstitution, username, password });
      setFeedback('Conexión creada y sincronizada exitosamente.');
      const updatedConnections = await fetchConnections(token);
      setConnections(updatedConnections.connections);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible conectar la cuenta.');
    } finally {
      setIsConnecting(false);
    }
  };

  const activeConnections = useMemo(() => connections.filter(conn => conn.isHealthy), [connections]);

  if (!token) {
    return null;
  }

  return (
    <div className="grid" style={{ gap: '32px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
        <div>
          <span className="section-title">Paso 3 · Conecta tu banco</span>
          <h1>Sincroniza instituciones financieras en modo sandbox</h1>
          <p>
            Estamos utilizando datos mockeados para simular la integración con Belvo. El flujo completo permite validar UX y 
            consumo de endpoints protegidos.
          </p>
          <p style={{ fontSize: '0.9rem', color: 'rgba(226,232,240,0.7)' }}>
            Sesión activa como <strong>{userEmail}</strong> ·{' '}
            <button type="button" onClick={logout} style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer' }}>
              Cerrar sesión
            </button>
          </p>
        </div>
        <button className="button-primary" onClick={() => router.push('/dashboard')} style={{ whiteSpace: 'nowrap' }}>
          Ir al dashboard
        </button>
      </header>

      <section className="card" style={{ display: 'grid', gap: '24px' }}>
        <div>
          <h2>Selecciona una institución</h2>
          <p>Credenciales ficticias, la conexión se resuelve instantáneamente.</p>
        </div>

        <form onSubmit={handleConnect} style={{ display: 'grid', gap: '16px' }}>
          <div style={{ display: 'grid', gap: '8px' }}>
            <label htmlFor="institution">Banco</label>
            <select
              id="institution"
              className="input"
              value={selectedInstitution}
              onChange={event => setSelectedInstitution(event.target.value)}
              disabled={isFetching || institutions.length === 0}
            >
              {institutions.map(institution => (
                <option key={institution.id} value={institution.id}>
                  {institution.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid two-columns">
            <div style={{ display: 'grid', gap: '8px' }}>
              <label htmlFor="username">Usuario</label>
              <input
                id="username"
                className="input"
                value={username}
                onChange={event => setUsername(event.target.value)}
                required
              />
            </div>
            <div style={{ display: 'grid', gap: '8px' }}>
              <label htmlFor="password">Clave</label>
              <input
                id="password"
                className="input"
                type="password"
                value={password}
                onChange={event => setPassword(event.target.value)}
                required
              />
            </div>
          </div>

          <button className="button-primary" type="submit" disabled={isConnecting || !selectedInstitution}>
            {isConnecting ? 'Conectando…' : 'Conectar y sincronizar'}
          </button>
        </form>

        {feedback && <p style={{ color: '#34d399' }}>{feedback}</p>}
        {error && <p style={{ color: '#f87171' }}>{error}</p>}
      </section>

      <section className="card" style={{ display: 'grid', gap: '16px' }}>
        <h2>Conexiones activas</h2>
        {connections.length === 0 ? (
          <p>Aún no tienes cuentas sincronizadas. Conecta un banco para ver movimientos en el dashboard.</p>
        ) : (
          <ul className="list-reset" style={{ display: 'grid', gap: '12px' }}>
            {connections.map(connection => (
              <li
                key={connection.id}
                style={{
                  padding: '16px',
                  borderRadius: '16px',
                  border: '1px solid rgba(148,163,184,0.2)',
                  background: 'rgba(15,23,42,0.4)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                  <div>
                    <strong>{connection.institutionName}</strong>
                    <p style={{ marginBottom: 0, fontSize: '0.85rem', color: 'rgba(226,232,240,0.7)' }}>
                      Estado: {connection.status} · Última sync:{' '}
                      {connection.lastSyncAt ? new Date(connection.lastSyncAt).toLocaleString() : 'pendiente'}
                    </p>
                  </div>
                  <span style={{ color: connection.isHealthy ? '#34d399' : '#f87171' }}>
                    {connection.isHealthy ? 'Activa' : 'Con problemas'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {activeConnections.length > 0 && (
        <section className="card" style={{ display: 'grid', gap: '12px' }}>
          <h2>¿Qué sigue?</h2>
          <ol className="list-reset" style={{ display: 'grid', gap: '8px', listStyle: 'decimal inside' }}>
            <li>Revisa el dashboard para analizar ingresos, gastos y tendencias.</li>
            <li>Prueba a registrar nuevos movimientos desde la API para extender el dataset.</li>
            <li>Personaliza la demo actualizando los mocks de instituciones y transacciones.</li>
          </ol>
        </section>
      )}
    </div>
  );
}
