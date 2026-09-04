import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 构建结束钩子：在 dist/ 生成 version.json（版本号 + 构建时间戳）。
 * 前端用它对比本地版本号，检测到新版本时在顶栏显示更新提示。
 * 该文件刻意排除出 SW precache，确保每次请求都是最新值。
 */
function versionJson(): Plugin {
  return {
    name: 'write-version-json',
    closeBundle() {
      const pkg = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));
      const out = path.resolve(__dirname, 'dist/version.json');
      writeFileSync(out, JSON.stringify({ version: pkg.version, builtAt: Date.now() }, null, 2));
    },
  };
}

// Vite + React 18 + Tailwind v4 + PWA.
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    versionJson(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable-192.png', 'icon-maskable-512.png', 'brand.png'],
      manifest: {
        name: 'Lexi · 英语听说词汇',
        short_name: 'Lexi',
        description: '围绕江苏译林教材的英语单词、短语、句式听说学习工具。纯前端、本地优先、无需登录。',
        theme_color: '#2F6F5E',
        background_color: '#F3EBE0',
        display: 'standalone',
        start_url: '/',
        lang: 'zh-CN',
        scope: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        globIgnores: ['**/version.json'],
        navigateFallback: '/index.html',
      },
    }),
  ],
  server: { host: true, port: 5173 },
});
