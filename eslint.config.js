/*
Lint rules for md-press. Starts from ESLint's recommended set, runs Node
globals for the command line and tests, and browser globals for the checklist
script that ships inside every page. Arguments and variables that start with
an underscore are allowed to be unused, which is how this codebase marks
intentionally ignored values.
*/

const javascript = require("@eslint/js");
const globals = require("globals");

module.exports = [
  javascript.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: globals.node,
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
      "prefer-const": "error",
      "no-var": "error",
      eqeqeq: ["error", "always"],
    },
  },
  {
    files: ["src/template/checklist.js"],
    languageOptions: {
      sourceType: "script",
      globals: { ...globals.browser, storageKey: "readonly" },
    },
  },
];
