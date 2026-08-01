import { defineConfig } from 'vitest/config';

export default defineConfig({
  // `tsconfigPaths` is a Vitest-only resolve option that Vite's own ResolveOptions
  // type doesn't declare, hence the narrow cast rather than a blanket `any`.
  resolve: {
    tsconfigPaths: true,
  } as { tsconfigPaths: boolean },
  test: {
    environment: 'node',
    globals: true,
  },
});
