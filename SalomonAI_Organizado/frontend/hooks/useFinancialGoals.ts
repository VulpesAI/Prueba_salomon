'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { ENV } from '@/config/env';

import {
  IS_DEMO_MODE,
  useDemoFinancialData,
} from '@/context/DemoFinancialDataContext';
import type { FinancialGoal, GoalsApiResponse } from '@/types/goals';

const FALLBACK_RESPONSE: GoalsApiResponse = {
  goals: [
    {
      id: 'demo-1',
      name: 'Fondo de Emergencia',
      description: 'Ahorro para gastos imprevistos equivalente a 6 meses',
      category: 'Ahorro',
      status: 'ACTIVE',
      targetAmount: 2500000,
      initialAmount: 500000,
      expectedMonthlyContribution: 200000,
      deviationThreshold: 0.15,
      startDate: new Date().toISOString(),
      targetDate: new Date(new Date().setMonth(new Date().getMonth() + 8)).toISOString(),
      metrics: {
        totalActual: 1350000,
        expectedAmountByNow: 1600000,
        deviationAmount: -250000,
        deviationRatio: -0.1562,
        progressPercentage: 54,
        pace: 'off_track',
        eta: new Date(new Date().setMonth(new Date().getMonth() + 10)).toISOString(),
        lastRecordedAt: new Date().toISOString(),
      },
      progressHistory: [
        {
          id: 'demo-progress-1',
          actualAmount: 350000,
          expectedAmount: 400000,
          note: 'Ahorro inicial',
          recordedAt: new Date().toISOString(),
        },
        {
          id: 'demo-progress-2',
          actualAmount: 500000,
          expectedAmount: 1200000,
          note: 'Depósitos recientes',
          recordedAt: new Date().toISOString(),
        },
      ],
    },
    {
      id: 'demo-2',
      name: 'Pie departamento',
      description: 'Reunir el 20% del valor del departamento',
      category: 'Vivienda',
      status: 'ACTIVE',
      targetAmount: 15000000,
      initialAmount: 1000000,
      expectedMonthlyContribution: 750000,
      deviationThreshold: 0.1,
      startDate: new Date().toISOString(),
      targetDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
      metrics: {
        totalActual: 5800000,
        expectedAmountByNow: 5200000,
        deviationAmount: 600000,
        deviationRatio: 0.1154,
        progressPercentage: 38.67,
        pace: 'ahead',
        eta: new Date(new Date().setMonth(new Date().getMonth() + 11)).toISOString(),
        lastRecordedAt: new Date().toISOString(),
      },
      progressHistory: [],
    },
  ],
  summary: {
    total: 2,
    active: 2,
    completed: 0,
    onTrack: 0,
    offTrack: 1,
    ahead: 1,
  },
};

export function useFinancialGoals(token?: string) {
  const { goals: demoGoals } = useDemoFinancialData();
  const isDemoMode = IS_DEMO_MODE;

  const [data, setData] = useState<GoalsApiResponse>(
    demoGoals ?? FALLBACK_RESPONSE
  );
  const [isLoading, setIsLoading] = useState(() => !demoGoals && !isDemoMode);
  const [error, setError] = useState<string | null>(null);

  const baseUrl = useMemo(() => {
    return ENV.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  }, []);

  const fetchGoals = useCallback(async () => {
    if (isDemoMode) {
      setData(demoGoals ?? FALLBACK_RESPONSE);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${baseUrl}/api/v1/goals`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('No se pudieron obtener las metas financieras');
      }

      const payload = (await response.json()) as GoalsApiResponse;
      setData(payload);
      setError(null);
    } catch (err) {
      console.warn('[useFinancialGoals] Using fallback data due to error:', err);
      setError((err as Error).message);
      setData(FALLBACK_RESPONSE);
    } finally {
      setIsLoading(false);
    }
  }, [baseUrl, demoGoals, isDemoMode, token]);

  useEffect(() => {
    if (isDemoMode && demoGoals) {
      setData(demoGoals);
      setIsLoading(false);
      setError(null);
      return;
    }

    void fetchGoals();
  }, [demoGoals, fetchGoals, isDemoMode]);

  return {
    goals: data.goals,
    summary: data.summary,
    isLoading,
    error,
    refresh: isDemoMode ? async () => undefined : fetchGoals,
  };
}
