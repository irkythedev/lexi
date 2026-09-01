// Footer — Lexi 页脚：作者、版本、作品集、仓库链接、许可
// 参考 stem_digt_labs Footer 架构，适配 Lexi token 体系
import { useState } from 'react';
import { Library, Mail, ExternalLink } from 'lucide-react';
import { FOOTER } from '../lib/footer.ts';

export default function Footer() {
  const [showWorks, setShowWorks] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  return (
    <footer className="mt-8 w-full border-t border-[var(--color-hairline)] px-[var(--pad-x)] py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-[var(--max-grid)] flex-col items-center gap-3 text-center text-[11px] leading-relaxed text-[var(--color-text-3)]">
        {/* 作者 + 作品集 */}
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
          <a href={FOOTER.authorLink} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--color-text)] transition-colors">
            <span className="font-semibold text-[var(--color-text)]">{FOOTER.author}</span>
          </a>
          <span>·</span>
          <span>{FOOTER.authorRole}</span>
          <a href={`mailto:${FOOTER.email}`} aria-label="联系作者" className="inline-flex items-center text-[var(--color-text-3)] hover:text-[var(--color-text)] transition-colors"><Mail size={12} /></a>
          {/* 其他作品：icon + 数字角标，点击展开 */}
          <span className="relative">
            <button type="button" onClick={() => setShowWorks((v) => !v)} aria-expanded={showWorks} aria-label={FOOTER.moreWorksLabel}
              className="inline-flex items-center text-[var(--color-text-3)] hover:text-[var(--color-text)] transition-colors p-1 -m-1">
              <span className="relative inline-flex">
                <Library size={14} />
                <span className="absolute -right-2 -top-1.5 flex h-[0.85rem] min-w-[0.85rem] items-center justify-center rounded-[0.25rem] px-0.5 text-[8px] font-bold leading-none text-white" style={{ background: 'var(--color-accent)' }}>{FOOTER.works.length}</span>
              </span>
            </button>
            {showWorks && (
              <span className="absolute bottom-full right-0 z-30 mb-2 flex w-max max-w-[min(15rem,calc(100vw-2rem))] flex-col gap-1 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-surface)] p-1.5 shadow-[var(--shadow-overlay)]">
                {FOOTER.works.map((w) => (
                  <a key={w.url} href={w.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] text-[var(--color-text-2)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)] transition-colors">
                    <img src={w.icon} alt="" width="14" height="14" className="flex-shrink-0" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                    <span className="truncate">{w.name}</span>
                  </a>
                ))}
              </span>
            )}
          </span>
        </div>

        {/* 版本 + 仓库链接 */}
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <span>Lexi v{FOOTER.version}</span>
          <span className="text-[var(--color-text-4)]">·</span>
          <span className="inline-flex items-center gap-2">
            <a href={FOOTER.giteeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 hover:text-[var(--color-text)] transition-colors">Gitee <ExternalLink size={10} /></a>
            <a href={FOOTER.githubUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 hover:text-[var(--color-text)] transition-colors">GitHub <ExternalLink size={10} /></a>
          </span>
          <span className="text-[var(--color-text-4)]">·</span>
          <a href={FOOTER.licenseUrl} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--color-text)] transition-colors">{FOOTER.licenseLabel}</a>
          <span className="text-[var(--color-text-4)]">·</span>
          <a href={FOOTER.homepage} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--color-text)] transition-colors">lexi.irky.dev</a>
        </div>

        {/* 免责声明 */}
        <button type="button" onClick={() => setShowDisclaimer((v) => !v)} aria-expanded={showDisclaimer} className="underline hover:text-[var(--color-text)] transition-colors">{FOOTER.disclaimerLabel}</button>
        {showDisclaimer && <span className="max-w-xs text-[var(--color-text-3)]">{FOOTER.disclaimer}</span>}
        <span className="text-[var(--color-text-3)]">{FOOTER.appDesc}</span>
      </div>
    </footer>
  );
}
