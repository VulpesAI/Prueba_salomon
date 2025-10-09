'use client';

import { useState, type FormEvent, type ReactNode } from 'react';

type FormData = {
  name: string;
  email: string;
  subject: string;
  message: string;
  accept: boolean;
};

const INITIAL: FormData = { name: '', email: '', subject: '', message: '', accept: false };

export default function ContactoPage() {
  const [form, setForm] = useState<FormData>(INITIAL);
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setOk(null); setErr(null);

    // Validaciones mínimas
    if (!form.name || !form.email || !form.subject || !form.message) {
      setErr('Completa todos los campos.'); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setErr('Email inválido.'); return;
    }
    if (!form.accept) {
      setErr('Debes aceptar la política de privacidad.'); return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/contacto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('No se pudo enviar el mensaje.');
      setOk('Mensaje enviado. Te responderemos pronto.');
      setForm(INITIAL);
    } catch (e: any) {
      setErr(e.message ?? 'Error al enviar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-3xl font-semibold text-foreground">Contacto</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ¿Tienes dudas o propuestas? Escríbenos con tus detalles.
        </p>
      </header>

      {/* Card */}
      <form
        onSubmit={onSubmit}
        className="rounded-2xl border bg-card shadow-sm"
        noValidate
      >
        <div className="p-6 grid gap-6">
          {/* fila nombre / email */}
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Nombre"
              htmlFor="name"
              error={null}
            >
              <input
                id="name"
                className="sal-input"
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                required
                autoComplete="name"
              />
            </Field>

            <Field
              label="Email"
              htmlFor="email"
              error={null}
            >
              <input
                id="email"
                type="email"
                className="sal-input"
                value={form.email}
                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                required
                autoComplete="email"
              />
            </Field>
          </div>

          <Field label="Asunto" htmlFor="subject" error={null}>
            <input
              id="subject"
              className="sal-input"
              value={form.subject}
              onChange={(e) => setForm(f => ({ ...f, subject: e.target.value }))}
              required
            />
          </Field>

          <Field label="Mensaje" htmlFor="message" error={null}>
            <textarea
              id="message"
              className="sal-input min-h-40 resize-y"
              value={form.message}
              onChange={(e) => setForm(f => ({ ...f, message: e.target.value }))}
              required
            />
          </Field>

          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-input bg-background text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              checked={form.accept}
              onChange={(e) => setForm(f => ({ ...f, accept: e.target.checked }))}
            />
            <span className="text-foreground">
              Acepto la{' '}
              <a className="underline hover:text-primary" href="/legal/privacidad">
                política de privacidad
              </a>.
            </span>
          </label>

          {/* Mensajes */}
          <div className="min-h-5" aria-live="polite">
            {ok && <p className="text-xs text-emerald-500">{ok}</p>}
            {err && <p className="text-xs text-red-500">{err}</p>}
          </div>
        </div>

        {/* Footer de card */}
        <div className="flex items-center justify-end gap-3 border-t p-6">
          <button
            type="submit"
            disabled={saving}
            className="sal-btn-primary"
            aria-busy={saving}
          >
            {saving && <Spinner className="mr-2" />}
            {saving ? 'Enviando…' : 'Enviar mensaje'}
          </button>
        </div>
      </form>

      {/* estilos locales del form (usar tokens del design system) */}
      <style jsx>{`
        .sal-input {
          @apply w-full rounded-lg border border-input bg-background px-3 py-2
                 text-foreground shadow-xs
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
                 placeholder:text-muted-foreground/70;
        }
        .sal-btn-primary {
          @apply inline-flex items-center justify-center gap-2 whitespace-nowrap
                 rounded-lg px-5 py-2.5 text-sm font-medium
                 text-white
                 bg-gradient-to-r from-primary-from to-primary-to
                 hover:from-primary-dark-from hover:to-primary-dark-to
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                 disabled:pointer-events-none disabled:opacity-60;
        }
      `}</style>
    </div>
  );
}

/* ---------- UI MINIMA ---------- */

function Field({
  label, htmlFor, error, children,
}: { label: string; htmlFor: string; error: string | null; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
    </div>
  );
}

function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      aria-hidden="true"
    />
  );
}
