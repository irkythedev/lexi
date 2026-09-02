// 分页 hook：通用列表分页，条目超限时按页切片。
// 翻页控件由调用方渲染（可复用 PaginationBar 组件）。
import { useMemo, useState } from 'react';

export function usePagination<T>(items: T[], pageSize = 20) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  // 当数据变化导致当前页越界时，回退到最后一页（不越界）。
  const safePage = Math.min(page, totalPages - 1);
  const slice = useMemo(
    () => items.slice(safePage * pageSize, (safePage + 1) * pageSize),
    [items, safePage, pageSize],
  );

  const next = () => setPage((p) => Math.min(p + 1, totalPages - 1));
  const prev = () => setPage((p) => Math.max(p - 1, 0));
  const reset = () => setPage(0);
  const goTo = (p: number) => setPage(Math.max(0, Math.min(p, totalPages - 1)));

  return { page: safePage, totalPages, slice, next, prev, reset, goTo };
}
