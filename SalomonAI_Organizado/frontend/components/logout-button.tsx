"use client";

import { useTransition } from "react";
import { signOutAction } from "@/app/(auth)/login/actions";

export function LogoutButton() {
  const [pending, start] = useTransition();
  return (
    <button onClick={() => start(() => signOutAction())} disabled={pending}>
      Cerrar sesión
    </button>
  );
}
