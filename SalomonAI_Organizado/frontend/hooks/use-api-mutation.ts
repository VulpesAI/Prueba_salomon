"use client"

import { useMutation, type UseMutationOptions } from "@tanstack/react-query"
import type { AxiosInstance } from "axios"

import { apiClient } from "@/lib/api-client"

type ApiMutationOptions<TData, TError, TVariables, TContext> = Omit<
  UseMutationOptions<TData, TError, TVariables, TContext>,
  "mutationFn"
> & {
  mutationFn: (client: AxiosInstance, variables: TVariables) => Promise<TData>
}

export function useApiMutation<TData, TError = unknown, TVariables = void, TContext = unknown>({
  mutationFn,
  ...options
}: ApiMutationOptions<TData, TError, TVariables, TContext>) {
  return useMutation({
    ...options,
    mutationFn: (variables) => mutationFn(apiClient, variables),
  })
}
