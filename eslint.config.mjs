import { fileURLToPath } from 'url';
import { dirname } from 'path';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
  // ── Global ignores ────────────────────────────────────────────────────────
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },

  // ── Base TypeScript recommended rules ─────────────────────────────────────
  ...tseslint.configs.recommendedTypeChecked,

  // ── TypeScript parser options ─────────────────────────────────────────────
  {
    languageOptions: {
      parserOptions: {
        // tsconfig.test.json extends tsconfig.json and adds tests/**/*
        project: './tsconfig.test.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // ── Project-specific rule overrides ───────────────────────────────────────
  {
    rules: {
      // Enforce explicit return types on exported functions
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        { allowExpressions: true, allowTypedFunctionExpressions: true },
      ],

      // Enforce explicit accessibility on class members
      '@typescript-eslint/explicit-module-boundary-types': 'error',

      // Disallow any
      '@typescript-eslint/no-explicit-any': 'error',

      // Require awaiting promises
      '@typescript-eslint/no-floating-promises': 'error',

      // Disallow unused variables (with exceptions for _ prefix)
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // Prefer nullish coalescing over ||
      '@typescript-eslint/prefer-nullish-coalescing': 'error',

      // Prefer optional chaining
      '@typescript-eslint/prefer-optional-chain': 'error',

      // No non-null assertions — use proper type guards
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // Enforce consistent type imports
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],

      // Standard JS rules
      'no-console': 'off', // CLI tool — console is intentional
      'eqeqeq': ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-template': 'error',
      'object-shorthand': 'error',
      'no-duplicate-imports': 'error',
    },
  },

  // ── Test-file rule overrides ──────────────────────────────────────────────
  // Relax strict rules that are unnecessary in test files
  {
    files: ['tests/**/*.ts'],
    rules: {
      // Test callbacks are implicitly typed by Jest — no need for explicit returns
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      // Casting in tests is common for verifying wrong input shapes
      '@typescript-eslint/no-explicit-any': 'off',
      // Non-null assertions are acceptable in test assertions
      '@typescript-eslint/no-non-null-assertion': 'off',
      // Unbound methods are fine when used inside expect() matchers
      '@typescript-eslint/unbound-method': 'off',
      // Jest tasks/callbacks are often written as async () => {} for uniformity
      '@typescript-eslint/require-await': 'off',
    },
  },

  // ── Prettier must be last — disables all formatting rules ─────────────────
  prettierConfig,
);
