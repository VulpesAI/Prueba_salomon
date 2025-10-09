"use client";

import * as React from "react";

import { Button } from "@/components/ui-demo/button";
import { Card } from "@/components/ui-demo/card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui-demo/input";
import { Loading } from "@/components/ui/Loading";
import { Select } from "@/components/ui-demo/select";
import { Skeleton } from "@/components/ui-demo/skeleton";

const categories = [
  { value: "food", label: "Comida" },
  { value: "transport", label: "Transporte" },
  { value: "rent", label: "Arriendo" },
];

export default function UIDemo() {
  const [category, setCategory] = React.useState<string | undefined>();

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-[24px] font-semibold text-text">UI Demo</h1>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primario</Button>
          <Button variant="secondary">Secundario</Button>
          <Button variant="ghost">Ghost</Button>
          <Button loading>Cargando</Button>
          <Button disabled>Deshabilitado</Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Nombre" placeholder="Tu nombre" helpText="Visible al asesor" />
          <Input label="Monto" placeholder="$0" errorText="Monto inválido" />
        </div>

        <Select
          label="Categoría"
          options={categories}
          value={category}
          onChange={setCategory}
          placeholder="Selecciona…"
        />

        <div className="flex flex-wrap items-center gap-2">
          <Chip kind="positive">Ingreso</Chip>
          <Chip kind="negative">Gasto</Chip>
          <Chip kind="warning">Alerta</Chip>
          <Chip>Neutro</Chip>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>Tarjeta dentro de Card</Card>
          <Skeleton className="h-16 w-full" />
          <Loading />
        </div>

        <ErrorState onRetry={() => console.log("retry")} />
        <EmptyState ctaLabel="Subir cartola" onCta={() => console.log("cta")} />
      </Card>
    </div>
  );
}
