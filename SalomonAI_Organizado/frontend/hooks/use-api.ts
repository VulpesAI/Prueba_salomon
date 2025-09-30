"use client"

import {
  keepPreviousData as keepPreviousDataPlaceholder,
  type QueryFunctionContext,
  type QueryKey,
  useMutation,
  type UseMutationOptions,
  type UseMutationResult,
  useQuery,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query"
import type { AxiosInstance } from "axios"

import { api } from "@/lib/api-client"

type ApiQueryFn<TQueryFnData, TQueryKey extends QueryKey> = (
  client: AxiosInstance,
  context: QueryFunctionContext<TQueryKey>
) => Promise<TQueryFnData>

type UseApiQueryOptions<
  TQueryFnData,
  TError,
  TData,
  TQueryKey extends QueryKey,
> = Omit<UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, "queryFn"> & {
  queryFn: ApiQueryFn<TQueryFnData, TQueryKey>
  keepPreviousData?: boolean
}

type UseApiQueryResult<TData, TError> = UseQueryResult<TData, TError>

type ApiMutationFn<TData, TVariables> = (
  client: AxiosInstance,
  variables: TVariables
) => Promise<TData>

type UseApiMutationOptions<TData, TError, TVariables, TContext> = Omit<
  UseMutationOptions<TData, TError, TVariables, TContext>,
  "mutationFn"
> & {
  mutationFn: ApiMutationFn<TData, TVariables>
}

type UseApiMutationResult<TData, TError, TVariables, TContext> = UseMutationResult<
  TData,
  TError,
  TVariables,
  TContext
>

export function useApiQuery<
  TQueryFnData,
  TError = unknown,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(options: UseApiQueryOptions<TQueryFnData, TError, TData, TQueryKey>) {
  const { queryFn, keepPreviousData, placeholderData, ...rest } = options

  const resolvedPlaceholderData =
    keepPreviousData && placeholderData === undefined
      ? keepPreviousDataPlaceholder
      : placeholderData

  return useQuery({
    ...rest,
    placeholderData: resolvedPlaceholderData,
    queryFn: (context) => queryFn(api, context),
  }) satisfies UseApiQueryResult<TData, TError>
}

export function useApiMutation<
  TData,
  TError = unknown,
  TVariables = void,
  TContext = unknown,
>(options: UseApiMutationOptions<TData, TError, TVariables, TContext>) {
  const { mutationFn, ...rest } = options

  return useMutation({
    ...rest,
    mutationFn: (variables) => mutationFn(api, variables),
  }) satisfies UseApiMutationResult<TData, TError, TVariables, TContext>
}
