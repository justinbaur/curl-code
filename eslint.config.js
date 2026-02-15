import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        project: './tsconfig.json'
      }
    },
    plugins: {
      '@typescript-eslint': tseslint
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      'no-console': 'off'
    }
  },
  {
    // Special rules for test files to allow Chai assertions
    files: ['src/test/**/*.test.ts'],
    languageOptions: {
      parser: tsparser,
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        project: './tsconfig.test.json'
      }
    },
    plugins: {
      '@typescript-eslint': tseslint
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-expressions': 'off', // Allow Chai assertions
      '@typescript-eslint/no-unused-vars': 'off', // Allow setup variables in tests
      '@typescript-eslint/no-explicit-any': 'off', // Allow any in test mocks
      '@typescript-eslint/no-non-null-assertion': 'off', // Allow ! in tests where we know values exist
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      'no-console': 'off'
    }
  },
  {
    ignores: ['out/', 'dist/', '**/*.d.ts', 'webview-ui/']
  }
];
