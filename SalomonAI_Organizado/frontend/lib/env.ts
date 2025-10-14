export const ENV = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  // Sólo servidor:
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  SB_PUBLISHABLE_KEY: process.env.SB_PUBLISHABLE_KEY ?? "",
  SB_SECRET_KEY: process.env.SB_SECRET_KEY ?? "",
};
