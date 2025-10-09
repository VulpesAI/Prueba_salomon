"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useMovimientos } from "@/lib/hooks";

const formatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

const sanitize = (value: string) => value.replace(/[^\p{L}\p{N}\s.,-]/gu, "");

export default function TransactionsPage() {
  const [query, setQuery] = useState("");
  const movimientos = useMovimientos({ q: query ? query : undefined });

  const items = useMemo(
    () => movimientos.data?.pages.flatMap((page) => page.items) ?? [],
    [movimientos.data],
  );

  useEffect(() => {
    const onScroll = () => {
      if (
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 160 &&
        movimientos.hasNextPage &&
        !movimientos.isFetchingNextPage
      ) {
        void movimientos.fetchNextPage();
      }
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [movimientos]);

  if (movimientos.isPending && items.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full max-w-md" />
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Movimientos</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 md:flex-row md:items-center">
          <Input
            placeholder="Buscar descripción o comercio"
            value={query}
            onChange={(event) => setQuery(sanitize(event.target.value))}
            className="md:w-72"
          />
          <Button
            type="button"
            variant="secondary"
            disabled={movimientos.isPending}
            onClick={() => movimientos.refetch()}
          >
            Actualizar
          </Button>
        </CardContent>
      </Card>

      {movimientos.isError ? (
        <div className="space-y-2 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm">
          <p className="font-medium text-destructive">No fue posible cargar tus transacciones.</p>
          <Button size="sm" onClick={() => movimientos.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : null}

      {items.length === 0 && !movimientos.isPending ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No hay movimientos para los filtros seleccionados.
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-2">
        {items.map((movimiento) => (
          <Card key={movimiento.id}>
            <CardContent className="flex flex-col gap-2 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-medium">{movimiento.description ?? "Sin descripción"}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(movimiento.date).toLocaleString("es-CL")} · {movimiento.category}
                </p>
              </div>
              <div className="text-right">
                <p
                  className={
                    movimiento.amount < 0
                      ? "text-sm font-semibold text-app-danger"
                      : "text-sm font-semibold text-app-success"
                  }
                >
                  {formatter.format(movimiento.amount)} {movimiento.currency}
                </p>
                {movimiento.merchant ? (
                  <p className="text-xs text-muted-foreground">{movimiento.merchant}</p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
        {movimientos.isFetchingNextPage ? <Skeleton className="h-16 w-full" /> : null}
        {movimientos.hasNextPage && !movimientos.isFetchingNextPage ? (
          <div className="flex justify-center py-4">
            <Button onClick={() => movimientos.fetchNextPage()}>Cargar más</Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
