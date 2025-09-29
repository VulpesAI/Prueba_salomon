"use client"

import {
  keepPreviousData,
  useQuery,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query"
import type { AxiosInstance } from "axios"

import { apiClient, emitApiMetric } from "@/lib/api-client"

type UseApiQueryOptions<TData, TError, TQueryKey extends QueryKey> = {
  queryKey: TQueryKey
  queryFn: (client: AxiosInstance) => Promise<TData>
  keepPreviousData?: boolean
} & Omit<
  UseQueryOptions<TData, TError, TData, TQueryKey>,
  "queryKey" | "queryFn" | "placeholderData"
>

export const useApiQuery = <
  TData,
  TError = unknown,
  TQueryKey extends QueryKey = QueryKey,
>({
  queryKey,
  queryFn,
  keepPreviousData: shouldKeepPreviousData,
  ...rest
}: UseApiQueryOptions<TData, TError, TQueryKey>): UseQueryResult<
  TData,
  TError
> => {
  return useQuery({
    queryKey,
    queryFn: async () => {
      try {
        return await queryFn(apiClient)
      } catch (error) {
        emitApiMetric("api.query.error", {
          queryKey,
          message: error instanceof Error ? error.message : "unknown",
        })
        throw error
      }
    },
    placeholderData: shouldKeepPreviousData ? keepPreviousData : undefined,
    ...rest,
  })
}
