'use client';

import { FormEvent, useState } from "react";

type FormData = {
  name: string;
  email: string;
  subject: string;
  message: string;
  accept: boolean;
};

const INITIAL: FormData = {
  name: "",
  email: "",
  subject: "",
  message: "",
  accept: false,
};

export default function ContactoPage() {
  const [form, setForm] = useState<FormData>(INITIAL);
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setOk(null);
    setErr(null);

    if (!form.name || !form.email || !form.subject || !form.message) {
      return setErr("Completa todos los campos.");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      return setErr("Email inválido.");
    }

    if (!form.accept) {
      return setErr("Debes aceptar la política de privacidad.");
    }

    setSaving(true);

    try {
      const res = await fetch("/api/contacto", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        throw new Error("No se pudo enviar el mensaje.");
      }

      setOk("Mensaje enviado. Te responderemos pronto.");
      setForm(INITIAL);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error al enviar.";
      setErr(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Contacto</h1>
        <p className="text-sm text-muted-foreground">
          ¿Tienes dudas o propuestas? Escríbenos con tus detalles.
        </p>
      </header>

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-2xl border bg-card p-6"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm">
            Nombre
            <input
              className="mt-1 w-full rounded-lg border bg-background p-2"
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
              required
            />
          </label>
          <label className="text-sm">
            Email
            <input
              type="email"
              className="mt-1 w-full rounded-lg border bg-background p-2"
              value={form.email}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, email: event.target.value }))
              }
              required
            />
          </label>
        </div>
        <label className="text-sm block">
          Asunto
          <input
            className="mt-1 w-full rounded-lg border bg-background p-2"
            value={form.subject}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, subject: event.target.value }))
            }
            required
          />
        </label>
        <label className="text-sm block">
          Mensaje
          <textarea
            className="mt-1 w-full rounded-lg border bg-background p-2 min-h-32"
            value={form.message}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, message: event.target.value }))
            }
            required
          />
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.accept}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, accept: event.target.checked }))
            }
            required
          />
          <span>
            Acepto la{' '}
            <a className="underline" href="/legal/privacidad">
              política de privacidad
            </a>
            .
          </span>
        </label>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-60"
            disabled={saving}
          >
            {saving ? "Enviando…" : "Enviar mensaje"}
          </button>
          {ok ? (
            <span className="text-xs text-emerald-600">{ok}</span>
          ) : null}
          {err ? <span className="text-xs text-red-600">{err}</span> : null}
        </div>
      </form>
    </div>
  );
}
