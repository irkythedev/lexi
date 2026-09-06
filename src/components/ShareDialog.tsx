// ShareDialog — 分享组件：二维码（qrcode.react）+ Web Share API + 复制链接
import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Share2, Copy, Check } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore.ts';
import { t } from '../lib/i18n.ts';

interface ShareDialogProps {
  url: string;
  onClose: () => void;
  title?: string;
  text?: string;
}

export default function ShareDialog({ url, onClose, title, text }: ShareDialogProps) {
  const locale = useAppStore((s) => s.locale);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const shareTitle = title || 'Lexi · 英语听说词汇';
  const shareText = text || t('shareText', locale);

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url });
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }
    await handleCopy();
  };

  const handleCopy = async () => {
    setCopyFailed(false);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        setCopyFailed(true);
        setTimeout(() => setCopyFailed(false), 3000);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[1px] p-4" onClick={onClose}>
      <div className="relative w-full max-w-xs rounded-xl border-2 border-[var(--color-hairline)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-overlay)]" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={t('share', locale)}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="flex items-center gap-2 text-[calc(14px*var(--type-scale))] font-bold text-[var(--color-text)]"><Share2 size={16} style={{ color: 'var(--color-accent)' }} /> {t('share', locale)}</h2>
          <button type="button" onClick={onClose} aria-label={t('close', locale)} className="press -m-1 flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-3)] hover:bg-[var(--color-surface-2)]"><X size={16} /></button>
        </div>

        {/* 二维码 */}
        <div className="flex flex-col items-center gap-2">
          <div className="rounded-xl bg-white p-2 shadow-[var(--shadow-card)]">
            <QRCodeSVG value={url} size={160} level="M" marginSize={2} />
          </div>
          <p className="text-[calc(11px*var(--type-scale))] text-[var(--color-text-3)] text-center">{t('shareQrHint', locale)}</p>
        </div>

        {/* 按钮 */}
        <div className="mt-3 flex flex-col gap-2">
          {'share' in navigator && (
            <button type="button" onClick={handleNativeShare} className="press flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-accent)] border-2 border-[var(--color-hairline)] px-4 py-2.5 text-[calc(15px*var(--type-scale))] font-semibold text-white">
              <Share2 size={16} /> {t('share', locale)}
            </button>
          )}
          <button type="button" onClick={handleCopy} className="press flex items-center justify-center gap-2 rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] px-4 py-2.5 text-[calc(15px*var(--type-scale))] text-[var(--color-text-2)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]">
            {copied ? <Check size={16} style={{ color: 'var(--color-vocab)' }} /> : <Copy size={16} />}
            {copied ? t('copied', locale) : t('copyLink', locale)}
          </button>
          {copyFailed && <p className="text-center text-[calc(11px*var(--type-scale))] text-[var(--color-trap)]">{t('copyFailed', locale)}</p>}
        </div>
      </div>
    </div>
  );
}