export default function PrivacyCard() {
  return (
    <div className="space-y-2 rounded-xl border p-4">
      <h3 className="text-base font-semibold">Privacidad</h3>
      <p className="text-sm text-muted-foreground">
        Tus datos financieros se procesan según nuestros principios de minimización, cifrado en tránsito y en reposo.
      </p>
      <a className="text-sm underline" href="/legal/privacidad">
        Leer la política de privacidad
      </a>
    </div>
  );
}
