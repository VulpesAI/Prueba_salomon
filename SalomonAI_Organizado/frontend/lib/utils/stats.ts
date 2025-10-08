export function statsOf(values: number[]) {
  if (values.length === 0) {
    return { min: Number.NaN, max: Number.NaN, avg: Number.NaN };
  }

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let sum = 0;

  for (const value of values) {
    if (value < min) {
      min = value;
    }
    if (value > max) {
      max = value;
    }
    sum += value;
  }

  return { min, max, avg: sum / values.length };
}
