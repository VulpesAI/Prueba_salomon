import { useState } from "react";

import {
  HydrationBoundary,
  QueryClient,
  QueryClientProvider,
  type DehydratedState,
} from "@tanstack/react-query";
import "@/styles/globals.css";
import type { AppProps } from "next/app";

import { ReactQueryDevtools } from "@/components/react-query-devtools";
import { AuthProvider } from "@/context/AuthContext";

type AppPageProps = {
  dehydratedState?: DehydratedState;
  [key: string]: unknown;
};

export default function App({ Component, pageProps }: AppProps<AppPageProps>) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            retry: (failureCount, error) => {
              const status = (error as { response?: { status?: number } } | undefined)?.response?.status;
              if (status === 401) {
                return false;
              }

              return failureCount < 3;
            },
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
          },
          mutations: {
            retry: 1,
          },
        },
      })
  );

  const dehydratedState = pageProps.dehydratedState;

  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={dehydratedState}>
        <AuthProvider>
          <Component {...pageProps} />
        </AuthProvider>
      </HydrationBoundary>
      {process.env.NODE_ENV === "development" ? <ReactQueryDevtools /> : null}
    </QueryClientProvider>
  );
}
