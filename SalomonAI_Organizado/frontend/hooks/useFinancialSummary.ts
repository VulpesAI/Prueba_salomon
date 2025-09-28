'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FinancialSummary } from './useConversationEngine';

export function useFinancialSummary(sessionId: string) {
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const baseUrl = useMemo(() => {
    return process.env.NEXT_PUBLIC_CONVERSATION_ENGINE_URL ?? 'http://localhost:8002';
  }, []);

  const fetchSummary = useCallback(async () => {
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
  }, [baseUrl, sessionId]);

  useEffect(() => {
    void fetchSummary();
  }, [fetchSummary]);

  return {
    summary,
    isLoading,
    error,
    refresh: fetchSummary,
    updateSummary: setSummary
  };
}
