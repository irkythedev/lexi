// InstallAppButton — PWA 安装引导入口（参考 stem_digt_labs）
// 环境检测：已安装 → 隐藏；有原生安装事件 → 直接调起；WebView/iOS/桌面 → 引导文案
import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore.ts';
import { t } from '../lib/i18n.ts';
import { detectPwaEnv } from '../lib/pwa-env.ts';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallAppButton() {
  const locale = useAppStore((s) => s.locale);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => { e.preventDefault(); setDeferredPrompt(e as BeforeInstallPromptEvent); };
    const onInstalled = () => setDeferredPrompt(null);
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const env = detectPwaEnv();
  if (env.isStandalone) return null; // 已安装：不显示
  const hasNative = !!deferredPrompt;
  const hasPath = hasNative || env.isWebView || env.isIOS || env.isAndroid || env.isDesktop;
  if (!hasPath) return null;

  const handle = async () => {
    if (hasNative) {
      await deferredPrompt!.prompt();
      const { outcome } = await deferredPrompt!.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    } else {
      setShowHint(true); // 非原生环境：提示用浏览器菜单添加到主屏幕/安装
    }
  };

  return (
    <>
      <button type="button" onClick={() => void handle()} className="inline-flex items-center gap-1 underline hover:text-[var(--color-text)] transition-colors">
        <Download size={11} /> {t('installApp', locale)}
      </button>
      {showHint && (
        <div className="max-w-xs rounded-lg border border-[var(--color-hairline)] bg-[var(--color-surface)] p-2.5 text-left shadow-[var(--shadow-overlay)]" role="status">
          <p className="text-[calc(12px*var(--type-scale))] leading-relaxed text-[var(--color-text-2)]">
            {env.isIOS ? t('installIosHint', locale) : env.isWebView ? t('installWebviewHint', locale) : t('installMenuHint', locale)}
          </p>
          <button onClick={() => setShowHint(false)} className="press mt-1.5 text-[calc(12px*var(--type-scale))] text-[var(--color-accent)]">{t('close', locale)}</button>
        </div>
      )}
    </>
  );
}
