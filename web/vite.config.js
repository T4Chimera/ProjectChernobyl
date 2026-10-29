import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 700,
    // Keep the rendering engine cacheable across frequent art/gameplay updates.
    rolldownOptions: { output: { codeSplitting: { groups: [
      { name: 'three', test: /node_modules\/three\// },
    ] } } },
  },
});
