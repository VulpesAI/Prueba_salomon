import type { ReactNode } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useMovementsInfinite } from "@/lib/hooks/useMovementsInfinite"

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  return { Wrapper, queryClient }
}

describe("useMovementsInfinite", () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it("carga páginas y utiliza el cursor para continuar la paginación", async () => {
    const firstPage = {
      items: [
        {
          id: "mv-1",
          occurred_at: "2025-10-07T12:00:00Z",
          merchant: "Jumbo",
          category: "supermercado",
          amount: 25000,
          currency: "CLP" as const,
          type: "EXPENSE" as const,
        },
      ],
      nextCursor: "cursor-1",
      totalMatched: 2,
    }

    const secondPage = {
      items: [
        {
          id: "mv-2",
          occurred_at: "2025-10-06T12:00:00Z",
          merchant: "Empresa Aurora",
          category: "salario",
          amount: 1500000,
          currency: "CLP" as const,
          type: "INCOME" as const,
        },
      ],
      nextCursor: null,
      totalMatched: 2,
    }

    const fetchMock = vi
      .fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => firstPage,
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => secondPage,
      } as unknown as Response)

    globalThis.fetch = fetchMock as unknown as typeof fetch

    const { Wrapper, queryClient } = createWrapper()

    const { result } = renderHook(() => useMovementsInfinite({ category: "supermercado", q: "jum" }), {
      wrapper: Wrapper,
    })

    await waitFor(() => {
      expect(result.current.status).toBe("success")
    })

    expect(result.current.data?.pages[0].items).toHaveLength(1)
    expect(result.current.hasNextPage).toBe(true)

    const firstCallUrl = new URL((fetchMock.mock.calls[0] as [RequestInfo | URL, RequestInit?])[0].toString(), "https://example.com")
    expect(firstCallUrl.searchParams.get("category")).toBe("supermercado")
    expect(firstCallUrl.searchParams.get("q")).toBe("jum")
    expect(firstCallUrl.searchParams.get("limit")).toBe("30")

    await act(async () => {
      await result.current.fetchNextPage()
    })

    await waitFor(() => {
      expect(result.current.data?.pages).toHaveLength(2)
    })

    expect(result.current.hasNextPage).toBe(false)

    const secondCallUrl = new URL((fetchMock.mock.calls[1] as [RequestInfo | URL, RequestInit?])[0].toString(), "https://example.com")
    expect(secondCallUrl.searchParams.get("cursor")).toBe("cursor-1")

    queryClient.clear()
  })

  it("lanza error cuando la respuesta no es exitosa", async () => {
    const fetchMock = vi
      .fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
      .mockResolvedValueOnce({ ok: false } as unknown as Response)

    globalThis.fetch = fetchMock as unknown as typeof fetch

    const { Wrapper, queryClient } = createWrapper()

    const { result } = renderHook(() => useMovementsInfinite({}), {
      wrapper: Wrapper,
    })

    await waitFor(() => {
      expect(result.current.status).toBe("error")
    })

    expect(result.current.error).toBeInstanceOf(Error)

    queryClient.clear()
  })
})
