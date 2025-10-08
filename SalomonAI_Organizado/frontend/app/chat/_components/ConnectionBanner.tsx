export default function ConnectionBanner({ lost }: { lost: boolean }) {
  if (!lost) {
    return null;
  }
  return (
    <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
      Conexión perdida… reintentando
    </div>
  );
}
