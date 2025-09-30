"use client"

import { keepPreviousData, useQuery, type QueryKey, type UseQueryOptions } from "@tanstack/react-query"
import type { AxiosInstance } from "axios"

import { apiClient } from "@/lib/api-client"

type ApiQueryOptions<TQueryFnData, TError, TData, TQueryKey extends QueryKey> = Omit<
  UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
  "queryFn"
> & {
  queryFn: (client: AxiosInstance) => Promise<TQueryFnData>
  keepPreviousData?: boolean
}

export function useApiQuery<
  TQueryFnData,
  TError = unknown,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>({ queryFn, keepPreviousData: shouldKeepPreviousData, ...options }: ApiQueryOptions<TQueryFnData, TError, TData, TQueryKey>) {
  return useQuery({
    ...options,
    placeholderData:
      shouldKeepPreviousData && options.placeholderData === undefined
        ? keepPreviousData
        : options.placeholderData,
    queryFn: () => queryFn(apiClient),
  })
}
