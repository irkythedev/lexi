// feedback — 精简版用户反馈：通过 SCF 云函数推送到钉钉群。
// 复用 stem 的 SCF 代理端点 + 同一 token 机制，只发不存本地队列。

import { scfUrlWithToken } from './scf-token.ts';

const DINGTALK_API = 'https://1307683613-c6djcnfpz2.ap-shanghai.tencentscf.com';

export type FeedbackCategory = 'bug' | 'suggestion' | 'content' | 'other';

export interface FeedbackPayload {
  title: string;
  content: string;
}

/** 提交反馈：直接 POST 到 SCF 云函数 → 钉钉群，不缓存。返回 true=推送成功 */
export async function submitFeedback(category: FeedbackCategory, message: string, locale: string): Promise<boolean> {
  const catLabel: Record<FeedbackCategory, string> = { bug: '问题', suggestion: '建议', content: '内容', other: '其他' };
  const lines = [
    `- **来源**：Lexi · 英语词汇学习`,
    `- **分类**：${catLabel[category] ?? category}`,
    `- **语言**：${locale === 'en' ? 'English' : '中文'}`,
    `- **时间**：${new Date().toLocaleString('zh-CN', { hour12: false })}`,
    '',
    message.trim().slice(0, 2000),
  ];
  try {
    const res = await fetch(scfUrlWithToken(DINGTALK_API), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Lexi · 用户反馈', content: lines.join('\n') } as FeedbackPayload),
    });
    if (!res.ok) return false;
    const json: unknown = await res.json();
    return (json as { code?: number })?.code === 0;
  } catch {
    return false;
  }
}