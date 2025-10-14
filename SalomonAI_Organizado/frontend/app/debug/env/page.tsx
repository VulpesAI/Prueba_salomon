export default function DebugEnv() {
  const serverSeesEnv = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  return (
    <pre className="p-6 text-sm text-slate-200 bg-slate-900 min-h-screen">
      {JSON.stringify(
        {
          serverSeesEnv,
        },
        null,
        2,
      )}
    </pre>
  )
}
