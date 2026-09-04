import type { Edition, Unit, StudyItem } from '../../types/index.ts';
import yilinG9a from './yilin_g9a.ts';

// Bundled offline editions (instant preview, no network).
export const BUNDLED_EDITIONS: Edition[] = [yilinG9a];

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

// StudyItem 的 wordlist 视图排序键（教材词表混排序号；句式无序号排在最后）
export function flattenUnit(unit: Unit): StudyItem[] {
  const items: StudyItem[] = [];
  for (const v of unit.vocabularies) {
    items.push({ id: v.id, kind: 'vocab', label: v.word, phonetic: v.phonetic, pos: v.pos, meaning: v.meaning, sense: v.sense, collocations: v.collocations, examTips: v.examTips, exampleEn: v.exampleEn, exampleCn: v.exampleCn, seq: v.seq, receptive: v.receptive, page: v.page });
  }
  for (const p of unit.phrases) {
    items.push({ id: p.id, kind: 'phrase', label: p.phrase, meaning: p.meaning, sense: p.sense, fixedPatterns: p.fixedPatterns, exampleEn: p.exampleEn, exampleCn: p.exampleCn, seq: p.seq, receptive: p.receptive, page: p.page });
  }
  // wordlist 视图 = seq 升序（教材词表混排原序），无 seq 的条目（句式）稳定追加在后
  const rank = (i: StudyItem) => (typeof i.seq === 'number' ? i.seq : Number.MAX_SAFE_INTEGER);
  items.sort((a, b) => rank(a) - rank(b));
  for (const s of unit.sentencePatterns) {
    items.push({ id: s.id, kind: 'pattern', label: s.pattern, meaning: s.grammarPoint, grammarPoint: s.grammarPoint, drillTemplate: s.drillTemplate, exampleEn: s.exampleEn });
  }
  return items;
}

// Dynamic fetch capability (spec §4.1): load external edition JSON.
export async function fetchEdition(url: string): Promise<Edition> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as Edition;
}
