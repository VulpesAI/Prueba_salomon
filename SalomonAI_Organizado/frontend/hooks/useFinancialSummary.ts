'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { ENV } from '@/config/env';

import {
  IS_DEMO_MODE,
  useDemoFinancialData,
} from '@/context/DemoFinancialDataContext';

import type { FinancialSummary } from './useConversationEngine';

export function useFinancialSummary(sessionId: string) {
  const { financialSummary: demoSummary } = useDemoFinancialData();
  const isDemoMode = IS_DEMO_MODE;

  const [summary, setSummary] = useState<FinancialSummary | null>(
    isDemoMode ? demoSummary ?? null : null
  );
  const [isLoading, setIsLoading] = useState(
    () => (isDemoMode ? !demoSummary : true)
  );
  const [error, setError] = useState<string | null>(null);

  const baseUrl = useMemo(() => {
    return ENV.NEXT_PUBLIC_CONVERSATION_ENGINE_URL || 'http://localhost:8002';
  }, []);

  const fetchSummary = useCallback(async () => {
    if (isDemoMode) {
      setSummary(demoSummary ?? null);
      setIsLoading(false);
      setError(null);
      return;
    }

    if (!sessionId) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${baseUrl}/context/summary?session_id=${sessionId}`);
      if (!response.ok) {
        throw new Error('No se pudo obtener el resumen financiero');
      }
      const data = await response.json();
      setSummary(data);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [baseUrl, demoSummary, isDemoMode, sessionId]);

  useEffect(() => {
    void fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    if (!isDemoMode) {
      return;
    }

    setSummary(demoSummary ?? null);
    setIsLoading(!demoSummary);
    setError(null);
  }, [demoSummary, isDemoMode]);

  return {
    summary,
    isLoading,
    error,
    refresh: fetchSummary,
    updateSummary: setSummary
  };
}
