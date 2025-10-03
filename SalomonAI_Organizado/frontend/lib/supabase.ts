import { createClient } from "@supabase/supabase-js"

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://yyfyhjxjofgrfywawlme.supabase.co"
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5Znloanhqb2ZncmZ5d2F3bG1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNTUyNjcsImV4cCI6MjA3NDkzMTI2N30.Pw_AxMp8YOYXhHOUJlRN_wTmRjHSh6Tfa22BsIJwTj0"

if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is not defined")
}

if (!supabaseAnonKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
