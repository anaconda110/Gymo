# Gymo 备份信封（跨端格式规范）

本文档定义 Gymo 两个客户端（`apps/android`、`apps/web`）之间可互认的 JSON 备份
格式。它是**规范**：任何一端的导出/导入实现都以此为准；实现细节（数据库表名、
自增策略）不属于本文档。

版本：**envelope v1**（2026-10-10 定稿，`schemaVersion: 1`）

---

## 1. 信封

所有备份文件都是 UTF-8 的 JSON 对象：

```json
{
  "app": "Gymo",
  "schemaVersion": 1,
  "exportedAt": "2026-10-10T07:30:00.000Z",
  "producer": "android",
  "data": { /* 按 §3 的集合 */ }
}
```

| 字段 | 必填 | 说明 |
|---|---|---|
| `app` | ✅ | 固定字符串 `"Gymo"`。用于快速否决非备份文件。 |
| `schemaVersion` | ✅ | 整数，本规范为 `1`。导入方按此选择解析规则（§4）。 |
| `exportedAt` | ✅ | ISO 8601 UTC 时间戳，仅作展示与排查用。 |
| `producer` | ✅ | `"android"` \| `"web"`。**仅供诊断与提示**，不得据此切换解析逻辑——所有差异必须由 §3 的字段规范表达。 |
| `data` | ✅ | 集合对象，键见 §3；缺失的集合视为空数组。 |

> 兼容说明：Android 在引入本规范前导出的文件没有信封，只有顶层 `version: 1`
> 与并列的 `exercises`/`sessions`/… 数组。这属于 **legacy-android** 形态，导入方
> **可以**按 §7 的降级规则接受它，但导出方一律输出本规范信封。

## 2. 通用规则

- **id**：`id` 字段是导出时的本地自增主键，**导入方必须忽略并重新分配**。跨文件
  引用只能通过本规范定义的外键字段表达。
- **时间**：时间戳一律为 Unix epoch **毫秒**（整数）。
- **单位**：重量一律为 **kg**（双精度）。磅是展示层概念，备份文件中不出现。
- **缺失字段语义**：字段**不存在** = 该端未记录该信息，导入时保持为空；
  空字符串/0 与缺失不等价。不要用哨兵值编码"无"。
- **未知字段**：导入方必须忽略不认识的字段（前向兼容），不得因此报错。

## 3. 集合与字段

### 3.1 `exercises`（动作字典项）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | number | ✅ | 见 §2 |
| `name` | string | ✅ | 动作名称 |
| `muscleGroup` | enum | ✅ | `chest`/`back`/`shoulders`/`biceps`/`triceps`/`legs`/`core`/`fullbody` |
| `equipment` | enum | ✅ | `barbell`/`dumbbell`/`machine`/`bodyweight`/`kettlebell`/`cable`/`other` |
| `isCustom` | boolean | ✅ | 是否用户自定义 |
| `notes` | string | | 备注 |
| `image` | string | | 本地演示图（base64 data URL）；大字段，导入方可选是否保留 |
| `createdAt` | number | | 创建时间戳 |

两端旧数据的取值映射见 §5。

### 3.2 `workouts`（训练日）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | number | ✅ | |
| `date` | number | ✅ | 训练日期/时间戳（Android 的 `startTime` 映射至此） |
| `name` | string | | 训练日名称；缺失时导入方自行生成（如本地日期时间） |
| `notes` | string | | 训练备注（Android 的 `note` 映射至此） |
| `durationSec` | number | | 训练总时长 |
| `createdAt` | number | | |
| `endedAt` | number | | 结束时间戳（Android 的 `endTime`）；`null` 表示未结束 |

`endedAt` 缺省为 `null`。Android 用「`endTime != null`」判定训练已完成，
Web 目前用是否存在该训练日的全部记录来判定；跨端导入后进行中的训练日
在两端行为可能不同，属于已知差异（见 §6）。

### 3.3 `workoutExercises`（训练日中的动作实例）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | number | ✅ | |
| `workoutId` | number | ✅ | → `workouts.id`（Android 的 `sessionId` 映射至此） |
| `exerciseId` | number | ✅ | → `exercises.id` |
| `order` | number | ✅ | 顺序，从 0 起（Android 的 `orderIndex` 保持原值，其种子数据从 0 起） |
| `notes` | string | | |
| `restSec` | number | | 该动作的组间休息（秒） |
| `supersetGroup` | number | | 超级组分组号；0 或缺失表示无 |

### 3.4 `sets`（组）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | number | ✅ | |
| `workoutExerciseId` | number | ✅ | → `workoutExercises.id` |
| `order` | number | ✅ | 组序号（Android 的 `setIndex` 映射至此） |
| `weight` | number | ✅ | kg |
| `reps` | number | ✅ | 次数 |
| `setType` | enum | ✅ | 见 §5.3（Android 的 `type` 映射至此） |
| `isCompleted` | boolean | ✅ | 是否完成 |
| `rpe` | number | | 1–10 |
| `note` | string | | 单组备注 |
| `completedAt` | number | | 完成时间戳（用于平均组间休息） |
| `restSec` | number | | 该组实际组间休息（秒） |

### 3.5 `templates`（计划模板）与 `templateExercises`

| `templates` | 类型 | 必填 |
|---|---|---|
| `id` | number | ✅ |
| `name` | string | ✅ |
| `description` | string | |
| `createdAt` | number | |

| `templateExercises` | 类型 | 必填 |
|---|---|---|
| `id` | number | ✅ |
| `templateId` | number | ✅ → `templates.id` |
| `exerciseId` | number | ✅ → `exercises.id` |
| `order` | number | ✅ |
| `targetSets` | number | ✅ |
| `targetReps` | number | ✅ |
| `targetWeight` | number | ✅ kg |
| `restSec` | number | |

### 3.6 `settings`（应用设置）与 `bodyMeasurements`（身体测量）

| `settings` | 类型 | 必填 |
|---|---|---|
| `key` | string | ✅ |
| `value` | string | ✅ |

`settings` 是**端本地偏好**（单位、主题、计时器开关这类）。跨端导入时是否应用
由导入方决定，见 §6。`bodyMeasurements` 沿用 Web 现有结构（`date` + 可选
`bodyweight`/`bodyfat`/`chest`/`waist`/`hip`/`arm`/`thigh`/`note`）。

## 4. 版本演进

- `schemaVersion` 是**整数且只增**。新增可选字段不升版；重命名、删除字段、
  改变字段语义必须升版。
- 导入方遇到高于自身支持版本的 `schemaVersion`：**拒绝导入**并给出明确提示
  （禁止"尽力而为"——那会静默丢数据）。
- 遇到低于自身版本的输入：按该版本规则解析，必要时在导入器内做字段补全。

## 5. 旧数据取值映射（v1 内必须支持）

### 5.1 肌群

Android 侧是中文自由文本，导入方按「包含」匹配、匹配不到归入 `fullbody`：

| Android 文案 | 规范值 |
|---|---|
| 胸 | `chest` |
| 背 | `back` |
| 肩 | `shoulders` |
| 手臂 | 见 §5.2（需按动作名细分） |
| 核心 / 腹 | `core` |
| 腿 | `legs` |
| 全身 / 其他 | `fullbody` |

### 5.2 「手臂」的细分（唯一的歧义映射）

Android 把肱二头与肱三头合并为「手臂」。导入时按动作名判定：名称含**弯举** →
`biceps`；名称含**臂屈伸/下压/窄距/俯卧撑** → `triceps`；其余归 `biceps`。
判定结果只影响分类展示，不丢数据。

### 5.3 组类型

| Android `type` | 规范值 |
|---|---|
| `WARMUP` | `warmup` |
| `NORMAL` | `normal` |
| `FAILURE` | `failure` |

规范侧的 `superset`/`dropset`/`restpause` 在 Android 无对应值，反向导入时
降级为 `normal`（见 §6）。

### 5.4 器械类型

Android 的 `category` 是中文自由文本，按「包含」匹配：

| Android 文案 | 规范值 |
|---|---|
| 杠铃 | `barbell` |
| 哑铃 | `dumbbell` |
| 器械 | `machine` |
| 自重 | `bodyweight` |
| 壶铃 | `kettlebell` |
| 绳索 | `cable` |
| 其他 / 未匹配 | `other` |

## 6. 已知的语义缺口（导入方向相关的有损点）

这些差异**有意识接受**，导入方必须在结果提示中如实告知用户，不得静默处理：

| 规范字段 | Android 现状 | 处理 |
|---|---|---|
| `sets.rpe` / `sets.note` / `sets.completedAt` / `sets.restSec` | 无对应列 | 导入 Android 时字段丢弃，提示"N 组的 RPE/备注未导入" |
| `workouts.name` / `notes` / `durationSec` | 无对应列 | 导入 Android 时丢弃；`startTime` 足够定位训练 |
| `sets.setType` 的 superset/dropset/restpause | 无对应值 | 降级为 `normal`，提示"组类型已简化" |
| `templates*` | 无模板概念 | 导入 Android 时整块跳过，提示"模板未导入" |
| `bodyMeasurements` | 无对应表 | 导入 Android 时跳过，提示"身体测量未导入" |
| `settings` | 键集不同 | 只应用双方都认识的键（当前为 `unit`），其余忽略 |
| `exercises.image` | 无对应列 | 丢弃 |
| `workouts.endedAt` | 无该字段时视为已完成 | 导入 Android 时 `null` → `endTime = startTime` |

反向（Android → 规范/Web）没有已知有损点。

## 7. 导入器行为要求

1. **验证信封**：`app === "Gymo"`；`schemaVersion` 不高于支持版本。
2. **legacy-android 降级**：若无 `app` 字段但存在 `version: 1` 与 `sessions` 数组，
   按 `producer: "android"`、`schemaVersion: 1` 处理（此时字段按 Android 旧名直读）。
3. **合并语义**：导入为「合并」——不覆盖已有数据，逐行重新分配 id 并重建外键；
   「替换」模式先清空。两种模式都必须在**单个事务**内完成。
4. **有损提示**：按 §6 汇总告知用户具体丢了什么、丢了多少行。
5. **失败即中止**：任何解析错误都回滚事务，不留下半份数据。

## 8. 参考实现

- Web 导出/导入（信封 v1 的原生实现）：`apps/web/src/lib/exportImport.ts`
- Android 导出/导入：`apps/android/app/src/main/java/com/example/gymo/data/BackupManager.kt`
  （当前为 legacy-android 形态，迁移到本规范的工作见 issue #1）

实现与本规范不一致时，以本规范为准，并修正实现。
