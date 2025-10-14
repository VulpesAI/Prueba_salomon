"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";

export type SignInState = { ok: boolean; message: string };

export async function signInAction(
  _prevState: SignInState | void,
  formData: FormData,
): Promise<SignInState | void> {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  if (!email || !password) return { ok: false, message: "Email y contraseña son obligatorios" };

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, message: error.message };

  redirect("/dashboard");
}

export async function signOutAction() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect("/login");
}
