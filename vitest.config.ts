import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  } as any,
  test: {
    environment: 'node',
    globals: true,
  },
});
