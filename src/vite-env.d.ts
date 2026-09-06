/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

// 构建期由 vite define 注入（vite.config.ts，源头 = package.json version）
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_TTS_URL?: string;
  readonly VITE_AUDIO_CDN?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
