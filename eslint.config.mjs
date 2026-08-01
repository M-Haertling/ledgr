import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", {
        // Server actions bound with `.bind(null, id)` still receive FormData as
        // their last argument even when they don't read it; `_name` marks that
        // as deliberate rather than an oversight.
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
        // `const { credit, debit, ...rest } = mapping` is how this codebase drops
        // keys from an object; the named siblings are omissions, not dead code.
        ignoreRestSiblings: true,
      }],
    },
  },
]);

export default eslintConfig;
