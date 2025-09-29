"use client"

import { useMutation, type UseMutationOptions, type UseMutationResult } from "@tanstack/react-query"
import type { AxiosInstance } from "axios"

import { apiClient, emitApiMetric } from "@/lib/api-client"

type UseApiMutationOptions<TData, TError, TVariables, TContext> = {
  mutationFn: (client: AxiosInstance, variables: TVariables) => Promise<TData>
} & Omit<
  UseMutationOptions<TData, TError, TVariables, TContext>,
  "mutationFn"
>

export const useApiMutation = <
  TData,
  TError = unknown,
  TVariables = void,
  TContext = unknown,
>({
  mutationFn,
  onError,
  ...rest
}: UseApiMutationOptions<TData, TError, TVariables, TContext>): UseMutationResult<
  TData,
  TError,
  TVariables,
  TContext
> => {
  return useMutation({
    mutationFn: async (variables: TVariables) =>
      mutationFn(apiClient, variables),
    onError: (error, variables, context) => {
      emitApiMetric("api.mutation.error", {
        message: error instanceof Error ? error.message : "unknown",
      })
      onError?.(error, variables, context)
    },
    ...rest,
  })
}
