import {
  BrainCircuit,
  Lightbulb,
  PiggyBank,
  Sparkles,
  TrendingUp,
  UtensilsCrossed,
  Wallet2,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { InsightRecommendation } from "@/lib/insights/types";

const ICON_MAP = {
  sparkles: Sparkles,
  growth: TrendingUp,
  piggy: PiggyBank,
  wallet: Wallet2,
  brain: BrainCircuit,
  light: Lightbulb,
  dining: UtensilsCrossed,
} as const;

const DEFAULT_ICON = Sparkles;

type RecommendationsProps = {
  data: InsightRecommendation[];
  voice?: string;
};

export function Recommendations({ data, voice }: RecommendationsProps) {
  if (!data.length) {
    return null;
  }

  const voiceId = voice ? `insights-voice-${voice}` : undefined;
  const voiceLabel = voice ? `Narración configurada con la voz ${voice}.` : null;

  return (
    <Card className="rounded-2xl border border-border/60 bg-card shadow-sm" aria-labelledby="recommendations-heading">
      <CardHeader>
        <CardTitle id="recommendations-heading">Recomendaciones de IA</CardTitle>
        <CardDescription>
          Consejos personalizados generados por Salomón AI para equilibrar tus finanzas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4" aria-describedby={voiceId}>
        {data.map((item) => {
          const Icon = item.icon ? ICON_MAP[item.icon as keyof typeof ICON_MAP] ?? DEFAULT_ICON : DEFAULT_ICON;
          return (
            <div
              key={item.title}
              className="rounded-2xl border border-border/50 bg-background/60 p-4"
              role="article"
            >
              <div className="flex items-start gap-3">
                <span className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                </div>
              </div>
            </div>
          );
        })}
        {voice && (
          <p id={voiceId} className="text-xs text-muted-foreground">
            {voiceLabel}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
