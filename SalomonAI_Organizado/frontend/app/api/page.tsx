export default function ApiIndexPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold text-foreground">API base</h1>
        <p className="mt-2 text-sm">
          Define tus endpoints creando archivos <code>route.ts</code> dentro de segmentos en <code>app/api</code>.
        </p>
      </div>
    </div>
  );
}
