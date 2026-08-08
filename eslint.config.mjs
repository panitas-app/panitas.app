import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import reactHooks from "eslint-plugin-react-hooks";

// ============================================================================
// Configuración ESLint — Panitas 2.0 (CODE FREEZE)
// ----------------------------------------------------------------------------
// Decisiones (ver docs/CODE_FREEZE_REPORT.md):
//  - Se ignoran directorios NO fuente: `.backup_scanner` (copias de respaldo),
//    `public` (assets estáticos, incluye bundles minificados de terceros) y
//    `dev-server.log`.
//  - `scripts/**` son utilidades de dev en CommonJS: `require()` es intencional.
//  - `@typescript-eslint/no-explicit-any` => warn: deuda histórica del codebase
//    (256 usos). Migración gradual a tipos fuertes, fuera del alcance del freeze.
//  - Reglas `react-hooks/*` del compilador React (nuevas en eslint-config-next
//    16) => warn: son patrones pre-existentes en ~55 componentes legacy. Se
//    documentan como deuda para refactor por componente en una fase posterior.
// ============================================================================

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },
  {
    files: ["scripts/**/*.{js,mjs,cjs}"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".backup_scanner/**",
    "public/**",
    "dev-server.log",
  ]),
]);

export default eslintConfig;
