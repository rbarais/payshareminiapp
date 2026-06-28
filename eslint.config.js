import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';
import configPrettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'supabase/**', '*.config.js', '*.config.ts'],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],

  // Vue single-file components are parsed by vue-eslint-parser, with the
  // TypeScript parser handling the script blocks.
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },

  // Browser code (front-end).
  {
    files: ['src/**/*.{ts,vue}'],
    languageOptions: {
      globals: globals.browser,
    },
  },

  // Server code (Node.js).
  {
    files: ['server/**/*.ts', 'api/**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },

  // Project-wide rules.
  {
    files: ['**/*.{ts,vue}'],
    rules: {
      // Ban single-letter identifiers (loop counters, callback params, etc.).
      'id-length': ['error', { min: 2, properties: 'never', exceptions: ['_'] }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },

  // Tests may use shorter throwaway names.
  {
    files: ['**/*.test.ts', '**/__tests__/**'],
    rules: {
      'id-length': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  configPrettier,
);
