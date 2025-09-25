'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchDashboardMovements, fetchDashboardSummary } from '../../lib/api';
import { useAuth } from '../../components/AuthProvider';

type SummaryResponse = Awaited<ReturnType<typeof fetchDashboardSummary>>;
type MovementsResponse = Awaited<ReturnType<typeof fetchDashboardMovements>>;

export default function DashboardPage() {
  const { token, userEmail, logout, isLoading } = useAuth();
  const router = useRouter();
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [movements, setMovements] = useState<MovementsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (!isLoading && !token) {
      router.replace('/');
    }
  }, [isLoading, token, router]);

  useEffect(() => {
    if (!token) return;

    const loadDashboard = async () => {
      try {
        setIsFetching(true);
        setError(null);
        const [summaryResponse, movementsResponse] = await Promise.all([
          fetchDashboardSummary(token),
          fetchDashboardMovements(token),
        ]);
        setSummary(summaryResponse);
        setMovements(movementsResponse);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No pudimos obtener la información financiera.');
      } finally {
        setIsFetching(false);
      }
    };

    loadDashboard();
  }, [token]);

  if (!token) {
    return null;
  }

  const totalIncome = summary?.summary.totalIncome ?? 0;
  const totalExpenses = summary?.summary.totalExpenses ?? 0;
  const balance = summary?.summary.balance ?? 0;

  return (
    <div className="grid" style={{ gap: '32px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
        <div>
          <span className="section-title">Paso 4 · Dashboard</span>
          <h1>Salud financiera en tiempo real</h1>
          <p>
            Visualiza ingresos, gastos y las últimas transacciones sincronizadas desde el conector bancario simulado.
          </p>
          <p style={{ fontSize: '0.9rem', color: 'rgba(226,232,240,0.7)' }}>
            Sesión activa como <strong>{userEmail}</strong> ·{' '}
            <button type="button" onClick={logout} style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer' }}>
              Cerrar sesión
            </button>
          </p>
        </div>
        <button className="button-primary" onClick={() => router.push('/connect')} style={{ whiteSpace: 'nowrap' }}>
          Administrar bancos
        </button>
      </header>

      <section className="grid two-columns">
        <article className="card" style={{ display: 'grid', gap: '16px' }}>
          <span className="section-title">Ingresos</span>
          <h2>${totalIncome.toLocaleString('es-CL')}</h2>
          <p>Total recibido durante el último mes.</p>
        </article>
        <article className="card" style={{ display: 'grid', gap: '16px' }}>
          <span className="section-title">Gastos</span>
          <h2>${totalExpenses.toLocaleString('es-CL')}</h2>
          <p>Egresos totales clasificados en la misma ventana temporal.</p>
        </article>
        <article className="card" style={{ display: 'grid', gap: '16px' }}>
          <span className="section-title">Balance</span>
          <h2 style={{ color: balance >= 0 ? '#34d399' : '#f87171' }}>${balance.toLocaleString('es-CL')}</h2>
          <p>Ingresos menos gastos · actualiza al sincronizar nuevamente.</p>
        </article>
        <article className="card" style={{ display: 'grid', gap: '16px' }}>
          <span className="section-title">Transacciones</span>
          <h2>{summary?.summary.transactionCount ?? 0}</h2>
          <p>Total de movimientos detectados durante el período.</p>
        </article>
      </section>

      {error && <p style={{ color: '#f87171' }}>{error}</p>}
      {isFetching && <p>Cargando panel financiero…</p>}

      {summary && (
        <section className="card" style={{ display: 'grid', gap: '16px' }}>
          <h2>Distribución por categoría</h2>
          <ul className="list-reset" style={{ display: 'grid', gap: '8px' }}>
            {Object.entries(summary.categories).map(([categoryName, data]) => (
              <li key={categoryName} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                <span>{categoryName}</span>
                <span style={{ color: data.type === 'income' ? '#34d399' : '#f87171' }}>
                  ${Math.round(data.total).toLocaleString('es-CL')} · {data.count} movimientos
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {summary && (
        <section className="card" style={{ display: 'grid', gap: '16px' }}>
          <h2>Tendencia semanal</h2>
          <ul className="list-reset" style={{ display: 'grid', gap: '8px' }}>
            {summary.trends.map(trend => (
              <li key={trend.week} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{new Date(trend.week).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}</span>
                <span>
                  <strong style={{ color: '#34d399' }}>+${Math.round(trend.income).toLocaleString('es-CL')}</strong>{' '}
                  <span style={{ color: '#f87171' }}>-${Math.round(trend.expenses).toLocaleString('es-CL')}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {movements && (
        <section className="card" style={{ display: 'grid', gap: '16px' }}>
          <h2>Últimas transacciones</h2>
          <ul className="list-reset" style={{ display: 'grid', gap: '12px' }}>
            {movements.movements.slice(0, 8).map(movement => (
              <li
                key={movement.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: '1px solid rgba(148,163,184,0.2)',
                }}
              >
                <div>
                  <strong>{movement.description}</strong>
                  <p style={{ marginBottom: 0, fontSize: '0.85rem', color: 'rgba(226,232,240,0.7)' }}>
                    {movement.category ?? 'Sin categoría'} · {new Date(movement.date).toLocaleDateString('es-CL')}
                  </p>
                </div>
                <span style={{ color: movement.amount >= 0 ? '#34d399' : '#f87171', fontWeight: 600 }}>
                  {movement.amount >= 0 ? '+' : '-'}${Math.abs(movement.amount).toLocaleString('es-CL')}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
