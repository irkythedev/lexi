<div align="center">

# Lexi · 英语听说词汇

![version](https://img.shields.io/badge/版本-v0.2.2-blue)
![react](https://img.shields.io/badge/React-18-61dafb) ![vite](https://img.shields.io/badge/Vite-5-646cff) ![tailwind](https://img.shields.io/badge/Tailwind-4-38bdf8) ![typescript](https://img.shields.io/badge/TypeScript-5.5-3178c6) ![zustand](https://img.shields.io/badge/Zustand-5-764abc) ![dexie](https://img.shields.io/badge/Dexie-4-00b894)

<p>围绕江苏译林教材（8A / 9A）的英语单词、短语、句式听说学习工具。<br/>本地运行 · 无需登录 · 中英双语 · 深浅主题 · 离线可用 · 在线访问：<a href="https://lexi.irky.dev">https://lexi.irky.dev</a></p>

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

Lexi 是一个**无需登录**的英语词汇听说学习工具，围绕江苏译林 8A / 9A 教材词汇，用「认识 → 跟读 → 拼写 → 选择」四步训练帮助巩固单词、短语与句式。数据完全保存在本机浏览器，无需注册账号。

- 🌐 中英双语，右上角一键切换
- 🌗 深浅主题 + 四种主题色（翡翠 / 莓果 / 靛蓝 / 珊瑚），字体大小可缩放
- 📱 响应式：手机 / 平板 / PC
- 🔊 朗读：美音 / 英音 × 女声 / 男声四种组合，语速可调
- 📚 内置江苏译林 8A / 9A 词汇数据，支持导入自定义词表（TSV / JSON）
- 🧩 练习模式：3D 闪卡（翻转评分）、搭配拼图（结构配对）、5 步微冲刺（输入→跟读→练习→AI→小测）
- 🤖 AI 学习助手（BYOK）：作文批改、智能出题、角色扮演；配置您自己的 AI 服务商 API Key 即可使用，Key 仅存本机、对话直连服务商、本站不记录
- 📦 可安装为应用离线使用（PWA）

### 功能清单

| 模块 | 内容 |
|---|---|
| 学习 | 按单元浏览词汇，朗读发音，隐藏中文自测 |
| 练习 | 3D 闪卡 · 搭配拼图 · 5 步微冲刺 |
| 复习 | SRS 待复习队列，错题本，快速回顾 |
| AI | 作文批改 · 智能出题 · 角色扮演（BYOK） |
| 设置 | 朗读偏好（口音 / 音色 / 语速）、主题色、字体大小、个人词表导入 |

### 运行架构

本项目为**纯前端 SPA**（React 18 + react-router + Tailwind 4），**无自建后端与数据库**，发布为静态站点托管（EdgeOne Pages）。

- **静态托管平台**：承接 Vite 构建产物并分发
- **教材数据**：江苏译林 8A / 9A 词汇构建期打包为 TS 模块，随站点分发
- **AI 学习助手**（BYOK）：浏览器直连您自己的 AI 服务商（兼容 OpenAI 端点，流式 /chat/completions），Key 仅存本机、本站无记录
- **TTS 朗读**：edge-tts → SCF 云函数代理合成语音并回放；不可用时回退浏览器 Web Speech API
- **本地存储**：IndexedDB（Dexie）保存学习进度、复习记录、错题与自定义词表
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

1. 打开页面，选择教材与单元
2. 在「学习」页浏览词汇，点击朗读按钮听发音
3. 进入「练习」页选择练习模式
4. 在「复习」页查看 SRS 待复习与错题
5. 在「设置」页配置朗读偏好、主题色、字体大小

### 项目结构

```
src/
├── components/       # 通用组件（闪卡 / 拼图 / 导入 / 页脚等）
├── data/textbooks/   # 教材数据（译林 8A / 9A 等）
├── db/               # IndexedDB 存储层（Dexie）
├── lib/              # TTS / 学习引擎 / i18n / AI 客户端
├── stores/           # 全局状态（Zustand）
├── styles/           # 全局样式与主题令牌
└── views/            # 页面（学习 / 练习 / 复习 / AI / 设置）
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
- 仓库内仅包含**学习用途的结构化数据引用**（词汇表、课文文本与注释的整理稿），**不含教材 PDF、扫描件或完整影印内容**。
- 教材官方录音随仓库 `public/audio/` 分发（单声道 AAC，供课文原声朗读）。
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

Lexi is a **login-free** English vocabulary learning tool built around the Jiangsu Yilin textbooks (8A / 9A). It uses a four-step routine — **Recognize → Read → Spell → Choose** — to reinforce words, phrases, and sentence patterns. All data stays in your browser; no account required.

- 🌐 Bilingual UI (中文 / English), switch in the top-right corner
- 🌗 Light/dark themes + four accent colors (Emerald / Berry / Indigo / Coral), adjustable font size
- 📱 Responsive: phone / tablet / PC
- 🔊 Read-aloud: US/UK × female/male voice combinations, adjustable speed
- 📚 Built-in Yilin 8A/9A vocabulary; import your own word lists (TSV / JSON)
- 🧩 Practice modes: 3D flashcards (flip & rate), collocation puzzles, 5-step sprint (input → read → practice → AI → quiz)
- 🤖 AI assistant (BYOK): essay correction, quiz generation, role-play; configure your own provider API key — it stays in your browser, conversations go directly to the provider, and this site logs nothing
- 📦 Installable as an offline PWA

### Features

| Module | Content |
|---|---|
| Learn | Browse vocabulary by unit, listen to pronunciation, hide-Chinese self-test |
| Practice | 3D flashcards · collocation puzzles · 5-step sprint |
| Review | SRS due queue, mistake book, quick review |
| AI | Essay correction · quiz generation · role-play (BYOK) |
| Settings | TTS preferences (accent / voice / speed), theme color, font size, personal word-list import |

### Architecture

A **pure front-end SPA** (React 18 + react-router + Tailwind 4) with **no self-hosted backend or database**, published as a static site (EdgeOne Pages).

- **Static host**: serves the Vite build
- **Textbook data**: Yilin 8A/9A vocabulary bundled as TypeScript modules at build time
- **AI assistant** (BYOK): the browser talks directly to your own AI provider (OpenAI-compatible endpoint, streaming /chat/completions); key stays on-device, nothing is logged
- **TTS read-aloud**: edge-tts via an SCF cloud-function proxy, with Web Speech API fallback
- **Local storage**: IndexedDB (Dexie) for progress, review records, mistakes, and imported word lists
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

1. Open the page and pick a textbook and unit
2. Browse vocabulary in the **Learn** tab; tap the speaker button to hear it
3. Pick a practice mode in the **Practice** tab
4. Check your SRS due queue and mistakes in the **Review** tab
5. Configure TTS, theme, font size, and imports in **Settings**

### Project Structure

```
src/
├── components/       # Shared components (flashcards / puzzles / import / footer)
├── data/textbooks/   # Textbook data (Yilin 8A / 9A, etc.)
├── db/               # IndexedDB storage layer (Dexie)
├── lib/              # TTS / session engine / i18n / AI client
├── stores/           # Global state (Zustand)
├── styles/           # Global styles and theme tokens
└── views/            # Pages (Learn / Practice / Review / AI / Settings)
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
- The repository contains only **structured data references for study purposes** (curated vocabulary lists, reading texts and notes); it does **not** include textbook PDFs, scans, or full facsimile content.
- Official textbook audio is bundled under `public/audio/` (mono AAC) for the original-audio reading mode.
- The application code is licensed under AGPL-3.0; textbook content and code are separate legal relationships.
- If you believe any content infringes your rights, please contact the author for removal.
