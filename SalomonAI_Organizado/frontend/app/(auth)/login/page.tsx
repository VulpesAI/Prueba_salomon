import { supabaseServer } from "@/lib/supabase-server";
import LoginForm from "./ui";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const supabase = supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (data.user) {
    return <meta httpEquiv="refresh" content="0; url=/dashboard" />;
  }
  return <LoginForm />;
}
