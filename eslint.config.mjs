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
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: ["src/lib/thread-hooks.ts"],
    rules: {
      "react-hooks/immutability": "off",
    },
  },
];

export default eslintConfig;
