"use client";

import "@/styles/globals.css";
import type { AppProps } from "next/app";

import { AuthProvider } from "@/context/AuthContext";
import { SyncProvider } from "@/context/SyncContext";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <SyncProvider>
        <Component {...pageProps} />
      </SyncProvider>
    </AuthProvider>
  );
}
