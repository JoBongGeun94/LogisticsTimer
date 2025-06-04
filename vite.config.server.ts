import { defineConfig } from "vite";
import path from "path";
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, "server/index.ts"),
      name: "server",
      fileName: "index",
      formats: ["es"]
    },
    outDir: "dist",
    rollupOptions: {
      external: [
        'express',
        '@neondatabase/serverless',
        'drizzle-orm',
        'passport',
        'express-session',
        'connect-pg-simple',
        'openid-client',
        'jsonwebtoken',
        'ws',
        'memoizee'
      ]
    },
    target: "node18",
    ssr: true
  },
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
});