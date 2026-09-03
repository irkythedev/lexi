import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// Vite + React 18 + Tailwind v4 + PWA.
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png', 'brand.png'],
      manifest: {
        name: 'Lexi · 英语听说词汇',
        short_name: 'Lexi',
        description: '围绕江苏译林教材的英语单词、短语、句式听说学习工具。纯前端、本地优先、无需登录。',
        theme_color: '#2F6F5E',
        background_color: '#F3EBE0',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
      },
    }),
  ],
  server: { host: true, port: 5173 },
});
