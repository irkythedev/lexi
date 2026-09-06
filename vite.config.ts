import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
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

/**
 * 构建时生成 dist/audio-manifest.json：扫描 public/audio/<book>/ 下的音频文件，
 * 前端据此判断内置教材原声可用性（音频本体不进 SW precache 与 git）。
 */
function audioManifest(): Plugin {
  return {
    name: 'write-audio-manifest',
    closeBundle() {
      const base = path.resolve(__dirname, 'public/audio');
      const manifest: Record<string, Record<string, string>> = {};
      try {
        for (const book of readdirSync(base)) {
          const bookDir = path.join(base, book);
          if (!statSync(bookDir).isDirectory()) continue;
          const entries: Record<string, string> = {};
          for (const f of readdirSync(bookDir)) {
            const m = /^u(\d+)_reading\.(mp3|m4a)$/.exec(f);
            if (m) entries[m[1]] = `/audio/${book}/${f}`;
          }
          if (Object.keys(entries).length) manifest[book] = entries;
        }
      } catch { /* 无音频目录 → 空 manifest，原声入口自动隐藏 */ }
      writeFileSync(
        path.resolve(__dirname, 'dist/audio-manifest.json'),
        JSON.stringify(manifest),
      );
    },
  };
}

// Vite + React 18 + Tailwind v4 + PWA.
const pkg = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));

export default defineConfig({
  define: {
    // 单一版本源 = package.json；运行时代码经 APP_VERSION 读取，不再手工同步。
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    tailwindcss(),
    versionJson(),
    audioManifest(),
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
