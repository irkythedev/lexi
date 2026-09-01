import { create } from 'zustand';
import type { Unit, StudyItem, Locale } from '../types/index.ts';
import { findUnit, flattenUnit } from '../data/textbooks/index.ts';
import { loadConfig } from '../lib/ai.ts';
import { getSetting, setSetting } from '../db/db.ts';

export type Tab = 'learn' | 'practice' | 'review' | 'errors' | 'ai' | 'settings';
export type Accent = 'emerald' | 'berry' | 'indigo' | 'coral';

const ACCENTS: Accent[] = ['emerald', 'berry', 'indigo', 'coral'];
export const ACCENT_META: Record<Accent, { name: string }> = {
  emerald: { name: '清新翡翠' },
  berry: { name: '莓果玫红' },
  indigo: { name: '沉稳学院蓝' },
  coral: { name: '活力珊瑚' },
};

interface AppState {
  theme: 'light' | 'dark';
  accent: Accent;
  locale: Locale;
  tab: Tab;
  selection: { editionId: string; grade: number; volume: number; unit: number } | null;
  unit: Unit | null;
  studyItems: StudyItem[];
  aiReady: boolean;
  tts: { accent: 'us' | 'uk'; rate: number };

  setTab: (t: Tab) => void;
  selectUnit: (sel: { editionId: string; grade: number; volume: number; unit: number }) => void;
  refreshAiStatus: () => void;
  toggleTheme: () => void;
  setAccent: (a: Accent) => void;
  setLocale: (l: Locale) => void;
  setTts: (pref: Partial<{ accent: 'us' | 'uk'; rate: number }>) => void;
}

function recompute(selection: AppState['selection']) {
  const unit = selection ? findUnit(selection) : null;
  const studyItems = unit ? flattenUnit(unit) : [];
  return { unit, studyItems };
}

export const useAppStore = create<AppState>((set, get) => ({
  theme: 'light',
  accent: 'emerald',
  locale: 'zh',
  tab: 'learn',
  selection: null,
  unit: null,
  studyItems: [],
  aiReady: !!loadConfig(),
  tts: { accent: 'us', rate: 1.0 },

  setTab: (t) => set({ tab: t }),

  selectUnit: (sel) => {
    const { unit, studyItems } = recompute(sel);
    set({ selection: sel, unit, studyItems });
    void setSetting('selection', sel);
  },

  refreshAiStatus: () => set({ aiReady: !!loadConfig() }),

  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    setSetting('theme', next);
    set({ theme: next });
  },

  setAccent: (a) => {
    if (!ACCENTS.includes(a)) return;
    setSetting('accent', a);
    set({ accent: a });
  },

  setLocale: (l) => {
    setSetting('locale', l);
    set({ locale: l });
  },

  setTts: (pref) => {
    const next = { ...get().tts, ...pref };
    setSetting('tts', next);
    set({ tts: next });
  },
}));

// Initialize persisted settings (async) once at startup.
export async function hydrateSettings() {
  const [theme, accent, locale, tts, selection] = await Promise.all([
    getSetting<'light' | 'dark'>('theme', 'light'),
    getSetting<Accent>('accent', 'emerald'),
    getSetting<Locale>('locale', 'zh'),
    getSetting<{ accent: 'us' | 'uk'; rate: number }>('tts', { accent: 'us', rate: 1.0 }),
    getSetting<AppState['selection']>('selection', null),
  ]);
  const { unit, studyItems } = selection ? recompute(selection) : { unit: null, studyItems: [] };
  useAppStore.setState({ theme, accent, locale, tts, selection, unit, studyItems });
}

// Sync accent to <html data-accent> so CSS theme variants apply.
export function applyAccent(accent: Accent) {
  const v = ACCENTS.includes(accent) ? accent : 'emerald';
  document.documentElement.dataset.accent = v;
}
