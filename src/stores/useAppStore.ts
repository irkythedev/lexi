import { create } from 'zustand';
import type { Unit, StudyItem, Locale } from '../types/index.ts';
import { findUnit, flattenUnit } from '../data/textbooks/index.ts';
import { loadConfig } from '../lib/ai.ts';
import { getSetting, setSetting } from '../db/db.ts';

export type Tab = 'learn' | 'practice' | 'review' | 'errors' | 'ai' | 'settings';

interface AppState {
  theme: 'light' | 'dark';
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
  },

  refreshAiStatus: () => set({ aiReady: !!loadConfig() }),

  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    setSetting('theme', next);
    set({ theme: next });
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
  const [theme, locale, tts] = await Promise.all([
    getSetting<'light' | 'dark'>('theme', 'light'),
    getSetting<Locale>('locale', 'zh'),
    getSetting<{ accent: 'us' | 'uk'; rate: number }>('tts', { accent: 'us', rate: 1.0 }),
  ]);
  useAppStore.setState({ theme, locale, tts });
}
