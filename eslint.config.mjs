import js from '@eslint/js';
import globals from 'globals';

const sharedRules = {
  ...js.configs.recommended.rules,
  'no-undef': 'off',
  'no-unused-vars': ['warn', {
    argsIgnorePattern: '^_',
    varsIgnorePattern: '^_'
  }],
  'no-empty': 'warn'
};

export default [
  {
    ignores: ['node_modules/**']
  },
  {
    files: ['**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node
      }
    },
    rules: {
      ...sharedRules
    }
  },
  {
    files: ['service-worker.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        ...globals.serviceworker
      }
    },
    rules: {
      ...sharedRules
    }
  },
  {
    files: ['**/*.js'],
    ignores: ['tests/**/*.js', 'service-worker.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        ...globals.browser
      }
    },
    rules: {
      ...sharedRules
    }
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node
      }
    },
    rules: {
      ...sharedRules
    }
  }
];
