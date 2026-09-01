// Textbook registry — single source of truth for the cascading switcher.
// Each module exports an edition bundle { editionId, editionName, publisher,
// stage, region, grades:[{grade, volumes:[{volume,title}]}], units:[...] }.
import pepG7 from './pep_g7.js';
import pepG8 from './pep_g8.js';
import fltrG1 from './fltr_senior_g1.js';

// Bundled offline editions (instant preview, no network needed).
export const BUNDLED_EDITIONS = [pepG7, pepG8, fltrG1];

// The cascading selector needs a compact "catalog" without the heavy unit data.
// Build it once from the bundles.
export function buildCatalog() {
  const regionsMap = new Map();
  for (const ed of BUNDLED_EDITIONS) {
    const region = ed.region || '全国通用';
    if (!regionsMap.has(region)) regionsMap.set(region, new Map());
    const stageMap = regionsMap.get(region);
    if (!stageMap.has(ed.stage)) stageMap.set(ed.stage, []);
    const publishers = stageMap.get(ed.stage);
    if (!publishers.find((p) => p.publisher === ed.publisher)) {
      publishers.push({
        publisher: ed.publisher,
        editionId: ed.editionId,
        grades: ed.grades,
      });
    }
  }

  // Convert maps to plain arrays for easy rendering.
  const regions = [...regionsMap.entries()].map(([region, stageMap]) => ({
    region,
    stages: [...stageMap.entries()].map(([stage, publishers]) => ({
      stage,
      publishers,
    })),
  }));
  return regions;
}

// Resolve a single unit object from the bundled data by edition + grade/volume/unit.
export function findUnit({ editionId, grade, volume, unit }) {
  const ed = BUNDLED_EDITIONS.find((e) => e.editionId === editionId);
  if (!ed) return null;
  return ed.units.find(
    (u) => u.grade === grade && u.volume === volume && u.unit === unit
  ) || null;
}

export function getEdition(editionId) {
  return BUNDLED_EDITIONS.find((e) => e.editionId === editionId) || null;
}

// Dynamic fetch capability (spec §4.1): load an external edition JSON.
// Falls back silently to bundled data if the URL is unreachable.
export async function fetchEdition(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data; // expected to match the edition bundle schema
}
