"use client";

import { useFormState } from "react-dom";
import { signInAction, type SignInState } from "./actions";

const initial: SignInState = { ok: true, message: "" };

export default function LoginForm() {
  const [state, action] = useFormState(signInAction, initial);
  const currentState = state ?? initial;

  return (
    <main className="min-h-screen grid place-items-center bg-slate-900 text-slate-100 p-6">
      <form action={action} className="w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold text-center">Entrar</h1>
        <input
          name="email"
          type="email"
          placeholder="tu@correo.cl"
          className="w-full rounded p-2 text-slate-900"
          required
        />
        <input
          name="password"
          type="password"
          placeholder="********"
          className="w-full rounded p-2 text-slate-900"
          required
        />
        {!currentState.ok && (
          <p className="text-sm bg-red-900/50 border border-red-500 rounded p-2">{currentState.message}</p>
        )}
        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 rounded p-2">
          Ingresar
        </button>
      </form>
    </main>
  );
}
