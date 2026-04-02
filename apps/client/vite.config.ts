import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import pkg from './package.json';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const buildId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const reactPath = path.resolve(__dirname, 'node_modules', 'react');
  const reactDomPath = path.resolve(__dirname, 'node_modules', 'react-dom');

  return {
    plugins: [react(), tailwindcss()],
    build: {
      target: 'esnext',
      rollupOptions: {
        output: {
          // Keep content hash and add a per-build random id to force cache refresh on each release.
          entryFileNames: `assets/[name]-[hash]-${buildId}.js`,
          chunkFileNames: `assets/[name]-[hash]-${buildId}.js`,
          assetFileNames: `assets/[name]-[hash]-${buildId}[extname]`
        }
      }
    },
    resolve: {
      dedupe: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        '@tiptap/core',
        '@tiptap/react',
        '@tiptap/pm',
        '@tiptap/suggestion',
        'prosemirror-state',
        'prosemirror-view',
        'prosemirror-model',
        'prosemirror-transform',
        'prosemirror-commands',
        'prosemirror-keymap',
        'prosemirror-history',
        'prosemirror-inputrules'
      ],
      alias: {
        '@': path.resolve(__dirname, './src'),
        react: reactPath,
        'react-dom': reactDomPath
      }
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@tiptap/core',
        '@tiptap/react',
        '@tiptap/pm',
        '@tiptap/suggestion'
      ]
    },
    define: {
      VITE_APP_VERSION: JSON.stringify(pkg.version)
    },
    server: {
      proxy: {
        '/manifest.json': `http://localhost:${env.SERVER_PORT || 4991}`
      }
    }
  };
});
