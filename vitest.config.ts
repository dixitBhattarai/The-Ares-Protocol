import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      exclude: ['**/.worktrees/**', '**/node_modules/**', '**/dist/**'],
    },
  })
);
