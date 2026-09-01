// Global app state via React Context. Holds:
//  - textbook selection (edition/grade/volume/unit) + current unit data
//  - theme (light/dark), persisted
//  - AI config presence (mirrors localStorage), for the header indicator
//  - TTS preferences (accent, rate)
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { BUNDLED_EDITIONS, findUnit, getEdition } from '../data/textbooks/index.js';
import { loadConfig } from '../lib/ai.js';
import { getSetting, setSetting } from '../lib/db.js';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [theme, setTheme] = useState('light');
  const [selection, setSelection] = useState(null); // {editionId, grade, volume, unit}
  const [unit, setUnit] = useState(null); // resolved unit data
  const [aiReady, setAiReady] = useState(false);
  const [tts, setTts] = useState({ accent: 'us', rate: 1.0 });

  // init theme + ai flag + tts from storage
  useEffect(() => {
    getSetting('theme', 'light').then((t) => setTheme(t));
    getSetting('tts', { accent: 'us', rate: 1.0 }).then((t) => t && setTts(t));
    setAiReady(!!loadConfig());
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      setSetting('theme', next);
      return next;
    });
  }, []);

  const setTtsPref = useCallback((pref) => {
    setTts((prev) => {
      const next = { ...prev, ...pref };
      setSetting('tts', next);
      return next;
    });
  }, []);

  const selectUnit = useCallback((sel) => {
    setSelection(sel);
    const u = findUnit(sel);
    setUnit(u || null);
  }, []);

  const refreshAiStatus = useCallback(() => setAiReady(!!loadConfig()), []);

  // Flatten the current unit's items into a single study list with kind tags.
  const studyItems = useMemo(() => {
    if (!unit) return [];
    const items = [];
    (unit.vocabularies || []).forEach((v) => items.push({ kind: 'vocab', ...v }));
    (unit.phrases || []).forEach((p) => items.push({ kind: 'phrase', ...p }));
    (unit.sentencePatterns || []).forEach((s) => items.push({ kind: 'pattern', ...s }));
    return items;
  }, [unit]);

  const value = {
    theme,
    toggleTheme,
    selection,
    unit,
    selectUnit,
    studyItems,
    editions: BUNDLED_EDITIONS,
    getEdition,
    aiReady,
    refreshAiStatus,
    tts,
    setTtsPref,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
