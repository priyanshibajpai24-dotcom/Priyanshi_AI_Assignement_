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
      "evidence/**",
      "node_modules/**",
      ".env*",
      "dist/**",
      "build/**",
      "coverage/**",
    ],
  },
  {
    ...js.configs.recommended,
    files: ["src/**/*.mjs", "tests/**/*.mjs", "harness/**/*.mjs", "scripts/**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: nodeGlobals,
    },
  },
];
