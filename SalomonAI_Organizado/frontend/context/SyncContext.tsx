'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

type SyncQueueItem = {
  id: string;
  endpoint: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
  lastAttemptAt?: string | null;
  status: 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  errorMessage?: string | null;
  metadata?: Record<string, unknown> | null;
  authToken?: string | null;
};

type SyncContextValue = {
  queue: SyncQueueItem[];
  isOnline: boolean;
  enqueue: (input: {
    endpoint: string;
    payload?: Record<string, unknown> | null;
    metadata?: Record<string, unknown> | null;
    id?: string;
    authToken?: string | null;
  }) => string;
  markCompleted: (clientRequestId: string) => void;
  setFailed: (clientRequestId: string, error?: string) => void;
};

const STORAGE_KEY = 'salomon.sync.queue';

const SyncContext = createContext<SyncContextValue | undefined>(undefined);

function loadInitialQueue(): SyncQueueItem[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as SyncQueueItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('No fue posible cargar la cola offline', error);
    return [];
  }
}

function persistQueue(queue: SyncQueueItem[]) {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.warn('No fue posible persistir la cola offline', error);
  }
}

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<SyncQueueItem[]>(() => loadInitialQueue());
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const eventSourceRef = useRef<EventSource | null>(null);
  const processingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    persistQueue(queue);
  }, [queue]);

  const enqueue = useCallback<SyncContextValue['enqueue']>((input) => {
    const generatedId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    const id = input.id ?? generatedId;
    const item: SyncQueueItem = {
      id,
      endpoint: input.endpoint,
      payload: input.payload ?? null,
      metadata: input.metadata ?? null,
      createdAt: new Date().toISOString(),
      status: 'QUEUED',
      errorMessage: null,
      authToken: input.authToken ?? null,
    };

    setQueue(current => {
      const exists = current.some(existing => existing.id === item.id);
      if (exists) {
        return current;
      }
      return [...current, item];
    });

    return id;
  }, []);

  const markCompleted = useCallback((clientRequestId: string) => {
    setQueue(current => current.filter(item => item.id !== clientRequestId));
    processingRef.current.delete(clientRequestId);
  }, []);

  const setFailed = useCallback((clientRequestId: string, error?: string) => {
    setQueue(current =>
      current.map(item =>
        item.id === clientRequestId
          ? { ...item, status: 'FAILED', errorMessage: error ?? 'Error desconocido', lastAttemptAt: new Date().toISOString() }
          : item,
      ),
    );
    processingRef.current.delete(clientRequestId);
  }, []);

  const handleOnlineStatus = useCallback(() => {
    setIsOnline(navigator.onLine);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);

    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, [handleOnlineStatus]);

  const baseUrl = useMemo(() => (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, ''), []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const eventsUrl = `${baseUrl}/sync/events`;

    const source = new EventSource(eventsUrl);
    eventSourceRef.current = source;

    source.onmessage = event => {
      try {
        const data = JSON.parse(event.data) as { clientRequestId: string; status: SyncQueueItem['status']; errorMessage?: string | null };
        if (!data?.clientRequestId) return;
        if (data.status === 'COMPLETED') {
          markCompleted(data.clientRequestId);
        }
        if (data.status === 'FAILED') {
          setFailed(data.clientRequestId, data.errorMessage ?? undefined);
        }
      } catch (error) {
        console.error('No fue posible procesar evento de sincronización', error);
      }
    };

    source.onerror = error => {
      console.warn('Error en canal SSE de sincronización', error);
      source.close();
      eventSourceRef.current = null;
    };

    return () => {
      source.close();
      eventSourceRef.current = null;
    };
  }, [baseUrl, markCompleted, setFailed]);

  useEffect(() => {
    if (!isOnline) {
      return;
    }

    const controller = new AbortController();

    const processQueue = async () => {
      for (const item of queue) {
        if ((item.status !== 'QUEUED' && item.status !== 'FAILED') || processingRef.current.has(item.id)) {
          continue;
        }

        processingRef.current.add(item.id);
        setQueue(current =>
          current.map(existing =>
            existing.id === item.id
              ? { ...existing, status: 'IN_PROGRESS', lastAttemptAt: new Date().toISOString(), errorMessage: null }
              : existing,
          ),
        );

        try {
          const response = await fetch(`${baseUrl}/sync/requests`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(item.authToken ? { Authorization: `Bearer ${item.authToken}` } : {}),
            },
            signal: controller.signal,
            body: JSON.stringify({
              clientRequestId: item.id,
              endpoint: item.endpoint,
              payload: item.payload,
              metadata: {
                ...item.metadata,
                createdAt: item.createdAt,
                lastAttemptAt: item.lastAttemptAt,
              },
            }),
          });

          if (!response.ok && response.status !== 409) {
            throw new Error(`Error ${response.status}`);
          }

          if (response.status === 409) {
            markCompleted(item.id);
          }
        } catch (error) {
          console.warn('Error al sincronizar solicitud offline', error);
          setFailed(item.id, error instanceof Error ? error.message : 'Error al sincronizar');
        }
      }
    };

    processQueue();

    return () => {
      controller.abort();
    };
  }, [baseUrl, isOnline, markCompleted, queue, setFailed]);

  const value = useMemo<SyncContextValue>(
    () => ({
      queue,
      isOnline,
      enqueue,
      markCompleted,
      setFailed,
    }),
    [enqueue, isOnline, markCompleted, queue, setFailed],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSyncContext(): SyncContextValue {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSyncContext debe utilizarse dentro de un SyncProvider');
  }
  return context;
}
