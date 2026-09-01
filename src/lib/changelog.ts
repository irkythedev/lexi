// Lexi 版本历史（面向用户的更新记录，非技术性）。
// 语言贴近使用者而非开发者；技术细节与管理规范不在此展示。
// APP_VERSION 与 package.json / footer.ts 同步维护。

export const APP_VERSION = '0.2.2';

export interface ChangelogEntry {
  version: string;
  date: string;
  zh: string[];
  en: string[];
}

/** 新版本记录在前。 */
export const CHANGELOG: ChangelogEntry[] = [
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
