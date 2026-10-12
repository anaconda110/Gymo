// ESLint flat config。目标：抓真实问题（未使用变量、误用、可访问性），
// 不做风格检查（格式交给编辑器/人工约定，避免大范围无意义 diff）。
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/', 'coverage/', '*.config.ts', 'src/vite-env.d.ts'] },
  {
    // 构建脚本是纯 Node 环境（process/console/Buffer）
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: { ...globals.node } }
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...svelte.configs['flat/recommended'],
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser }
    }
  },
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser }
    }
  },
  {
    rules: {
      // 备份翻译层对 Dexie 行做逐字段搬运，any 是刻意的（行结构由外部文件决定）
      '@typescript-eslint/no-explicit-any': 'off',
      // void _oid 这类"显式丢弃解构字段"的惯用法不应报错
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' }
      ],
      // Svelte 模板事件常绑定无参函数引用
      '@typescript-eslint/no-empty-function': 'off'
    }
  }
);
