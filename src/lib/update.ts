/**
 * 一键刷新到最新版：SW autoUpdate 模式下，主动 update() → 等待新 SW 接管
 * （controllerchange）→ reload 一次到位。慢网 20s 兜底强刷。
 * 参考 stem_digt_labs Header.handleRefresh 精简。
 */
export function refreshToLatest(): void {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    let reloaded = false;
    const onceReload = () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onceReload, { once: true });
    navigator.serviceWorker
      .getRegistration()
      .then((reg) => {
        if (!reg) { onceReload(); return; }
        if (!reg.waiting && !reg.installing) {
          reg.update().catch(() => onceReload());
        }
        // waiting / installing 已存在：autoUpdate 的 SW 自带 skipWaiting，
        // install 完成后自动 activate → controllerchange 驱动刷新
      })
      .catch(() => onceReload());
    setTimeout(onceReload, 20000);
  } else {
    window.location.reload();
  }
}
