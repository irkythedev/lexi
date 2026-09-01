/**
 * SCF 云函数访问令牌。
 *
 * 安全背景：TTS SCF 端点 URL 公开在构建产物中，无鉴权时任意第三方可直接调用。
 * 方案：请求时把 token 拼到 URL 查询参数上；SCF 端校验该参数。
 *
 * 取值优先级：VITE_SCF_TOKEN（.env，本地可覆盖）> 内置 fallback。
 * 内置 fallback 保证公网构建（EdgeOne 从仓库构建，无 .env）也带 token。
 * 注意：token 会随构建产物公开，它的作用是「防随意脚本滥用」而非保密。
 */
const BUILTIN_TOKEN = '9980ca248b144f7982f66ea36113835a';

function readScfToken(): string {
  const env = (import.meta.env.VITE_SCF_TOKEN as string | undefined)?.trim();
  const token = env || BUILTIN_TOKEN;
  if (!token) return '';
  if (!/^[A-Za-z0-9_-]+$/.test(token)) return '';
  return token;
}

/** 生成带 token 的查询串（?token=xxx）；无有效 token 返回空串 */
export function scfTokenQuery(): string {
  const token = readScfToken();
  if (!token) return '';
  return `?token=${encodeURIComponent(token)}`;
}

/** 生成带 token 的 SCF 端点 URL。已含查询参数时用 & 拼接。 */
export function scfUrlWithToken(base: string): string {
  const q = scfTokenQuery();
  if (!q) return base;
  return base.includes('?') ? `${base}&${q.slice(1)}` : `${base}${q}`;
}