import axios, { type AxiosInstance } from "axios"

import { ENV } from "@/config/env"

const api: AxiosInstance = axios.create({
  baseURL: ENV.NEXT_PUBLIC_API_URL || undefined,
  withCredentials: true,
})

export { api }
