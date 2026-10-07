# ADR 0003：两端合并为单一仓库（monorepo）

日期：2026-10-06
状态：已接受

## 背景

Gymo 此前是两个互不相干的仓库：

- `anaconda110/Gymo` —— 原生 Android 客户端（Kotlin + Jetpack Compose + Room），15 个提交、5 个 feature 分支，Apache-2.0。
- 本地 Web PWA（Svelte + Dexie）—— 无远端、单一基线提交，MIT。

问题出在命名空间：GitHub 的仓库名在同一账号内大小写不敏感且唯一，`anaconda110/gymo` 与 `anaconda110/Gymo` 解析到同一个仓库，因此 Web 端无法以 `gymo` 之名推上去。可选路径只有三条：给 Web 端另起名（如 `gymo-web`）、把 Android 端改名腾出 `gymo`、或合并为一个仓库。

同时确认了三个事实：两个仓库之间**没有任何交叉引用**（互不提及、无共享代码）；两端**都没有 GitHub Actions**，合并无 CI 迁移成本；两端的**备份格式不兼容**（Android 导出 Room 实体结构，Web 导出 Dexie 表结构）。

## 决策

合并为单一仓库，Android 项目迁入 `apps/android/`，Web PWA 迁入 `apps/web/`，仓库根目录只保留共享文件（README、LICENSE、CONTEXT.md、docs/adr/、.github/、.gitignore）。

- **历史**：Android 端 15 个提交与全部分支完整保留；Web 端因其历史在品牌清理时已重建为单一基线提交，直接以 `--allow-unrelated-histories` 合入。两侧历史都未改写哈希。
- **许可统一为 MIT**：Android 端原为 Apache-2.0，但代码全部属于同一作者，改为 MIT 以消除「同一仓库两个许可、两个版权人」的矛盾。删除两端的 `LICENSE` 副本，只在仓库根保留一份。
- **署名统一**：根 `LICENSE` 与各端 `package.json` 的作者统一为 `anaconda110`。
- **文档分层**：领域术语集中于根 `CONTEXT.md`（两端共用）；架构决策集中在根 `docs/adr/`；各端保留自己的操作文档（Android：README/REQUIREMENTS/BRANCHES；Web：README + `docs/项目文档.md`）。

## 取舍与代价

- **收益**：`gymo` 这个名字归一个统一实体，命名冲突消失；领域模型（动作库、训练日、组、超级组、训练容量、PR）有了唯一权威定义，两端各自演化时不易漂移；共享文档只有一份。
- **代价**：根 README 必须同时描述两端，且新读者会自然地期待两端数据互通——实际上不会。因此 CONTEXT.md 专门定义了「客户端」「端内数据」「跨端迁移」三个术语，README 也单列一节说明备份格式不兼容。
- **未做**：没有建立共享的备份格式，也没有打通两端数据。monorepo 解决的是源码组织与命名问题，不是运行时集成。

## 已知遗留（合并时发现，未在本 ADR 中修复）

Android 端 `apps/android/app/src/main/java/com/example/` 下有三个**无 `.kt` 后缀**的游离文件：`g`（内容与 `ui/WorkoutScreen.kt` 相近但含更新的主题切换逻辑）、`gym`（与 `data/GymoRepository.kt` 逐字节相同）、`gymo/ui/Work`（内容为 `WorkoutViewModel` 的增强版，含拖拽排序）。它们不在 Kotlin 源集内，因此不参与编译——即 Android 端**已合并的 UI 打磨与组排序功能并未真正生效**，而 `reorderSets` 也无人调用。这是 Android 端自身的历史问题，与本次合并无关。

**后续（2026-10-06，已部分修复）**：`g` 的内容恢复为 `ui/WorkoutScreen.kt`，`Work` 的内容恢复为 `ui/WorkoutViewModel.kt`，三个游离文件已删除；`MainActivity` 接线主题切换并以 SharedPreferences 持久化，主题切换按钮自此真正生效。组次拖拽的手势 UI 原本从未被任何人编写（原提交只有数据层），现已补齐：每组行首增加长按拖拽手柄，拖动期间以本地顺序渲染、跨行交换、松手才经 `reorderSets()` 落库；手势节点以常量 key 挂接并用 `rememberUpdatedState` 在事件时读取行身份，避免换序后手势协程被取消或捕获过期的行号。另：Android 构建未在本环境验证（本机无 Android SDK 平台包，JDK 25 与 Gradle 8.13 不兼容），需在 Android Studio 中构建确认。

## 备选方案（未采纳）

- **Web 端另起名 `gymo-web`**：不需要动 Android 端，但把「同一个项目的两个客户端」拆成两个仓库，领域模型会出现两份各自演化的定义。
- **Android 端改名腾出 `gymo`**：会让 Android 端旧地址的自动重定向失效（GitHub 文档明确不建议复用被改名仓库的旧名），且两个仓库仍各自孤立。
