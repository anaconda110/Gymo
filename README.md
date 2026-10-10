# Gymo

[![CI](https://github.com/anaconda110/Gymo/actions/workflows/ci.yml/badge.svg)](https://github.com/anaconda110/Gymo/actions/workflows/ci.yml)

> 力量训练记录器 —— 精确到每一组，数据只留在自己的设备上。

Gymo 是一个**多端项目**：同一套训练记录理念，两个各自独立的客户端实现。两端共享领域模型（动作库、训练日、组、超级组、训练容量、PR），但代码、构建与数据互不依赖——同一仓库，只为便于统一维护与共享文档。

| 客户端 | 形态 | 技术栈 | 存储 | 许可 |
|---|---|---|---|---|
| [`apps/android`](./apps/android) | 原生 Android App | Kotlin + Jetpack Compose + Material 3 + Room | 应用内 Room 数据库 | MIT |
| [`apps/web`](./apps/web) | 纯本地 PWA（浏览器/可安装） | Svelte 4 + TypeScript + Dexie (IndexedDB) | 浏览器 IndexedDB | MIT |

两端的共同点：**无账号、无后端、无遥测**，数据只存在本设备，不联网同步。差异在运行形态与备份格式，见下。

## 快速开始

### Web PWA

```bash
cd apps/web
npm install       # 首次需联网
npm run dev       # http://localhost:5173
npm run build     # 类型检查 + 生产构建，产物在 apps/web/dist/
npm run test:e2e  # 构建产物 + 无头浏览器 e2e 闭环
```

`dist/` 是纯静态文件，可 `file://` 直接打开、任意静态托管，或安装为 PWA 离线使用。

### Android App

```bash
cd apps/android
./gradlew assembleDebug    # 需 Android SDK 与 JDK 17+
```

或用 Android Studio 打开 `apps/android/` 等待 Gradle 同步后运行。最低 Android 8.0（API 28）。

## 两端的数据不互通

两个客户端都支持 JSON 备份/恢复，但**格式不同、互不兼容**：Android 导出的是 Room 实体结构，Web 导出的是 Dexie 表结构。同一个文件无法在另一端起效。

如果要跨端迁移，目前需要自行转换格式；这是已知限制，不是配置问题。

## 测试与 CI

每次 push 到 `main` 会自动运行 [CI](https://github.com/anaconda110/Gymo/actions/workflows/ci.yml)，
两个端并行：

| 端 | 命令 | 内容 |
|---|---|---|
| Web | `cd apps/web && npm run check` | svelte-check 类型检查 |
| Web | `cd apps/web && npm run test:unit` | 42 条纯函数单测（Vitest） |
| Web | `cd apps/web && npm run test:e2e` | 19 条 Playwright 端到端（构建产物 + 无头 Chromium） |
| Android | `cd apps/android && ./gradlew assembleDebug testDebugUnitTest` | 编译 + 单测（需本地 SDK） |

Android 构建产物（debug APK）在 CI run 页面以 artifact 提供下载。发布签名
包见 [`docs/RELEASING.md`](./docs/RELEASING.md)。

## 共享文档

- [`CONTEXT.md`](./CONTEXT.md) —— 领域词汇表：两端共用的术语及其确切含义（训练日、动作实例、组、超级组、训练容量、三种 PR、相对强度…）。改动领域模型前先读这里。
- [`docs/adr/`](./docs/adr) —— 架构决策记录。
- [`docs/RELEASING.md`](./docs/RELEASING.md) —— 发布手册（签名、版本号、Release 流程）。
- [`CHANGELOG.md`](./CHANGELOG.md) —— 版本变更记录。
- [`THIRD-PARTY-NOTICES.md`](./THIRD-PARTY-NOTICES.md) —— 第三方依赖许可与版权声明。
- 各端自己的文档：`apps/android/README_zh.md`、`apps/android/REQUIREMENTS.md`（需求路线图）、`apps/web/docs/项目文档.md`（完整项目文档）。

## 许可

MIT License，见 [LICENSE](./LICENSE)。第三方依赖见 [THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md)。

「训练容量 = 组数 × 重量 × 次数」等概念属力量训练领域的通行方法，本项目是对其的独立实现，与任何同类产品的开发者无关联、未获其授权或背书。
