// Lexi 版本历史（面向用户的更新记录，非技术性）。
// 语言贴近使用者而非开发者；技术细节与管理规范不在此展示。
// APP_VERSION 单一来源 = package.json（vite.config.ts define 注入），升版本只改 package.json 一处。

export const APP_VERSION = __APP_VERSION__;

export interface ChangelogEntry {
  version: string;
  date: string;
  zh: string[];
  en: string[];
}

/** 新版本记录在前。 */
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.6.1',
    date: '2026-09',
    zh: [
      '[修复] 音标在部分安卓设备上显示为方块的问题',
      '[修复] 课文原声朗读入口在部分情况下未显示的问题',
    ],
    en: [
      '[Fixed] Phonetic symbols rendering as boxes on some Android devices',
      '[Fixed] Original textbook audio toggle not showing in some cases',
    ],
  },
  {
    version: '0.6.0',
    date: '2026-09',
    zh: [
      '[新增] 9A 新增词形变换与微写作练习',
      '[新增] 支持导入自己的词表，生成口语导读单，闪卡 / 拼写 / 填空反复开口练',
      '[新增] 学习页新增教材 Notes（注释与解析）分类，可直接筛选查看',
      '[新增] 「AI 问答历史」：生成过的 AI 学习卡随时回看、一键清除',
      '[新增] 朗读音频整体优化：体积更小、播放更顺、等待更短',
      '[新增] 品牌图标与全局字体焕新',
      '[优化] 弹窗在手机端统一居中显示',
      '[优化] 学习页入口与筛选布局调整，窄屏不再换行错位',
      '[优化] 更新提示显示当前版本号；英文界面文案补齐',
    ],
    en: [
      '[New] Word-form and mini-writing practice added for 9A',
      '[New] Import your own word lists into speaking guides and drill with flashcards, spelling and cloze',
      '[New] Textbook notes (commentary & analysis) added as a category on the learning page',
      '[New] AI Q&A history: revisit AI study cards you generated anytime, clearable in one tap',
      '[New] Read-aloud audio upgraded: smaller, smoother, less waiting',
      '[New] Brand icon and typeface refreshed',
      '[Improved] Dialogs now centered on mobile',
      '[Improved] Learning page entry and filter layout tweaks; no wrapping on narrow screens',
      '[Improved] The update notice shows the current version; English UI copy completed',
    ],
  },
  {
    version: '0.5.0',
    date: '2026-09',
    zh: [
      '[新增] 词表按教材书后词表原序排列：单词与短语按书本顺序混排，与课本对照更方便',
      '[新增] 词表行升级：词性直接标注在释义前，可标记重点词（星标），显示课本页码',
      '[新增] 学习页筛选栏显示各分类数量，一眼看清单元词量构成',
    ],
    en: [
      '[New] Word lists now follow the textbook glossary order: words and phrases mixed in book order, easier to cross-check with the book',
      '[New] Upgraded word list rows: part of speech shown before the meaning, star-marking for key words, and textbook page numbers',
      '[New] Learning page filter chips now show per-category counts',
    ],
  },
  {
    version: '0.4.0',
    date: '2026-09',
    zh: [
      '[新增] AI 学习卡讲义本：生成过的学习卡片自动保存，可随时回看、一键清除',
      '[新增] AI 追问链：卡片中的关键词可继续追问，逐层深入，回看任何一层无需重复请求',
      '[新增] AI 用量统计：按天累计 AI 消耗，明细可见，随时清零',
      '[新增] 课文朗读新增教材原声：官方录音逐句串流播放，可与合成朗读一键切换',
      '[新增] 学习页一键切换单元：无需返回教材页，当前教材全部单元直接选',
      '[新增] 顶栏新增分享按钮，应用可分享给同学',
      '[新增] AI 面板打开即自动生成学习卡片，失败可一键重试',
      '[优化] 朗读更聪明：缩写、符号（/、=、& 等）按语义朗读，音标不再被误读',
      '[优化] 原声音频内置应用，播放更稳定；合成朗读等待过久有明确提示',
      '[优化] 全面屏适配（刘海屏/手势条区域），安装体验对齐 iOS、安卓标准',
      '[优化] 朗读默认音色改为英式男声；教材名简化',
      '[修复] 修复 AI 报错被误报为「解析失败」，长报错不再撑破面板',
      '[修复] 修复多处图标语义、按钮行为与全面屏显示问题',
    ],
    en: [
      '[New] AI study-card booklet: generated study cards are saved automatically for later review, clearable anytime',
      '[New] AI follow-up chain: keep asking about key phrases card by card, revisit any level without repeating requests',
      '[New] AI usage statistics: daily token estimates with a detailed breakdown, resettable anytime',
      '[New] Textbook original audio for text read-aloud: official recordings stream sentence by sentence, switchable with synthesized speech',
      '[New] One-tap unit switching on the learning page: pick any unit of the current textbook without going back',
      '[New] Share button in the top bar - share the app with classmates',
      '[New] AI panel generates the study card automatically on open, with one-tap retry on failure',
      '[Improved] Smarter read-aloud: abbreviations and symbols (/ = &) are spoken by meaning, phonetic symbols no longer misread',
      '[Improved] Original audio is bundled in the app for stabler playback; long synthesis waits now show a clear hint',
      '[Improved] Full-screen adaptation (notch / home-indicator areas); install experience aligned with iOS and Android standards',
      '[Improved] Default voice changed to a British male voice; textbook name simplified',
      '[Fixed] Fixed AI errors being misreported as parse failures; long error text no longer breaks the panel',
      '[Fixed] Fixed several icon semantics, button behaviors and full-screen display issues',
    ],
  },
  {
    version: '0.3.2',
    date: '2026-09',
    zh: [
      '[新增] 页脚新增反馈入口：学习中遇到问题或想提建议，可直接发送给开发者',
      '[新增] 页脚新增版权与免责声明：教材内容版权归属、AI 内容仅供参考、隐私保护说明',
      '[新增] 版本更新提示：有新版本时版本号旁亮起提示点，点击即可一键更新到最新版',
      '[新增] 句式例句补全：9 上全部 36 个句式均配有教材原句例句，AI 卡片、闪卡、跟读直接采用课文原句',
      '[优化] 暗色模式重绘为「印章浮起」风格，明暗层次与描边更清晰',
      '[优化] 全站图标统一纸面笔触：单词/短语/句式分类更直观，AI 入口统一蓝墨水标识',
      '[优化] 列表与顶栏布局紧凑化、按钮触控区域加大、短页面不再留大片空白',
      '[修复] 修复冲刺填空练习可能为句式点生成无法作答的题目',
      '[修复] 修复学习页底部词条被导航遮挡、翻页按钮与导航栏重叠',
    ],
    en: [
      '[New] Feedback entry added to the footer: report problems or suggestions straight to the developer',
      '[New] Copyright and disclaimer dialog in the footer: textbook content ownership, AI content caveat, privacy statement',
      '[New] Version update notice: a dot appears next to the version number when a new version is available; tap to refresh to the latest',
      '[New] Pattern examples completed: all 36 sentence patterns of Grade 9A now carry real textbook sentences, used by AI cards, flashcards and read-aloud',
      '[Improved] Dark mode redrawn in "ink-stamp lift" style with clearer layers and outlines',
      '[Improved] Icons unified with a paper-print stroke: clearer word/phrase/pattern categories, AI entry now uses the blue-ink mark',
      '[Improved] Lists and top bar compacted, touch targets enlarged, short pages no longer leave a big blank area',
      '[Fixed] Fixed sprint fill-in-the-blank sometimes generating unanswerable questions for sentence patterns',
      '[Fixed] Fixed bottom rows of the learning list being covered by navigation and the pager overlapping the nav bar',
    ],
  },
  {
    version: '0.3.1',
    date: '2026-09',
    zh: [
      '[新增] 朗读悬浮球改为侧边栏吸附：默认收起为小按钮，展开向左滑出面板，闲置几秒自动收回',
      '[优化] 整体视觉改版为纸面印刷风：米纸底色、墨线描边、统一卡片层级',
      '[优化] 词条卡片操作按钮（朗读/AI/展开）紧凑成组并缩小，图标列上下对齐',
      '[优化] 顶栏图标统一：L 标识放大、右侧圆钮精简',
      '[优化] 练习模式完善：例句数据补齐（课文回填）、AI 造句后可进入冲刺测',
      '[修复] 修复搭配拼图右侧出现中文释义的问题（无结构数据时显示空态而非假配对）',
    ],
    en: [
      '[New] Floating read-aloud dock attaches to the screen edge: collapses to a small button, slides out a panel, auto-hides after idle',
      '[Improved] Full visual redesign to paper-print style: warm paper background, ink outlines, unified card hierarchy',
      '[Improved] Word row action buttons (speak/AI/expand) grouped and compacted, icon column aligned',
      '[Improved] Top bar icons unified: larger L logo, slimmer round buttons',
      '[Improved] Practice modes completed: example sentences backfilled from the textbook, AI writing now flows into the quiz',
      '[Fixed] Fixed collocation puzzle showing Chinese meanings (shows empty state instead of fake pairs)',
    ],
  },
  {
    version: '0.3.0',
    date: '2026-09',
    zh: [
      '[新增] AI 学习卡片：点一下生成单词/短语的释义、用法、例句、考点四段，例句采用教材原文，目标词自动高亮',
      '[新增] 词条列表可展开查看课文原句（仅真实出现时显示），长句默认展示核心片段，可展开全文',
      '[新增] 课文朗读：8 个单元阅读文本逐句朗读、逐句高亮，点击任意句子单独播放',
      '[新增] 内置江苏译林 9 年级上册完整词表：257 单词 + 45 短语 + 36 句式',
      '[新增] 学习区嵌入 AI 辅助：预设问题按钮一键提问，无需自由输入',
      '[优化] 学习进度在页面间切换后保留（去设置再回来不丢进度）',
      '[优化] 学习页改为统一入口：选教材、看内容、开始学习集中在一页',
      '[优化] 导航响应式：手机端底部标签栏、电脑端顶部导航',
      '[修复] 修复朗读双重播放、进入学习页自动朗读、翻页重叠等多项问题',
    ],
    en: [
      '[New] AI study card: one tap generates definition, usage, example and exam tips; examples use real textbook sentences with the target word highlighted',
      '[New] Word rows expand to show the real textbook sentence (only when the word actually appears); long sentences show a focused excerpt with full-text toggle',
      '[New] Reading mode: 8 units of passages with sentence-by-sentence read-aloud and highlight, tap any sentence to play',
      '[New] Full Yilin Grade 9A vocabulary: 257 words + 45 phrases + 36 patterns with phonetics',
      '[New] AI assist embedded in learning areas with preset question buttons (no free-text chat)',
      '[Improved] Session progress survives page switches (Settings round-trip no longer loses progress)',
      '[Improved] Learn page is now the single entry: pick textbook, browse content, start session',
      '[Improved] Responsive navigation: bottom tabs on mobile, top bar on desktop',
      '[Fixed] Fixed double audio playback, auto-play on session open, pager overlap and more',
    ],
  },
  {
    version: '0.2.2',
    date: '2026-09',
    zh: [
      '[优化] 字号滑块改为 6 档位选择（0.9–1.4），档位下方文字标注，可点击选档，滑块自动吸附',
      '[优化] 语速滑块拖动时吸附到 0.1 刻度，松手提示当前语速',
      '[优化] 音色选择（女声/男声）与试听按钮并排，试听显示合成中/试听中/空闲三种状态',
      '[优化] 提示消息移至屏幕顶部，不再遮挡底部导航',
      '[修复] 修复 iOS 添加到主屏幕后页面底部留白问题',
      '[修复] 修复英文界面下「设置」标签显示异常',
    ],
    en: [
      '[Improved] Font-size slider is now a 6-tier picker (0.9–1.4) with text labels, clickable tiers and snap-to-tier dragging',
      '[Improved] Speed slider snaps to 0.1 steps and shows the current speed on release',
      '[Improved] Voice gender and preview button share one row; preview shows synthesizing/playing/idle states',
      '[Improved] Toast messages moved to the top of the screen so they no longer cover the bottom nav',
      '[Fixed] Fixed bottom whitespace when installed to the iOS home screen',
      '[Fixed] Fixed the "Settings" label showing raw key in English UI',
    ],
  },
  {
    version: '0.2.1',
    date: '2026-09',
    zh: [
      '[新增] 底部导航最右侧改为「设置」入口，AI 配置入口移至顶部（未配置时显示红点）',
      '[优化] 练习入口改为折叠式卡片，展开预览后再次点击进入对应练习',
      '[优化] 页脚细节调整：作品名称与图标、仓库链接顺序、分隔样式',
    ],
    en: [
      '[New] Settings moved to the rightmost bottom-nav tab; AI entry moved to the top bar (red dot when not configured)',
      '[Improved] Practice modes are collapsible cards: expand to preview, tap again to enter',
      '[Improved] Footer polish: work names/icons, repo link order, separator style',
    ],
  },
  {
    version: '0.2.0',
    date: '2026-09',
    zh: [
      '[新增] 品牌更名为 Lexi，内置江苏译林 8A / 9A 教材词汇数据',
      '[新增] 朗读功能：美音/英音 × 女声/男声四种组合，语速可调',
      '[新增] 学习引擎：认识 → 跟读 → 拼写 → 选择四步训练，自动记录薄弱词',
      '[新增] 暗色主题 + 四种主题色（翡翠/莓果/靛蓝/珊瑚），全局字体大小可缩放',
      '[新增] 中英文界面切换',
      '[新增] 支持导入自定义词表（TSV / JSON）',
      '[新增] 练习模式：3D 闪卡、搭配拼图、5 步微冲刺',
    ],
    en: [
      '[New] Rebranded to Lexi with built-in Yilin 8A/9A textbook vocabulary',
      '[New] Read-aloud: US/UK × female/male voice combinations with adjustable speed',
      '[New] Learning engine: Recognize → Read → Spell → Choose with weak-word tracking',
      '[New] Dark theme + four accent colors (Emerald/Berry/Indigo/Coral) and global font scaling',
      '[New] Chinese/English UI switching',
      '[New] Import your own word lists (TSV / JSON)',
      '[New] Practice modes: 3D flashcards, collocation puzzles, 5-step sprint',
    ],
  },
];
