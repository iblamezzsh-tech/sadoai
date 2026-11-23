import nextPlugin from '@next/eslint-plugin-next'
import tsParser from '@typescript-eslint/parser'
import reactHooks from 'eslint-plugin-react-hooks'

export default [
  { ignores: ['.next/**', 'test-results/**', 'playwright-report/**', 'public/vision/**', 'next-env.d.ts'] },
  { plugins: { '@next/next': nextPlugin }, rules: nextPlugin.configs['core-web-vitals'].rules },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { parser: tsParser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
]
