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
    <div className="space-y-2 rounded-xl border p-4">
      <h3 className="text-base font-semibold">Cuentas conectadas</h3>
      {isLoading ? (
        <div className="h-10 w-full animate-pulse rounded-md border" aria-hidden />
      ) : null}
      {isError ? (
        <div className="text-sm text-destructive">No se pudieron cargar las cuentas.</div>
      ) : null}
      {!isLoading && !isError && accounts.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aún no conectas cuentas. Próximamente integraremos bancos via Belvo/Fintoc.
        </p>
      ) : null}
      <ul className="space-y-2">
        {accounts.map((account) => (
          <li
            key={account.id}
            className="flex items-center justify-between rounded-md border p-2"
          >
            <div className="text-sm">
              <div className="font-medium">{account.provider}</div>
              <div className="text-muted-foreground">
                {account.status === 'connected' ? 'Conectado' : 'Pendiente'}
              </div>
            </div>
            <button
              className="h-8 cursor-not-allowed rounded-md border px-3 text-sm opacity-60"
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
