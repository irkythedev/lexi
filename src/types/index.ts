// Central TypeScript types for the app (strict mode).

// ── Knowledge item kinds (education semantics) ──
export type Kind = 'vocab' | 'phrase' | 'pattern';

// ── Core data schema (spec §2, verbatim fields) ──
export interface Vocabulary {
  id: string;
  word: string;
  phonetic: string;
  pos: string;
  meaning: string;
  collocations: string[];
  examTips: string;
}

export interface Phrase {
  id: string;
  phrase: string;
  meaning: string;
  fixedPatterns: string;
  exampleEn: string;
  exampleCn: string;
}

export interface SentencePattern {
  id: string;
  pattern: string;
  grammarPoint: string;
  drillTemplate: string;
}

// A single unit of a textbook.
export interface Unit {
  editionId: string;
  editionName: string;
  grade: number;
  volume: number;
  unit: number;
  title: string;
  vocabularies: Vocabulary[];
  phrases: Phrase[];
  sentencePatterns: SentencePattern[];
}

// An edition bundle (groups units + catalog metadata).
export interface Edition {
  editionId: string;
  editionName: string;
  publisher: string;
  stage: '初中' | '高中';
  region: string;
  grades: { grade: number; volumes: { volume: number; title: string }[] }[];
  units: Unit[];
}

// ── Flattened study item (vocab/phrase/pattern merged with kind) ──
export interface StudyItem {
  id: string;
  kind: Kind;
  // display label
  label: string;
  phonetic?: string;
  pos?: string;
  meaning: string;
  collocations?: string[];
  fixedPatterns?: string;
  exampleEn?: string;
  exampleCn?: string;
  examTips?: string;
  grammarPoint?: string;
  drillTemplate?: string;
}

// ── SRS ──
export interface SrsState {
  easeFactor: number;
  interval: number; // days
  repetitions: number;
  dueDate: number; // ms timestamp
  lastReviewed: number;
}

export interface ProgressRecord {
  key: string; // `${editionId}:${itemId}`
  editionId: string;
  itemId: string;
  kind: Kind;
  srs: SrsState;
  updatedAt: number;
}

export type ErrorReason = 'quiz' | 'cloze' | 'connector' | 'shadowing' | 'manual';

export interface ErrorRecord {
  id?: number;
  key: string;
  editionId: string;
  itemId: string;
  kind: Kind;
  prompt: string;
  answer: string;
  reason: string;
  createdAt: number;
  resolved: 0 | 1;
}

// ── AI ──
export type AiProviderId = 'deepseek' | 'qwen' | 'kimi' | 'zhipu' | 'doubao' | 'custom';

export interface AiConfig {
  provider: AiProviderId;
  baseUrl: string;
  key: string;
  model: string;
  agreed: boolean;
}

export interface CorrectionResult {
  isCorrect: boolean;
  originalSentence: string;
  correctedSentence: string;
  grammarBreakdown: string;
  examCollocationScore: number;
}

export interface ExamQuestion {
  stem: string;
  options: [string, string, string, string];
  answer: number;
  explanation: string;
}

export interface ExamPointResult {
  questions: ExamQuestion[];
}

// ── i18n ──
export type Locale = 'zh' | 'en';
