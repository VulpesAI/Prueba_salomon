import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const COLOR_CLASS_PATTERN = "(?:bg|text|border)-(?:slate|gray|zinc|neutral)-\\d{2,3}";
const HEX_PATTERN = "#[0-9A-Fa-f]{3,8}";
const DIRECT_COLOR_PATTERN = "(?:rgb|rgba)\\(|hsl\\((?!var\\()";
const COLOR_REGEX = `${COLOR_CLASS_PATTERN}|${HEX_PATTERN}|${DIRECT_COLOR_PATTERN}`;

const postLoginColorGuard = {
  files: [
    "app/(authenticated)/dashboard/**/*.{ts,tsx}",
    "app/dashboard/**/*.{ts,tsx}",
    "components/assistant/**/*.{ts,tsx}",
    "components/charts/**/*.{ts,tsx}",
    "components/dashboard/**/*.{ts,tsx}",
    "lib/ui/**/*.{ts,tsx}",
  ],
  rules: {
    "no-restricted-syntax": [
      "error",
      {
        selector: `Literal[value=/${COLOR_REGEX}/i]`,
        message: "Usa tokens semánticos app.* o variables CSS en lugar de colores hardcodeados.",
      },
      {
        selector: `TemplateElement[value.raw=/${COLOR_REGEX}/i]`,
        message: "Usa tokens semánticos app.* o variables CSS en lugar de colores hardcodeados.",
      },
    ],
  },
};

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  postLoginColorGuard,
];

export default eslintConfig;
