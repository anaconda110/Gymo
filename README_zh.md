# Gymo

Gymo 是一款基于 Android Jetpack Compose 的健身训练记录应用，支持动作选择、动态加组、组次实时编辑、完成打勾与训练历史归档，主打零摩擦的记训体验。

[English](README.md)

## 功能特性

- **动作选择弹窗**：内置 34 个推拉腿预置动作，按目标肌群分组展示，一键添加到当前训练
- **动态加组**：在动作卡片中随时添加新组，自动继承上一组的重量与次数
- **组次实时编辑**：重量与次数支持行内编辑，输入容错解析，失焦即持久化
- **完成打勾**：每组可勾选完成状态，即时同步数据库
- **删除组次**：支持删除任意组，UI 序号自动连续显示（避免跳号）
- **训练历史**：已完成的训练按时间倒序列出，支持展开查看动作与组次详情
- **自动建 Session**：无活动训练时点击添加动作即自动创建新训练，无需手动开始

## 技术栈

- **Kotlin** 100%
- **Jetpack Compose** — 声明式 UI
- **Material 3** — 设计组件
- **Room** — 本地数据库持久化
- **ViewModel + StateFlow** — 响应式状态管理
- **Coroutines Flow** — 异步数据流
- **Repository 模式** — 数据层抽象

## 项目结构

```
app/src/main/java/com/example/gymo/
├── MainActivity.kt                 # 入口 + 底部导航（训练/历史双 Tab）
├── data/
│   ├── AppDatabase.kt              # Room 数据库 + 预置动作
│   ├── GymoDao.kt                  # DAO 接口
│   ├── GymoRepository.kt           # 数据仓库
│   ├── Exercise.kt                 # 动作实体
│   ├── WorkoutSession.kt           # 训练 Session 实体
│   ├── WorkoutExercise.kt          # 训练-动作关联实体
│   └── ExerciseSet.kt             # 组次实体
└── ui/
    ├── WorkoutViewModel.kt         # 训练页 ViewModel
    ├── GymoViewModelFactory.kt      # ViewModel 工厂
    ├── WorkoutScreen.kt            # 训练主界面 + 动作卡片 + 选择弹窗
    ├── HistoryScreen.kt            # 历史记录页
    └── theme/                      # Material 3 主题
```

## 构建与运行

### 环境要求

- Android Studio
- JDK 17+
- Android SDK（minSdk 详见 `app/build.gradle.kts`）

### 步骤

1. 克隆仓库
   ```bash
   git clone git@github.com:anaconda110/Gymo.git
   cd Gymo
   ```

2. 用 Android Studio 打开项目，等待 Gradle 同步完成

3. 连接 Android 设备或启动模拟器，点击运行

或使用命令行构建：
```bash
./gradlew assembleDebug
```

## 数据模型

| 实体 | 说明 |
|------|------|
| `Exercise` | 动作库（名称、目标肌群、类型、是否自定义） |
| `WorkoutSession` | 一次训练（开始/结束时间戳） |
| `WorkoutExercise` | 训练与动作的关联（含显示顺序） |
| `ExerciseSet` | 组次（重量、次数、组类型、完成状态） |

## 文档

- [分支策略](BRANCHES_zh.md) | [Branch Strategy](BRANCHES.md)
- [需求规划](REQUIREMENTS_zh.md) | [Requirements Roadmap](REQUIREMENTS.md)

## 许可证

本项目基于 [Apache License 2.0](LICENSE) 开源。

Copyright 2026 anaconda110