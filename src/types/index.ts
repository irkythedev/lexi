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
  /** wordlist 词性绑定词义的显示串 */
  sense?: string;
  collocations: string[];
  examTips: string;
  exampleEn?: string;
  exampleCn?: string;
  /** wordlist 混排序号（单词+短语按教材词表首次出现顺序统一编号） */
  seq?: number;
  /** 仅要求会读、听得懂（词表 * 号） */
  receptive?: boolean;
  /** 词表首次出现页码 */
  page?: number;
}

export interface Phrase {
  id: string;
  phrase: string;
  meaning: string;
  /** wordlist 词性绑定词义的显示串 */
  sense?: string;
  fixedPatterns: string;
  exampleEn: string;
  exampleCn: string;
  /** wordlist 混排序号 */
  seq?: number;
  /** 仅要求会读、听得懂（词表 * 号） */
  receptive?: boolean;
  /** 词表首次出现页码 */
  page?: number;
}

export interface SentencePattern {
  id: string;
  pattern: string;
  grammarPoint: string;
  drillTemplate: string;
  /** 教材真实例句（Grammar 段摘出） */
  exampleEn?: string;
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
  /** wordlist 词性绑定词义的显示串（vocab/phrase 用） */
  sense?: string;
  collocations?: string[];
  fixedPatterns?: string;
  exampleEn?: string;
  exampleCn?: string;
  examTips?: string;
  grammarPoint?: string;
  drillTemplate?: string;
  /** wordlist 混排序号（句式无） */
  seq?: number;
  /** 仅要求会读（词表 * 号） */
  receptive?: boolean;
  /** 词表首次出现页码 */
  page?: number;
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
  models?: string[];
}

export interface CorrectionResult {
  isCorrect: boolean;
  originalSentence: string;
  correctedSentence: string;
  grammarBreakdown: string;
  examCollocationScore: number;
}

// ExamPointResult/ExamQuestion 已删（prompt-v2）：examPointPrompt 从未接线，与 Sprint Quiz 功能重叠；需要时从 git 历史找回。

// ── i18n ──
export type Locale = 'zh' | 'en';
