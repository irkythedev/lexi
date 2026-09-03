/**
 * 版本检测 hook：对比远端 version.json 与本版本号，有新版本时置 hasUpdate。
 * GlassNav 顶栏共用；fetch 失败（离线/网络异常）静默忽略，不打扰用户。
 * 参考 stem_digt_labs 同款逻辑精简。
 */
import { useEffect, useState } from 'react';
import { APP_VERSION } from './changelog.ts';

export function useVersionCheck(): { hasUpdate: boolean } {
  const [hasUpdate, setHasUpdate] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/version.json', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d && typeof d.version === 'string' && d.version !== APP_VERSION) {
          setHasUpdate(true);
        }
      })
      .catch(() => { /* 离线/网络异常：忽略 */ });
    return () => { cancelled = true; };
  }, []);

  return { hasUpdate };
}
