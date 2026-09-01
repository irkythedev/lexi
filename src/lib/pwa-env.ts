// PWA 安装环境检测 — 参考 stem_digt_labs 精简版
export interface PwaEnv {
  isStandalone: boolean;
  isWebView: boolean;
  isWechat: boolean;
  isIOS: boolean;
  isIOSSafari: boolean;
  isAndroid: boolean;
  isDesktop: boolean;
  isChromium: boolean;
}

function isKnownAppWebView(ua: string): boolean {
  return (
    /MicroMessenger|wxwork/i.test(ua) ||
    (/QQ\//i.test(ua) && !/MQQBrowser/i.test(ua)) ||
    /DingTalk/i.test(ua) ||
    /Feishu|Lark/i.test(ua) ||
    /aweme|Douyin/i.test(ua) ||
    /Xiaohongshu|RED\/?/i.test(ua) ||
    /Weibo/i.test(ua) ||
    /Toutiao|NewsArticle/i.test(ua) ||
    /BaiduApp|BaiduHD/i.test(ua) ||
    /FBAN|FBAV|Instagram/i.test(ua) ||
    /Line\/|Snapchat|Telegram|KakaoTalk/i.test(ua)
  );
}

export function detectPwaEnv(): PwaEnv {
  if (typeof window === 'undefined') {
    return { isStandalone: false, isWebView: false, isWechat: false, isIOS: false, isIOSSafari: false, isAndroid: false, isDesktop: true, isChromium: false };
  }
  const ua = window.navigator.userAgent;
  const mq = (q: string) => window.matchMedia(q).matches;
  const standalone =
    mq('(display-mode: standalone)') || mq('(display-mode: fullscreen)') || mq('(display-mode: minimal-ui)') ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1 && !(window as unknown as { MSStream?: boolean }).MSStream);
  const isAndroid = /Android/i.test(ua);
  const isWechat = /MicroMessenger|wxwork/i.test(ua);
  const isIOSSafari = isIOS && /Safari\//i.test(ua) && !/CriOS|FxiOS/i.test(ua);
  const isIOSWebview = isIOS && !isIOSSafari && !/CriOS|FxiOS/i.test(ua);
  const isWebView = isWechat || isKnownAppWebView(ua) || isIOSWebview || /\bwv\b/i.test(ua);
  const isChromium = /Chrome|CriOS|Edg/i.test(ua);
  return { isStandalone: standalone, isWebView, isWechat, isIOS, isIOSSafari, isAndroid, isDesktop: !isIOS && !isAndroid, isChromium };
}
