import js from "@eslint/js";

const nodeGlobals = Object.fromEntries(
  [
    "AbortController",
    "AbortSignal",
    "Buffer",
    "clearTimeout",
    "console",
    "fetch",
    "performance",
    "process",
    "setTimeout",
    "structuredClone",
    "URL",
  ].map((name) => [name, "readonly"]),
);

export default [
  {
    ignores: [
      ".agents/**",
      ".pnpm-store/**",
      ".specify/**",
      ".tools/**",
      "data/**",
      "evidence/**",
      "node_modules/**",
      "specs/**",
    ],
  },
  {
    ...js.configs.recommended,
    files: ["src/**/*.mjs", "tests/**/*.mjs", "harness/**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: nodeGlobals,
    },
  },
];
