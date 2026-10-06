# Gymo

> 纯本地、无后端、无账号的力量训练记录 PWA。

Gymo 是一款纯本地的力量训练记录 PWA：精确到每一组的训练记录、动作库、计划模板、历史与 PR 统计——**数据完全留在你自己的设备**，不上云、不联网、不追踪。

## 技术栈

- **Vite** + **Svelte** + **TypeScript** —— 编译期框架，产物小、运行快、类型安全
- **Dexie.js** (IndexedDB) —— 纯本地存储，无需后端
- **vite-plugin-pwa** —— Service Worker 全缓存，可安装、完全离线

无任何运行时网络依赖（除构建时 `npm install` 拉取依赖）。

## 快速开始

```bash
npm install      # 安装依赖（需联网一次）
npm run dev      # 启动开发服务器 http://localhost:5173
npm run build    # 类型检查 + 生产构建，产物在 dist/
npm run preview  # 预览生产构建
npm run check    # 仅运行 svelte-check 类型检查（0 error 0 warning）
npm run test:e2e # 构建产物 + 无头浏览器 e2e 闭环测试（见下）
```

构建产物 (`dist/`) 是纯静态文件，可：
- 直接 `file://` 打开 `dist/index.html`，或
- 用任意静态服务器托管（如 `npx serve dist`），或
- 安装为 PWA（浏览器“添加到主屏幕”）后离线使用。

## 测试 / e2e

核心交互闭环用 [Playwright](https://playwright.dev) 以无头 Chromium 对 `npm run preview`（构建产物）做端到端验证，覆盖：

直达 `#/workout`（无 id）自动创建训练 → 添加动作 → 逐组记录重量×次数(含 RPE) →
智能下一组(预填) / 复制组 / 删除组 → 完成一组弹出组间计时器并跳过 → 完成训练 →
历史页可见该动作 PR(估计 1RM)>0 → 设置页 JSON 导出(断言非空且含训练与组) →
清空本地数据 → JSON 导入恢复(断言历史与 PR 恢复)。

```bash
npm run test:e2e
# 等价于：npm run build && npx playwright test
```

首次运行需安装无头浏览器内核：

```bash
npx playwright install chromium
```

> Playwright 仅作为 devDependency，不参与生产构建，不影响产物体积与纯本地性。
> e2e 运行时使用 `vite preview` 本地静态服务器与无头浏览器，全程无任何外部网络请求。

## 功能

- **动作库**：内置 20+ 常见力量动作（卧推/深蹲/硬拉/推举/划船/引体/弯举/臂屈伸…），按部位/器械分类，支持自定义新增；可附本地演示图（base64）。
- **训练记录**：创建训练日 → 添加动作 → 每组记录重量×次数（可选 RPE、备注）→ 上一组预填 / 复制组 / 智能下一组 → 勾选完成 → 自动弹出组间休息计时器。
- **组类型与超级组**：每组可标记 normal/superset/dropset/restpause；超级组通过分组号关联并标注；动作详情/历史按类型统计组数。
- **趋势图**：动作详情页以纯内联 SVG 绘制估计 1RM 与训练容量趋势线（可切换）。
- **历史与 PR**：按动作查看历史记录、最大重量、估计 1RM（Epley）、训练容量；按日期查看训练日志；日历视图 + 训练频率热力图。
- **身体测量**：记录体重/体脂率/各围度，内联 SVG 体重折线（新增「身体」导航项）。
- **计划/模板**：创建可复用模板，一键从模板开始训练；模板可导出/导入本地 .json 文件。
- **设置**：kg/lb 切换、默认休息时长、暗/亮主题。
- **数据**：JSON 全量备份/恢复（含身体测量）+ CSV 历史导出，IndexedDB 本地备份。

## 数据与隐私

- 全部数据存储在浏览器 **IndexedDB**，仅存在本设备。
- 无账号、无网络请求、无遥测。
- 请定期在「设置 → 数据」导出 JSON 备份；清除浏览器数据 / 隐私模式可能导致数据丢失。
- 卸载或清空浏览器存储会删除数据——备份文件由你保管。

## 目录结构

```
Gymo/
├── docs/Gymo项目文档.md      # 完整项目文档
├── docs/adr/                 # 架构决策记录
├── CONTEXT.md                # 领域词汇表
├── LICENSE                   # MIT 许可
├── THIRD-PARTY-NOTICES.md    # 第三方依赖许可与版权声明
├── index.html
├── public/                   # favicon、manifest 资源
├── src/
│   ├── App.svelte            # 根组件 + 路由 + 底部导航
│   ├── main.ts               # 入口（种子化动作库、加载设置）
│   ├── app.css               # 全局样式（暗色优先）
│   ├── lib/
│   │   ├── db.ts             # Dexie 数据库 schema
│   │   ├── types.ts          # 数据模型类型
│   │   ├── seed.ts           # 内置动作库 + 默认设置
│   │   ├── workout.ts        # 训练记录读写
│   │   ├── history.ts        # 历史与 PR 查询
│   │   ├── stats.ts          # 容量 / 1RM 估算
│   │   ├── settings.ts       # 设置 store
│   │   ├── restTimer.ts      # 组间计时器 store
│   │   ├── exportImport.ts   # JSON / CSV 导入导出
│   │   └── router.ts         # 极简 hash 路由
│   ├── components/
│   │   ├── ExerciseCard.svelte
│   │   ├── RestTimer.svelte
│   │   ├── TrendChart.svelte   # 内联 SVG 趋势图（1RM + 容量）
│   │   └── LineChart.svelte    # 内联 SVG 折线（体重等）
│   └── pages/
│       ├── Home.svelte  WorkoutPage.svelte
│       ├── Exercises.svelte  ExerciseDetail.svelte
│       ├── Templates.svelte  TemplateEditor.svelte
│       ├── History.svelte     # 按动作 / 按日期 / 日历热力图
│       ├── Body.svelte        # 身体测量（v0.2）
│       └── SettingsPage.svelte
├── package.json  vite.config.ts  svelte.config.js  tsconfig.json
├── playwright.config.ts      # e2e 配置（仅 devDependency）
└── e2e/gymo.spec.ts          # 核心闭环无头浏览器测试
```

## 许可

MIT License，见 [LICENSE](./LICENSE)。第三方依赖的许可见 [THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md)。

「训练容量 = 组数 × 重量 × 次数」等概念属力量训练领域的通行方法，本项目是对其的独立实现，与任何同类产品的开发者无关联、未获其授权或背书。