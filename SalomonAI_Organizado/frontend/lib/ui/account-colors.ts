export const ACCOUNT_COLOR_VARS = {
  checking: "--chart-1",
  savings: "--chart-2",
  credit: "--chart-3",
  investment: "--chart-4",
} as const;

export type AccountColorKey = keyof typeof ACCOUNT_COLOR_VARS;

export function colorFromVar(cssVar: string) {
  return `hsl(var(${cssVar}))`;
}
