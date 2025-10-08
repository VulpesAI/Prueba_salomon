import { formatDateTime } from '@/lib/utils/date';
import { ForecastResponse } from '@/types/forecasts';

export default function LegendNote({ data }: { data: ForecastResponse }) {
  return (
    <div className="text-xs text-muted-foreground">
      Modelo: <span className="font-medium text-foreground">{data.model_type}</span> · Calculado:{' '}
      <span className="font-medium text-foreground">{formatDateTime(data.calculated_at)}</span>
    </div>
  );
}
