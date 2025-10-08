'use client';

import { useQuery } from '@tanstack/react-query';

type Account = {
  id: string;
  provider: string;
  status: 'connected' | 'pending';
};

type AccountsResponse = {
  items: Account[];
};

export default function ConnectedAccounts() {
  const { data, isLoading, isError } = useQuery<AccountsResponse>({
    queryKey: ['accounts'],
    queryFn: async () => {
      const response = await fetch('/api/accounts', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Error al cargar cuentas');
      }
      return (await response.json()) as AccountsResponse;
    },
  });

  const accounts = data?.items ?? [];

  return (
    <div className="space-y-3 rounded-card border border-soft bg-gradient-card p-4 text-surface">
      <h3 className="text-base font-semibold text-surface">Cuentas conectadas</h3>
      {isLoading ? (
        <div className="h-10 w-full animate-pulse rounded-md border border-soft bg-[rgba(8,17,52,0.06)] dark:bg-[rgba(255,255,255,0.06)]" aria-hidden />
      ) : null}
      {isError ? (
        <div className="text-sm text-[color:var(--error)]">No se pudieron cargar las cuentas.</div>
      ) : null}
      {!isLoading && !isError && accounts.length === 0 ? (
        <p className="text-sm text-muted">
          Aún no conectas cuentas. Próximamente integraremos bancos via Belvo/Fintoc.
        </p>
      ) : null}
      <ul className="space-y-2">
        {accounts.map((account) => (
          <li
            key={account.id}
            className="flex items-center justify-between rounded-lg border border-soft bg-[rgba(8,17,52,0.06)] p-2 text-surface transition-colors hover:bg-[rgba(8,17,52,0.12)] dark:bg-[rgba(255,255,255,0.04)] dark:hover:bg-[rgba(255,255,255,0.08)]"
          >
            <div className="text-sm text-surface">
              <div className="font-medium">{account.provider}</div>
              <div className="text-muted">
                {account.status === 'connected' ? 'Conectado' : 'Pendiente'}
              </div>
            </div>
            <button
              className="h-8 cursor-not-allowed rounded-md border border-soft bg-[rgba(8,17,52,0.06)] px-3 text-sm text-surface opacity-60 dark:bg-[rgba(255,255,255,0.06)]"
              disabled
              type="button"
            >
              Gestionar
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
