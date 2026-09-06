<div align="center">

# Lexi · 英语听说词汇

![version](https://img.shields.io/badge/版本-v0.6.2-blue)
![react](https://img.shields.io/badge/React-18-61dafb) ![vite](https://img.shields.io/badge/Vite-5-646cff) ![tailwind](https://img.shields.io/badge/Tailwind-4-38bdf8) ![typescript](https://img.shields.io/badge/TypeScript-5.5-3178c6) ![zustand](https://img.shields.io/badge/Zustand-5-764abc) ![dexie](https://img.shields.io/badge/Dexie-4-00b894)

<p>围绕江苏译林教材（九年级上册）的英语单词、短语、句式听说学习工具。<br/>本地运行 · 无需登录 · 中英双语 · 深浅主题 · 离线可用 · 在线访问：<a href="https://lexi.irky.dev">https://lexi.irky.dev</a></p>

<table align="center">
  <thead>
    <tr><th align="center">在线访问 &nbsp;·&nbsp; Visit</th></tr>
  </thead>
  <tbody>
    <tr>
      <td align="center"><img src="public/qr-lexi.png" width="120" alt="扫码访问" title="手机扫码访问" /><br/>手机扫码访问</td>
    </tr>
  </tbody>
</table>

</div>

---

**[中文](#中文说明) · [English](#english)**

## 中文说明

- [简介](#简介)
- [功能清单](#功能清单)
- [运行架构](#运行架构)
- [快速开始](#快速开始)
- [使用流程](#使用流程)
- [项目结构](#项目结构)
- [许可](#许可)
- [免责条款](#免责条款)
- [版权声明](#版权声明)

### 简介

Lexi 是一个**无需登录**的英语听说学习工具，围绕江苏译林九年级上册教材，覆盖 **261 个单词、45 个短语、36 个句式**与 8 个单元的课文朗读，用「认识 → 跟读 → 拼写 → 选择」四步训练帮助巩固。数据完全保存在本机浏览器，无需注册账号。

- 🌐 中英双语，右上角一键切换
- 🌗 深浅主题 + 四种主题色（翡翠 / 莓果 / 靛蓝 / 珊瑚），字体大小可缩放
- 📱 响应式：手机 / 平板 / PC
- 🔊 朗读：美音 / 英音 × 女声 / 男声四种组合，语速可调；音标在所有设备上正确显示（内置 IPA 字体）
- 📚 内置译林九年级上册词汇与课文数据；支持导入自己的词表，生成**口语导读单**练开口
- 📖 课文朗读：逐句合成朗读 + 教材原声整篇播放，双模式切换
- 🧩 练习模式：3D 闪卡（翻转评分）、搭配拼图（结构配对）、5 步微冲刺（输入→跟读→练习→AI 输出→冲刺测）、词形变换、微写作
- 🤖 AI 学习助手（BYOK）：智能造句批改、考点出题、情境对话；配置您自己的 AI 服务商 API Key 即可使用，Key 仅存本机、对话直连服务商、本站不记录；生成过的 AI 学习卡可在「AI 问答历史」随时回看
- 📦 可安装为应用离线使用（PWA）

### 功能清单

| 模块 | 内容 |
|---|---|
| 学习 | 按单元浏览词汇 / 短语 / Notes（注释与解析），朗读发音，隐藏中文自测 |
| 练习 | 3D 闪卡 · 搭配拼图 · 5 步微冲刺 · 词形变换 · 微写作 |
| 复习 | SRS 待复习队列，快速回顾 |
| 错题 | 错题本 + AI 问答历史（生成的 AI 学习卡随时回看、一键清除） |
| 课文朗读 | 逐句合成朗读（含朗读球跟读）与教材原声整篇播放，双模式切换 |
| 导读单 | 导入自己的单词 / 短语 / 句式，生成口语导读单，闪卡 / 拼写 / 填空反复开口练 |
| AI | 智能造句批改 · 考点出题 · 情境对话（BYOK） |
| 设置 | 朗读偏好（口音 / 音色 / 语速）、主题色、字体大小 |

### 运行架构

本项目为**纯前端 SPA**（React 18 + react-router + Tailwind 4），**无自建后端与数据库**，发布为静态站点托管（EdgeOne Pages，连接仓库自动构建）。

- **静态托管平台**：承接 Vite 构建产物并分发
- **教材数据**：译林九年级上册词汇 / 课文构建期打包为 TS 模块，随站点分发
- **教材原声**：`public/audio/` 内官方录音（单声道 AAC），构建时生成清单，运行时同源加载
- **AI 学习助手**（BYOK）：浏览器直连您自己的 AI 服务商（兼容 OpenAI 端点，流式 /chat/completions），Key 仅存本机、本站无记录
- **TTS 朗读**：edge-tts → SCF 云函数代理合成语音并回放，两级缓存（内存 + Cache API）降低等待；不可用时回退浏览器 Web Speech API
- **本地存储**：IndexedDB（Dexie）保存学习进度、复习记录、错题、AI 问答历史与导读单
- **PWA**：Service Worker 注册离线更新，可安装到主屏幕

### 快速开始

```bash
npm install        # 安装依赖
npm run dev        # 开发服务器
npm run build      # 生产构建
npm run preview    # 本地预览构建产物
```

> 局域网访问：开发服务器监听 `0.0.0.0`，启动后其他设备打开 `http://<本机局域网IP>:5173`。
> 注意：全局环境变量 `NODE_ENV=production` 会使 npm install 跳过开发依赖，安装/构建前请用 `NODE_ENV= npm install` / `NODE_ENV= npm run build`。

### 使用流程

1. 打开页面，选择单元
2. 在「学习」页浏览词汇 / 短语 / Notes，点击朗读按钮听发音
3. 进入「练习」页选择练习模式；「课文朗读」逐句跟读或播放原声
4. 在「复习」页查看 SRS 待复习；在「错题」页查看错题本与 AI 问答历史
5. 在「设置」页配置朗读偏好、主题色、字体大小；如需 AI 功能，配置自己的 API Key
6. 有自己的词表？在「导读单」导入，生成口语导读单反复练

### 项目结构

```
src/
├── components/       # 通用组件（闪卡 / 拼图 / 导入 / 页脚等）
├── data/textbooks/   # 教材数据（译林九年级上册词汇、课文与朗读）
├── db/               # IndexedDB 存储层（Dexie）
├── lib/              # TTS / 音频源 / 学习引擎 / i18n / AI 客户端
├── stores/           # 全局状态（Zustand）
├── styles/           # 全局样式与主题令牌
└── views/            # 页面（学习 / 练习 / 复习 / 错题 / 课文朗读 / 导读单 / AI / 设置）
public/
└── audio/yilin9a/    # 教材原声录音（单声道 AAC，随站点分发）
```

### 许可

本项目采用 **GNU Affero General Public License v3（AGPL-3.0）** 开源（见 `LICENSE`）。您可以自由使用、修改与分发，**但任何衍生作品必须以 AGPL-3.0 开源**（包括通过网络提供服务），且**保留原作者版权声明**——不允许闭源分支。

### 免责条款

- 本项目为**学习参考工具**，不构成任何形式的承诺或保证。
- 教材词汇数据经人工校对，但**不保证完全无错**，学习请以学校教材为准。
- AI 生成内容仅供参考，请以学校教材与老师讲解为准。
- 数据保存在您自己的设备上，请自行负责本机内容安全。

### 版权声明

- 本应用引用的教材内容（课文、词汇、短语、句式等）版权归**教材出版方及相关权利人**所有，仅供个人学习、非商业使用。
- 仓库内仅包含**学习用途的结构化数据引用**（词汇表、课文文本与注释的整理稿）与课文原声录音（`public/audio/`，供朗读功能），**不含教材 PDF、扫描件或完整影印内容**。
- 应用代码本身采用 AGPL-3.0 许可；教材内容与代码是两套独立的法律关系。
- 如相关权利人认为本应用的使用构成侵权，请联系作者删除相关内容。

---

## English

- [Introduction](#introduction)
- [Features](#features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Project Structure](#project-structure-1)
- [License](#license-1)
- [Disclaimer](#disclaimer)
- [Copyright Notice](#copyright-notice)

### Introduction

Lexi is a **login-free** English listening-and-speaking learning tool built around the Jiangsu Yilin Grade 9 (Volume 1) textbook, covering **261 words, 45 phrases, and 36 sentence patterns** plus read-aloud passages for all 8 units, using a four-step routine — **Recognize → Read → Spell → Choose**. All data stays in your browser; no account required.

- 🌐 Bilingual UI (中文 / English), switch in the top-right corner
- 🌗 Light/dark themes + four accent colors (Emerald / Berry / Indigo / Coral), adjustable font size
- 📱 Responsive: phone / tablet / PC
- 🔊 Read-aloud: US/UK × female/male voice combinations, adjustable speed; phonetic symbols render correctly on all devices (bundled IPA font)
- 📚 Built-in Yilin Grade-9 vocabulary and passages; import your own word lists to generate **speaking guides** for oral practice
- 📖 Passage reading: sentence-by-sentence synthesized TTS + full-passage official audio, switchable
- 🧩 Practice modes: 3D flashcards (flip & rate), collocation puzzles, 5-step sprint (input → shadow → practice → AI output → quiz), word-form drills, mini-writing
- 🤖 AI assistant (BYOK): sentence correction, quiz generation, situational dialogue; configure your own provider API key — it stays in your browser, conversations go directly to the provider, and this site logs nothing; past AI study cards are revisitable in the AI history tab
- 📦 Installable as an offline PWA

### Features

| Module | Content |
|---|---|
| Learn | Browse vocabulary / phrases / Notes by unit, listen to pronunciation, hide-Chinese self-test |
| Practice | 3D flashcards · collocation puzzles · 5-step sprint · word-form drills · mini-writing |
| Review | SRS due queue, quick review |
| Errors | Mistake book + AI Q&A history (revisit generated AI study cards, clear in one tap) |
| Reading | Sentence-level synthesized reading (with follow-along) and full-passage official audio, switchable |
| Guides | Import your own words / phrases / patterns into speaking guides; drill with flashcards, spelling and cloze |
| AI | Sentence correction · quiz generation · situational dialogue (BYOK) |
| Settings | TTS preferences (accent / voice / speed), theme color, font size |

### Architecture

A **pure front-end SPA** (React 18 + react-router + Tailwind 4) with **no self-hosted backend or database**, published as a static site (EdgeOne Pages, auto-building from the repository).

- **Static host**: serves the Vite build
- **Textbook data**: Yilin Grade-9 vocabulary and passages bundled as TypeScript modules at build time
- **Official audio**: recordings under `public/audio/` (mono AAC); a manifest is generated at build time and audio is served same-origin
- **AI assistant** (BYOK): the browser talks directly to your own AI provider (OpenAI-compatible endpoint, streaming /chat/completions); key stays on-device, nothing is logged
- **TTS read-aloud**: edge-tts via an SCF cloud-function proxy, two-level cache (memory + Cache API) to cut waiting; Web Speech API fallback
- **Local storage**: IndexedDB (Dexie) for progress, review records, mistakes, AI history, and speaking guides
- **PWA**: Service Worker for offline updates; installable to the home screen

### Getting Started

```bash
npm install        # Install dependencies
npm run dev        # Dev server
npm run build      # Production build
npm run preview    # Preview the build locally
```

> LAN access: the dev server listens on `0.0.0.0`; open `http://<your-LAN-IP>:5173` from other devices.
> Note: a global `NODE_ENV=production` causes npm install to skip dev dependencies — prefix with `NODE_ENV=` for install/build.

### Usage

1. Open the page and pick a unit
2. Browse vocabulary / phrases / Notes in the **Learn** tab; tap the speaker button to hear it
3. Pick a practice mode in **Practice**; use **Reading** for sentence-by-sentence shadowing or full-passage audio
4. Check your SRS due queue in **Review**; find the mistake book and AI history in **Errors**
5. Configure TTS, theme, and font size in **Settings**; add your own API key to enable AI features
6. Have your own word lists? Import them under **Guides** to generate speaking guides for repeated oral practice

### Project Structure

```
src/
├── components/       # Shared components (flashcards / puzzles / import / footer)
├── data/textbooks/   # Textbook data (Yilin Grade-9 vocabulary, passages, readings)
├── db/               # IndexedDB storage layer (Dexie)
├── lib/              # TTS / audio sources / session engine / i18n / AI client
├── stores/           # Global state (Zustand)
├── styles/           # Global styles and theme tokens
└── views/            # Pages (Learn / Practice / Review / Errors / Reading / Guides / AI / Settings)
public/
└── audio/yilin9a/    # Official textbook audio (mono AAC, distributed with the site)
```

### License

This project is open-sourced under the **GNU Affero General Public License v3 (AGPL-3.0)** (see `LICENSE`). You are free to use, modify, and distribute it, **but any derivative work must be open-sourced under AGPL-3.0** (including services offered over a network) and **must retain the original author's copyright notice** — no closed-source forks are allowed.

### Disclaimer

- This project is a **learning reference tool** and does not constitute any form of promise or guarantee.
- Textbook vocabulary has been carefully proofread but is **not guaranteed to be error-free**; teaching should defer to authoritative textbooks.
- AI-generated content is for reference only — defer to your textbook and teacher.
- Data is stored on your own device; you are responsible for its safety.

### Copyright Notice

- The textbook content referenced by this app (reading passages, vocabulary, phrases, sentence patterns, etc.) is the property of the **textbook publisher and related rights holders**, provided for personal, non-commercial study only.
- The repository contains only **structured data references for study purposes** (curated vocabulary lists, reading texts and notes) and the official passage audio (`public/audio/`, for the read-aloud feature); it does **not** include textbook PDFs, scans, or full facsimile content.
- The application code is licensed under AGPL-3.0; textbook content and code are separate legal relationships.
- If you believe any content infringes your rights, please contact the author for removal.
