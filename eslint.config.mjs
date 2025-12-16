import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts"],
  },
  {
    files: ["src/components/tambo/**/*.{ts,tsx}"],
    // Template components intentionally use patterns that trigger React Compiler lint rules.
    // Keep these disables scoped to the template directory so new app code still benefits.
    rules: {
      // Disable overly strict React Compiler rules for template components.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/error-boundaries": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/purity": "off",
      "react-hooks/immutability": "off",
    },
  },
  {
    files: ["src/app/interactables/**/*.{ts,tsx}"],
    // Demo code synchronizes local state from props in effects.
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: ["src/lib/thread-hooks.ts"],
    // `useMergedRef` mutates `ref.current` by design.
    rules: {
      "react-hooks/immutability": "off",
    },
  },
];

export default eslintConfig;
