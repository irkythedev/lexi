// Central TypeScript types for the app (strict mode).

// ── Knowledge item kinds (education semantics) ──
export type Kind = 'vocab' | 'phrase' | 'pattern' | 'inflection' | 'miniwrite';

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

// 原书 Notes（注释与解析）条目
export interface Note {
  /** 原书条目序号（单元内） */
  n: number;
  /** 英文原句（标题行） */
  quote: string;
  /** 页码引用，如 "p.9, lines 23–24" */
  ref: string;
  /** 中文翻译 */
  zh: string;
  /** 讲解段落（原文顺序） */
  expl: string[];
  /** 首现页码 */
  page: number;
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
  /** 原书 Notes（注释与解析），按条目序号排列 */
  notes: Note[];
  /** 本单元主题微写作（30 词短输出）：依据课文的具体问题 + 单元 useful 表达 */
  miniPrompt?: MiniPrompt;
  /** 词形变换挖空题（时态/单复数/形副，单句） */
  inflectionDrills?: InflectionDrill[];
}

export interface MiniPrompt {
  id: string;
  /** 英文题干（含约 30 词约束由 UI 模板统一呈现） */
  question: string;
  /** 中文题意 */
  cn: string;
  /** 单元 Useful expressions 中挑出的高级表达 3-5 条 */
  useful: string[];
}

export interface InflectionDrill {
  id: string;
  /** 完整原句（含目标变形词） */
  sentence: string;
  /** 括号提示的原形 */
  base: string;
  /** 变形答案（精确匹配，大小写容错） */
  answer: string;
  /** 考点标签：tense 动词时态 | plural 名词单复数 | conversion 形副转换 | irregular 不规则变形 */
  tag: 'tense' | 'plural' | 'conversion' | 'irregular';
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
