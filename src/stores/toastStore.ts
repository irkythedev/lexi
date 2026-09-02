// Toast store — lightweight global toast notifications (no new deps).
// Usage: useToastStore.getState().show('已保存', 'success') or the useToast() hook.
import { create } from 'zustand';

export type ToastType = 'success' | 'info' | 'error';

export interface ToastItem {
  id: number;
  msg: string;
  type: ToastType;
  icon?: 'sun' | 'moon' | 'check' | 'info' | 'alert';
}

let seq = 0;
const DURATION = 2600;

interface ToastState {
  toasts: ToastItem[];
  show: (msg: string, type?: ToastType, icon?: ToastItem['icon']) => void;
  dismiss: (id: number) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (msg, type = 'info', icon) => {
    const id = ++seq;
    // 同类型 toast 替换：切主题/字号/语速连续滑动时只留最新一条，避免叠罗汉
    set((s) => ({ toasts: [...s.toasts.filter((t) => t.type !== type), { id, msg, type, icon }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, DURATION);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function useToast() {
  return useToastStore((s) => s.show);
}
