# Gymo Requirements Roadmap / Gymo 需求规划

This document outlines the roadmap for future Gymo iterations, organized by priority and mapped to feature branches.

本文档记录 Gymo 后续迭代的需求清单，按优先级与 feature 分支对应。

---

## P0 — Core Experience / 核心体验完善

### Requirement 1: Exercise Library Management / 需求 1：动作库管理
**Branch / 对应分支**: `feature/exercise-manager`

**Background / 背景**: The current exercise library has 34 preset exercises with no way for users to customize. / 当前动作库为预置 34 个动作，用户无法自定义增删改。

**Features / 功能点**:
1. Add custom exercises: name, target muscle, type (barbell/dumbbell/machine/bodyweight) / 新增自定义动作：输入名称、目标肌群、类型（杠铃/哑铃/器械/自重）
2. Edit existing exercises: modify name/muscle/type / 编辑已有动作：修改名称/肌群/类型
3. Delete exercises: soft delete (preset exercises with `isCustom=false` cannot be deleted, only hidden) / 删除动作：软删除（标记 `isCustom=false` 的预置动作不可删，仅可隐藏）
4. Exercise search: add a search box in the picker dialog, fuzzy match by name/muscle / 动作搜索：在动作选择弹窗中增加搜索框，按名称/肌群模糊匹配
5. Muscle group filter tabs: horizontal scrollable filter at the top of the picker dialog / 肌群筛选 Tab：弹窗顶部按肌群横向滚动筛选

**Acceptance Criteria / 验收标准**:
- Users can add custom exercises and immediately see them in the picker dialog / 用户可添加自定义动作并立即在选择弹窗中看到
- Editing an exercise name syncs to workout history / 编辑后训练历史中的动作名同步更新
- Searching "bench press" matches "Barbell Bench Press", "Dumbbell Bench Press", etc. / 搜索框输入「卧推」能匹配到「杠铃卧推」「哑铃卧推」等

---

## P1 — Data & Statistics / 数据与统计

### Requirement 2: Workout Statistics / 需求 2：训练数据统计
**Branch / 对应分支**: `feature/workout-stats`

**Background / 背景**: Users need to review training volume and frequency to track progress. / 用户需要回顾训练量与频率，判断进步趋势。

**Features / 功能点**:
1. Stats page (third tab): total workout count, total sets, total volume (Σ weight×reps) / 统计页（第三个 Tab）：展示总训练次数、总组数、总容量（Σ 重量×次数）
2. Weekly training frequency heatmap (similar to GitHub contribution graph) / 周训练频率热力图（类似 GitHub 贡献图）
3. Per-exercise weight trend line chart (max weight over last 10 sessions) / 单个动作的重量趋势折线图（最近 10 次训练的最大重量）
4. Monthly training volume bar chart (grouped by muscle) / 月度训练量柱状图（按肌群分组）

**Acceptance Criteria / 验收标准**:
- Stats update in real-time as workouts are completed / 统计数据随训练完成实时更新
- Charts scroll smoothly on low-end devices (Canvas or MPAndroidChart) / 图表在低端机型上滚动流畅（Canvas 绘制或 MPAndroidChart）

---

### Requirement 3: Data Backup & Export / 需求 3：数据备份与导出
**Branch / 对应分支**: `feature/data-backup`

**Background / 背景**: Data is lost when switching devices or reinstalling; backup capability is needed. / 换机或重装 App 时数据会丢失，需要备份能力。

**Features / 功能点**:
1. Export: database to JSON file (all Sessions/Exercises/Sets) / 导出：将数据库导出为 JSON 文件（含所有 Session/Exercise/Set）
2. Import: restore from JSON (merge strategy: deduplicate by id, skip if exists) / 导入：从 JSON 文件恢复数据（合并策略：按 id 去重，已存在则跳过）
3. Share: send JSON via system share sheet (WeChat/email/etc.) / 分享：通过系统分享 Sheet 将 JSON 发送到其他 App（微信/邮件等）
4. Auto-backup: export to app-private directory after each completed workout / 自动备份：每次完成训练后自动导出到应用私有目录

**Acceptance Criteria / 验收标准**:
- Exported JSON can be imported on another device to fully restore workout records / 导出的 JSON 可在另一台设备导入后完整还原训练记录
- Import does not corrupt existing data (skip on id conflict, not overwrite) / 导入时不破坏现有数据（id 冲突时跳过而非覆盖）

---

## P2 — Interaction Polish / 交互优化

### Requirement 4: UI Polish / 需求 4：UI 美化
**Branch / 对应分支**: `feature/ui-polish`

**Background / 背景**: Current UI is function-first, lacking animations and visual hierarchy. / 当前 UI 为功能优先，缺乏动效与视觉层次。

**Features / 功能点**:
1. `AnimatedVisibility` transitions for exercise card add/remove / 动作卡片添加/删除时使用 `AnimatedVisibility` 过渡动画
2. `animateItemPlacement` for smooth set row add/remove / 组次行添加/删除时使用 `animateItemPlacement` 平滑位移
3. Scale feedback animation on completion checkmark / 完成打勾时增加缩放反馈动画
4. Empty state illustrations (Lottie or vector) / 空状态增加插画占位（Lottie 或矢量图）
5. Dark/light theme toggle (settings page) / 深色/浅色主题切换（设置页）
6. Gradient backgrounds and shadow depth for workout cards / 训练卡片增加渐变背景与阴影层次

**Acceptance Criteria / 验收标准**:
- Animations ≥ 60fps, no jank / 动画帧率 ≥ 60fps，无卡顿
- Dark mode text contrast meets WCAG AA / 深色模式下文字对比度满足 WCAG AA

---

### Requirement 5: Set Drag-to-Reorder / 需求 5：组次拖拽排序
**Branch / 对应分支**: `feature/set-reorder`

**Background / 背景**: Users may add sets in the wrong order and need to drag to rearrange. / 用户加组顺序可能不对，需要拖拽调整。

**Features / 功能点**:
1. Long-press a set row to enter drag mode / 长按组次行进入拖拽模式
2. Real-time UI reorder during drag / 拖拽时实时更新 UI 顺序
3. Batch update database `setIndex` on release (transaction) / 松手后批量更新数据库 `setIndex`（事务）
4. Drag handle icon (≡) to indicate draggability / 拖拽手柄图标（≡）提示可拖拽

**Acceptance Criteria / 验收标准**:
- UI numbering matches database `setIndex` after drag / 拖拽后 UI 序号与数据库 `setIndex` 一致
- Other rows smoothly avoid the dragged row / 拖拽过程中其他行平滑避让

---

## Priority Overview / 需求优先级总览

| Priority / 优先级 | Requirement / 需求 | Branch / 分支 | Status / 状态 |
|----------|-------------|--------|--------|
| P0 | Exercise Library Management / 动作库管理 | `feature/exercise-manager` | To Do / 待开发 |
| P1 | Workout Statistics / 训练数据统计 | `feature/workout-stats` | To Do / 待开发 |
| P1 | Data Backup & Export / 数据备份与导出 | `feature/data-backup` | To Do / 待开发 |
| P2 | UI Polish / UI 美化 | `feature/ui-polish` | To Do / 待开发 |
| P2 | Set Drag-to-Reorder / 组次拖拽排序 | `feature/set-reorder` | To Do / 待开发 |

---

## Development Workflow / 开发流程

1. Switch to the corresponding feature branch / 切到对应 feature 分支
   ```bash
   git checkout develop
   git checkout feature/xxx
   ```
2. Implement features one by one and commit / 按「功能点」逐个实现并提交
3. Merge back to `develop` after self-testing / 自测通过后合并回 `develop`
4. Merge `develop` to `main` and tag after full testing / `develop` 整体测试后合并回 `main` 并打 tag