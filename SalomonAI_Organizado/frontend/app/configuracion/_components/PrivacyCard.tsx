export default function PrivacyCard() {
  return (
    <div className="space-y-2 rounded-card border border-soft bg-gradient-card p-4">
      <h3 className="text-base font-semibold text-primary">Privacidad</h3>
      <p className="text-sm text-muted">
        Tus datos financieros se procesan según nuestros principios de minimización, cifrado en tránsito y en reposo.
      </p>
      <a className="text-sm text-primary underline hover:text-[color:var(--brand)]" href="/legal/privacidad">
        Leer la política de privacidad
      </a>
    </div>
  );
}
