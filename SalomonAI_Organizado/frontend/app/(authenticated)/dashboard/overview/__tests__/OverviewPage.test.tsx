import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useDashboardOverview", () => ({
  useDashboardOverview: vi.fn(),
}));

import type { OverviewData } from "@/hooks/useDashboardOverview";
import { useDashboardOverview } from "@/hooks/useDashboardOverview";
import OverviewPage from "../page";

type UseDashboardOverviewReturn = ReturnType<typeof useDashboardOverview>;

const createResult = (overrides: Partial<UseDashboardOverviewReturn>): UseDashboardOverviewReturn =>
  ({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    isFetching: false,
    failureCount: 0,
    failureReason: null,
    error: null,
    errorUpdateCount: 0,
    errorUpdatedAt: 0,
    isFetched: true,
    isFetchedAfterMount: true,
    isInitialLoading: false,
    isLoadingError: false,
    isPaused: false,
    isPending: false,
    isPlaceholderData: false,
    isRefetchError: false,
    isRefetching: false,
    isStale: false,
    isSuccess: true,
    status: "success",
    fetchStatus: "idle",
    dataUpdatedAt: Date.now(),
    remove: vi.fn(),
    fetchNextPage: vi.fn(),
    fetchPreviousPage: vi.fn(),
    ...overrides,
  }) as unknown as UseDashboardOverviewReturn;

describe("OverviewPage", () => {
  const mockedHook = vi.mocked(useDashboardOverview);

  beforeAll(() => {
    class ResizeObserverMock {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
  });

  beforeEach(() => {
    const overview: OverviewData = {
      kpis: {
        incomeCLP: 1000000,
        expensesCLP: 500000,
        netCLP: 500000,
        incomeDelta: 5,
        expensesDelta: -2,
        netDelta: 7,
      },
      flux: [
        { date: "2024-11-01", amount: 100000, type: "hist" },
        { date: "2024-11-02", amount: 105000, type: "proj", model_type: "demo", calculated_at: "2024-11-01T00:00:00Z" },
      ],
      categories: [
        { name: "Arriendo", amount: 200000, percent: 40 },
        { name: "Supermercado", amount: 100000, percent: 20 },
      ],
      insights: [{ text: "Mantén el ritmo de ahorro actual." }],
    };

    mockedHook.mockReturnValue(createResult({ data: overview }));
  });

  it("renders KPI strip, chart and insights", () => {
    render(<OverviewPage />);

    expect(screen.getByText(/Ingresos/i)).toBeInTheDocument();
    expect(screen.getByText(/Flujo neto/i)).toBeInTheDocument();
    expect(screen.getByText(/Mantén el ritmo de ahorro/i)).toBeInTheDocument();
  });

  it("permite cambiar el rango desde el panel", async () => {
    const user = userEvent.setup();
    render(<OverviewPage />);

    const group = screen.getByRole("group", { name: /rango de días/i });
    const option7 = within(group).getByRole("button", { name: /7 días/i });
    expect(option7).toHaveAttribute("aria-pressed", "false");

    await user.click(option7);
    expect(option7).toHaveAttribute("aria-pressed", "true");
  });
});
