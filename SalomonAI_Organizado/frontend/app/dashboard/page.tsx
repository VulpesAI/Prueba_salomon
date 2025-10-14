import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const { data: txs } = await supabase
    .from("transactions")
    .select("id,amount,category,date")
    .order("date", { ascending: false })
    .limit(5);

  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <pre className="text-xs">{JSON.stringify(txs ?? [], null, 2)}</pre>
    </main>
  );
}
