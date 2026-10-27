import eslint from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import { importX } from 'eslint-plugin-import-x';
import prettierPlugin from 'eslint-plugin-prettier';
import unicorn from 'eslint-plugin-unicorn';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import { configs as tseslintConfigs } from 'typescript-eslint';

// -------------------------------------------------------------------------
// List scripts, where devDependency imports are allowed
// -------------------------------------------------------------------------
const allowDevDependencies = ['**/eslint.config*', 'src/scripts/*.ts', 'examples/**', 'test/**'];

export default defineConfig(
  // -------------------------------------------------------------------------
  // Common configuration for all files
  // -------------------------------------------------------------------------

  // Global ignores (replaces .eslintignore)
  {
    ignores: [
      'node_modules/',
      '**/node_modules/',
      'build/',
      'dist/',
      'coverage/',
      'docs/',
      'jsdoc/',
      'tmp/',
      '.idea/',
      '.vscode/',
      '**/*.js',
    ],
  },

  // -------------------------------------------------------------------------
  // Base JS recommended rules
  // -------------------------------------------------------------------------
  eslint.configs.recommended,
  {
    rules: {
      semi: ['error', 'always'],
      quotes: ['error', 'single', { avoidEscape: true }],
      'max-len': ['error', { code: 120, ignoreStrings: true, ignoreTemplateLiterals: true, ignoreComments: true }],
      'max-classes-per-file': ['error', 5],
      'no-console': 'off',
      'linebreak-style': 'off',
      'no-underscore-dangle': ['error', { allow: ['_id'] }],
      'max-nested-callbacks': ['error', 4],
      'max-params': ['error', 8],
      'max-depth': ['error', 5],
      'max-lines-per-function': ['error', 200],
      complexity: ['error', 20],
      'class-methods-use-this': 'off',
      'arrow-parens': ['error', 'always'],
      'require-await': 'error',
      'no-param-reassign': 'off',
      'no-plusplus': 'off',
      'lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],
      'no-trailing-spaces': ['error', { skipBlankLines: true, ignoreComments: true }],
      camelcase: ['error', { properties: 'never' }],
      'spaced-comment': 'error',
      'no-duplicate-imports': 'error',
      'arrow-body-style': 'off',
    },
  },

  // -------------------------------------------------------------------------
  // TypeScript strict + stylistic rules (applied to TS files)
  // -------------------------------------------------------------------------
  ...tseslintConfigs.strictTypeChecked,
  ...tseslintConfigs.stylisticTypeChecked,
  {
    rules: {
      // ── typescript-eslint ────────────────────────────────────────────────
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'no-type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-confusing-void-expression': [
        'error',
        { ignoreArrowShorthand: true, ignoreVoidOperator: true },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': ['error', { ignoreIIFE: true, ignoreVoid: true }],
      '@typescript-eslint/no-meaningless-void-operator': 'off',
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-unnecessary-type-parameters': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-use-before-define': 'error',
      // `||` fallback on empty strings/zero is usually intended (e.g. empty route -> default, perPage 0 -> 25)
      '@typescript-eslint/prefer-nullish-coalescing': ['error', { ignorePrimitives: { string: true, number: true } }],
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
    },
  },

  // -------------------------------------------------------------------------
  // Unicorn — modern JS idioms
  // -------------------------------------------------------------------------
  unicorn.configs.recommended,
  {
    rules: {
      /// ── eslint-plugin-unicorn ────────────────────────────────────────────
      // Enforce kebab-case filenames (standard Node.js convention)
      'unicorn/filename-case': ['error', { case: 'kebabCase' }],
      // Prefer for...of over forEach
      'unicorn/no-for-each': 'error',
      // Bans require(), __dirname, __filename (already ESM)
      'unicorn/prefer-module': 'error',
      // Top-level await is fine in ESM entry points
      'unicorn/prefer-top-level-await': 'error',
      // These unicorn rules conflict with our style or typescript-eslint equivalents
      'unicorn/no-null': 'off', // TypeScript APIs use null legitimately
      'unicorn/prevent-abbreviations': 'off', // Too noisy for a codebase with established names
      'unicorn/name-replacements': 'off', // Successor of prevent-abbreviations, same reasoning
      'unicorn/consistent-boolean-name': 'off', // Names mirror DTO fields from the API (e.g. caseSensitive)
      'unicorn/consistent-compound-words': 'off', // Names mirror DTO fields from the API (e.g. userName)
      'unicorn/no-asterisk-prefix-in-documentation-comments': 'off', // Keep conventional JSDoc style
      'unicorn/consistent-class-member-order': 'off', // Keep related public/private methods together
      'unicorn/no-negated-condition': 'off', // Sometimes clearer to negate a condition than to invert the whole logic
      'unicorn/no-array-reduce': 'off', // Sometimes reduce is clearer than a for loop or map+filter+etc.
      'unicorn/no-process-exit': 'off', // Legitimate in service/CLI entry points
      'unicorn/consistent-function-scoping': ['error', { checkArrowFunctions: false }], // Helpers may live next to their only caller
    },
  },

  // import-x — module graph correctness and ordering
  // Cast needed: PluginFlatConfig.languageOptions is narrower than ConfigWithExtends expects
  /** @type {any} */ (importX.flatConfigs.recommended),
  /** @type {any} */ (importX.flatConfigs.typescript),
  {
    rules: {
      // ── eslint-plugin-import-x ───────────────────────────────────────────
      'import-x/no-unresolved': 'error',
      'import-x/no-named-as-default-member': 'off',
      'import-x/prefer-default-export': 'off',
      'import-x/no-extraneous-dependencies': ['error', { devDependencies: allowDevDependencies }],
      // No duplicate import statements for the same module
      'import-x/no-duplicates': 'error',
      // Detect circular dependencies
      'import-x/no-cycle': 'error',
      // Enforce consistent import ordering
      'import-x/order': [
        'error',
        {
          groups: [
            ['builtin', 'external', 'internal'],
            ['parent', 'sibling'],
          ],
          'newlines-between': 'never',
          alphabetize: { order: 'ignore', caseInsensitive: true },
        },
      ],
    },
  },

  // Prettier integration — disables conflicting ESLint formatting rules
  // and adds prettier/prettier as an ESLint rule
  prettierConfig,
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
    },
  },

  // -------------------------------------------------------------------------
  // Common globals for all TS files (e.g. Atomics, SharedArrayBuffer)
  // -------------------------------------------------------------------------
  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
);
