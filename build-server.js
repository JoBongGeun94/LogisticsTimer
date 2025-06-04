import { build } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function buildServer() {
  await build({
    build: {
      ssr: true,
      outDir: 'dist',
      rollupOptions: {
        input: path.resolve(__dirname, 'server/index.ts'),
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
      }
    },
    resolve: {
      alias: {
        '@shared': path.resolve(__dirname, 'shared'),
      },
    },
  });
}

buildServer().catch(console.error);