# ADR 0002：以 MIT 许可发布，并补齐第三方许可声明

日期：2026-10-06
状态：已接受

## 背景

仓库此前没有 `LICENSE` 文件，`package.json` 也没有 `license` 字段，但文档在对比表里自称「免费、开源、自托管」，README 的「许可与定位」一节又写「个人项目，仅供学习与自用」。两者互相矛盾：没有许可文件时默认保留所有权利，任何人都没有使用、修改、分发的许可，也就谈不上「开源」。

同时，构建产物 `dist/` 打包了 Dexie.js（Apache-2.0）与 Workbox、Svelte（MIT）。Apache-2.0 要求分发时随附许可文本与 NOTICE，MIT 要求保留版权与许可声明。

## 决策

1. 新增 `LICENSE`（MIT，Copyright (c) 2026 anaconda110），`package.json` 补 `"license": "MIT"` 与 `"author"` 字段，并把描述中的表述与文档统一。
2. 新增 `THIRD-PARTY-NOTICES.md`，列出 Web 端产物中分发的第三方组件（Dexie / Svelte / Workbox / vite-plugin-pwa）及其版本、许可与版权行，并附 MIT 与 Apache-2.0 全文及 Dexie 的 NOTICE；仅构建期使用的 devDependencies 单独列出，注明完整文本在 `node_modules/<包名>/LICENSE`。
3. README 的「许可与定位」改为「许可」，删去与 MIT 冲突的「仅供自用」限制语。
4. 文档对比表中「免费、开源、自托管」的表述保留，因其在 MIT 之下已成立。

## 取舍与代价

- **选择 MIT 而非 Apache-2.0**：依赖中已有 Apache-2.0（Dexie、TypeScript），选 Apache-2.0 可与之一致并附专利授权，但条款与随附文件更重。本项目为个人工具，MIT 的简洁性更合适。
- **代价**：MIT 授权他人自由使用、修改、分发本项目，包括商业使用。这是「开源」一词的题中之义；若日后希望限制，需重新选择许可（对已发布的版本不可撤回）。

## 备选方案（未采纳）

- **维持「保留所有权利」，仅删除「开源」二字**：最小改动，但依赖的署名要求仍未满足，且与 README 的定位描述仍不一致。
- **Apache-2.0**：专利授权条款对可能被公司采用的项目更稳妥，但当前场景下收益不足。
