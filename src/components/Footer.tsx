// Footer — Lexi 页脚：品牌 + 版本、作者、作品集、仓库链接、许可
// 参考 stem_digt_labs Footer 架构，适配 Lexi token 体系 + i18n
import { useState } from 'react';
import { Library, Mail } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore.ts';
import { t } from '../lib/i18n.ts';
import { FOOTER } from '../lib/footer.ts';
import InstallAppButton from './InstallAppButton.tsx';

function GiteeIcon({ size = 14, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M11.984 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.016 0zm6.09 5.333c.328 0 .593.266.592.593v1.482a.594.594 0 0 1-.593.592H9.777c-.982 0-1.778.796-1.778 1.778v5.63c0 .982.796 1.778 1.778 1.778h6.015c.982 0 1.778-.796 1.778-1.778v-2.37a.594.594 0 0 1 .593-.593h1.482a.594.594 0 0 1 .593.593v2.37c0 2.29-1.856 4.148-4.148 4.148H9.777c-2.29 0-4.148-1.857-4.148-4.148v-5.63c0-2.29 1.857-4.148 4.148-4.148h8.297z" />
    </svg>
  );
}

function GithubIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.27-.01-1.16-.02-2.1-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.72-1.54-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.18a10.9 10.9 0 0 1 5.74 0c2.19-1.49 3.15-1.18 3.15-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.83 1.18 3.09 0 4.41-2.69 5.38-5.25 5.67.41.35.77 1.05.77 2.12 0 1.53-.01 2.76-.01 3.14 0 .31.21.67.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}

export default function Footer() {
  const locale = useAppStore((s) => s.locale);
  const [showWorks, setShowWorks] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const authorName = locale === 'en' ? 'Ricky' : 'Ricky';

  return (
    <footer className="mt-8 w-full border-t border-[var(--color-hairline)] px-[var(--pad-x)] py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-[var(--max-grid)] flex-col items-center gap-3 text-center text-[calc(11px*var(--type-scale))] leading-relaxed text-[var(--color-text-3)]">
        {/* 作者 + 作品集 */}
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
          <a href={FOOTER.authorLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-[var(--color-text)] transition-colors">
            <img src={FOOTER.authorIcon} alt="" width="14" height="14" className="flex-shrink-0" />
            <span className="font-semibold text-[var(--color-text)]">{t('footerAuthor', locale, { name: authorName })}</span>
          </a>
          <span className="hidden sm:inline text-[var(--color-text-4)]">·</span>
          <span className="hidden sm:inline">{t('footerRole', locale)}</span>
          <a href={`mailto:${FOOTER.email}`} aria-label={t('footerContact', locale)} className="inline-flex items-center text-[var(--color-text-3)] hover:text-[var(--color-text)] transition-colors"><Mail size={14} /></a>
          {/* 其他作品：icon + 数字角标，点击展开 */}
          <span className="relative inline-flex items-center">
            <button type="button" onClick={() => setShowWorks((v) => !v)} aria-expanded={showWorks} aria-label={t('footerMoreWorks', locale)}
              className="inline-flex items-center text-[var(--color-text-3)] hover:text-[var(--color-text)] transition-colors">
              <span className="relative inline-flex items-center">
                <Library size={14} />
                <span className="absolute -right-2 -top-1.5 flex h-[0.85rem] min-w-[0.85rem] items-center justify-center rounded-[0.25rem] px-0.5 text-[calc(8px*var(--type-scale))] font-bold leading-none text-white" style={{ background: 'var(--color-accent)' }}>{FOOTER.works.length}</span>
              </span>
            </button>
            {showWorks && (
              <span className="absolute bottom-full right-0 z-30 mb-2 flex w-max max-w-[min(15rem,calc(100vw-2rem))] flex-col gap-1 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-surface)] p-1.5 shadow-[var(--shadow-overlay)]">
                {FOOTER.works.map((w) => (
                  <a key={w.url} href={w.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[calc(11px*var(--type-scale))] text-[var(--color-text-2)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)] transition-colors">
                    <img src={w.icon} alt="" width="14" height="14" className="flex-shrink-0" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                    <span className="truncate">{w.name}</span>
                  </a>
                ))}
              </span>
            )}
          </span>
        </div>

        {/* 安装引导 · 许可 · 免责声明 · 仓库 */}
        <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1">
          <InstallAppButton />
          <span className="h-3 w-px bg-[var(--color-hairline)]" aria-hidden="true" />
          <a href={FOOTER.licenseUrl} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--color-text)] transition-colors">{t('footerLicense', locale)}</a>
          <span className="h-3 w-px bg-[var(--color-hairline)]" aria-hidden="true" />
          <button type="button" onClick={() => setShowDisclaimer((v) => !v)} aria-expanded={showDisclaimer} className="underline hover:text-[var(--color-text)] transition-colors">{t('footerDisclaimerLabel', locale)}</button>
          <span className="h-3 w-px bg-[var(--color-hairline)]" aria-hidden="true" />
          <span className="inline-flex items-center gap-2">
            <a href={FOOTER.giteeUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--color-text-3)] transition-colors hover:text-[#C71D23]" title={t('footerGitee', locale)}>
              <GiteeIcon size={14} />
            </a>
            <a href={FOOTER.githubUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--color-text-3)] transition-colors hover:text-[var(--color-text)]" title={t('footerGithub', locale)}>
              <GithubIcon size={14} />
            </a>
          </span>
        </div>
        {showDisclaimer && <span className="max-w-xs text-[var(--color-text-3)]">{t('footerDisclaimer', locale)}</span>}
        <span className="text-[var(--color-text-3)]">{t('footerAppDesc', locale)}</span>
      </div>
    </footer>
  );
}
