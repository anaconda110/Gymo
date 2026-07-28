# Gymo

Gymo is an Android fitness workout tracking app built with Jetpack Compose. It supports exercise selection, dynamic set addition, inline set editing, completion checkmarks, and workout history archiving — designed for a frictionless logging experience.

Gymo 是一款基于 Android Jetpack Compose 的健身训练记录应用，支持动作选择、动态加组、组次实时编辑、完成打勾与训练历史归档，主打零摩擦的记训体验。

## Features / 功能特性

- **Exercise Picker Dialog / 动作选择弹窗**: 34 preset push/pull/leg exercises, grouped by target muscle, one-tap to add to current workout / 内置 34 个推拉腿预置动作，按目标肌群分组展示，一键添加到当前训练
- **Dynamic Set Addition / 动态加组**: Add sets anytime within an exercise card, auto-inheriting previous set's weight and reps / 在动作卡片中随时添加新组，自动继承上一组的重量与次数
- **Inline Set Editing / 组次实时编辑**: Weight and reps editable in-row, fault-tolerant parsing, persisted on focus loss / 重量与次数支持行内编辑，输入容错解析，失焦即持久化
- **Completion Checkmark / 完成打勾**: Toggle completion state per set, instantly synced to database / 每组可勾选完成状态，即时同步数据库
- **Set Deletion / 删除组次**: Delete any set, UI numbering auto-adjusts (no gaps) / 支持删除任意组，UI 序号自动连续显示（避免跳号）
- **Workout History / 训练历史**: Completed workouts listed in reverse chronological order, expandable to view exercises and set details / 已完成的训练按时间倒序列出，支持展开查看动作与组次详情
- **Auto Session Creation / 自动建 Session**: Adding an exercise with no active session automatically starts a new workout / 无活动训练时点击添加动作即自动创建新训练，无需手动开始

## Tech Stack / 技术栈

- **Kotlin** 100%
- **Jetpack Compose** — Declarative UI / 声明式 UI
- **Material 3** — Design components / 设计组件
- **Room** — Local database persistence / 本地数据库持久化
- **ViewModel + StateFlow** — Reactive state management / 响应式状态管理
- **Coroutines Flow** — Async data streams / 异步数据流
- **Repository Pattern** — Data layer abstraction / 数据层抽象

## Project Structure / 项目结构

```
app/src/main/java/com/example/gymo/
├── MainActivity.kt                 # Entry + bottom navigation (Workout/History tabs) / 入口 + 底部导航
├── data/
│   ├── AppDatabase.kt              # Room database + preset exercises / Room 数据库 + 预置动作
│   ├── GymoDao.kt                  # DAO interface / DAO 接口
│   ├── GymoRepository.kt           # Data repository / 数据仓库
│   ├── Exercise.kt                 # Exercise entity / 动作实体
│   ├── WorkoutSession.kt           # Workout session entity / 训练 Session 实体
│   ├── WorkoutExercise.kt          # Workout-exercise association entity / 训练-动作关联实体
│   └── ExerciseSet.kt             # Set entity / 组次实体
└── ui/
    ├── WorkoutViewModel.kt         # Workout page ViewModel / 训练页 ViewModel
    ├── GymoViewModelFactory.kt      # ViewModel factory / ViewModel 工厂
    ├── WorkoutScreen.kt            # Main workout screen + exercise cards + picker dialog / 训练主界面 + 动作卡片 + 选择弹窗
    ├── HistoryScreen.kt            # History screen / 历史记录页
    └── theme/                      # Material 3 theme / Material 3 主题
```

## Build & Run / 构建与运行

### Prerequisites / 环境要求

- Android Studio
- JDK 17+
- Android SDK (see `app/build.gradle.kts` for minSdk) / Android SDK（minSdk 详见 `app/build.gradle.kts`）

### Steps / 步骤

1. Clone the repository / 克隆仓库
   ```bash
   git clone git@github.com:anaconda110/Gymo.git
   cd Gymo
   ```

2. Open the project in Android Studio and wait for Gradle sync / 用 Android Studio 打开项目，等待 Gradle 同步完成

3. Connect an Android device or start an emulator, then click Run / 连接 Android 设备或启动模拟器，点击运行

Or build from command line / 或使用命令行构建：
```bash
./gradlew assembleDebug
```

## Data Model / 数据模型

| Entity / 实体 | Description / 说明 |
|--------|-------------|
| `Exercise` | Exercise library (name, target muscle, type, custom flag) / 动作库（名称、目标肌群、类型、是否自定义） |
| `WorkoutSession` | A workout session (start/end timestamps) / 一次训练（开始/结束时间戳） |
| `WorkoutExercise` | Workout-exercise association (with display order) / 训练与动作的关联（含显示顺序） |
| `ExerciseSet` | A set (weight, reps, set type, completion status) / 组次（重量、次数、组类型、完成状态） |

## License / 许可证

This project is licensed under the [Apache License 2.0](LICENSE).

本项目基于 [Apache License 2.0](LICENSE) 开源。

Copyright 2026 anaconda110