import type { Edition, Unit, StudyItem } from '../../types/index.ts';
import pepG7 from './pep_g7.ts';
import pepG8 from './pep_g8.ts';
import fltrG1 from './fltr_senior_g1.ts';
import yilinG8a from './yilin_g8a.ts';
import yilinG9a from './yilin_g9a.ts';

// Bundled offline editions (instant preview, no network).
export const BUNDLED_EDITIONS: Edition[] = [pepG7, pepG8, fltrG1, yilinG8a, yilinG9a];

export interface RegionNode { region: string; stages: StageNode[]; }
export interface StageNode { stage: string; publishers: PublisherNode[]; }
export interface PublisherNode { publisher: string; editionId: string; grades: Edition['grades']; }

// Build the cascading catalog (region → stage → publisher → grades) without heavy unit data.
export function buildCatalog(): RegionNode[] {
  const regionsMap = new Map<string, Map<string, PublisherNode[]>>();
  for (const ed of BUNDLED_EDITIONS) {
    const region = ed.region || '全国通用';
    if (!regionsMap.has(region)) regionsMap.set(region, new Map());
    const stageMap = regionsMap.get(region)!;
    if (!stageMap.has(ed.stage)) stageMap.set(ed.stage, []);
    const publishers = stageMap.get(ed.stage)!;
    if (!publishers.find((p) => p.publisher === ed.publisher)) {
      publishers.push({ publisher: ed.publisher, editionId: ed.editionId, grades: ed.grades });
    }
  }
  return [...regionsMap.entries()].map(([region, stageMap]) => ({
    region,
    stages: [...stageMap.entries()].map(([stage, publishers]) => ({ stage, publishers })),
  }));
}

export function getEdition(editionId: string): Edition | null {
  return BUNDLED_EDITIONS.find((e) => e.editionId === editionId) ?? null;
}

export function findUnit(sel: { editionId: string; grade: number; volume: number; unit: number }): Unit | null {
  const ed = getEdition(sel.editionId);
  if (!ed) return null;
  return ed.units.find((u) => u.grade === sel.grade && u.volume === sel.volume && u.unit === sel.unit) ?? null;
}

// Flatten a unit into a single study list tagged by kind (spec §4).
export function flattenUnit(unit: Unit): StudyItem[] {
  const items: StudyItem[] = [];
  for (const v of unit.vocabularies) {
    items.push({ id: v.id, kind: 'vocab', label: v.word, phonetic: v.phonetic, pos: v.pos, meaning: v.meaning, collocations: v.collocations, examTips: v.examTips });
  }
  for (const p of unit.phrases) {
    items.push({ id: p.id, kind: 'phrase', label: p.phrase, meaning: p.meaning, fixedPatterns: p.fixedPatterns, exampleEn: p.exampleEn, exampleCn: p.exampleCn });
  }
  for (const s of unit.sentencePatterns) {
    items.push({ id: s.id, kind: 'pattern', label: s.pattern, meaning: s.grammarPoint, grammarPoint: s.grammarPoint, drillTemplate: s.drillTemplate });
  }
  return items;
}

// Dynamic fetch capability (spec §4.1): load external edition JSON.
export async function fetchEdition(url: string): Promise<Edition> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as Edition;
}
