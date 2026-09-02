// WordHighlight — 把一段英文文本中的目标词/短语高亮包裹（accent 色 + 加粗 + 下划线）。
// 整词边界匹配（大小写不敏感），不用 dangerouslySetInnerHTML，纯 React 节点分段。
// 用法：<WordHighlight text="He is energetic in class." word="energetic" />
import React from 'react';

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default function WordHighlight({ text, word, color = 'var(--color-accent)', className = '' }: {
  text: string;
  word: string;
  color?: string;
  className?: string;
}): React.ReactNode {
  if (!text || !word) return text;
  const esc = escapeRegExp(word.trim());
  if (!esc || esc.length < 2) return text;
  const re = new RegExp(`(?<![A-Za-z])${esc}(?![A-Za-z])`, 'gi');
  const parts = text.split(re);
  if (parts.length === 1) return text; // 未命中：原样返回
  const matches = text.match(re) ?? [];
  return (
    <React.Fragment>
      {parts.flatMap((p, i) =>
        i < matches.length
          ? [p, <mark key={i} className={`rounded-[3px] px-0.5 font-bold ${className}`} style={{ color, backgroundColor: color + '33', textDecoration: 'underline', textUnderlineOffset: '2px' }}>{matches[i]}</mark>]
          : [p]
      )}
    </React.Fragment>
  );
}
