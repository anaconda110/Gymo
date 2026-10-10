# Gymo 需求规划

> 注（2026-10-07）：仓库转为双端单仓库后本路线图重写。原 7 月迭代（P0–P2，
> 开发于已清理的 `feature/*` 分支，提交历史保留在 `main`）已全部实现——
> 包括合并时发现并修复的主题切换与组次拖拽排序。

## Android 端现状（apps/android）

已实现并在维护：
- 动作库管理（34 预置 + 自定义增删改、搜索、肌群筛选）
- 训练记录：动态加组、行内编辑、完成勾选、**长按拖拽排序**
- 历史归档、统计页（总量 + 周热力图）
- JSON 备份/导出/分享，主题切换（跟随系统 + 手动覆盖）

Web 端（`apps/web`）另有：RPE、模板、超级组 UI、身体测量、PR/1RM 估算、
单位换算——完整文档见 `apps/web/docs/项目文档.md`。

## 候选方向（已登记为 GitHub Issue——按真实需要选取）

1. **跨端备份格式**：目前 Android（Room 实体）与 Web（Dexie 表结构）的备份
   互不兼容。统一为带版本号的共享信封后，任意一端可恢复另一端的数据。
   → 见 issue 追踪器。
2. **功能对齐**：当某个 Web 已验证的功能在手机上产生真实需要时移植。
3. **发布渠道打磨**：按 tag 用签名 release APK 发布 GitHub Releases。
   → 见 issue 追踪器；流程见 `docs/RELEASING.md`。

## 说明

- 分支策略见 `BRANCHES.md`；已合并的 feature 分支会清理，工作都在 `main` 历史。
- 单测约定：ViewModel 层用内存版 DAO 做纯 JVM 测试（见 `ReorderSetsTest`），
  不依赖设备或 Robolectric。
