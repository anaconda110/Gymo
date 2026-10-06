// Gymo 数据模型 —— 类型定义
// 纯本地 IndexedDB 存储，无后端。

export type Unit = 'kg' | 'lb';

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'legs'
  | 'core'
  | 'fullbody';

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'bodyweight'
  | 'kettlebell'
  | 'cable'
  | 'other';

// 组类型：保留历史 warmup/working/drop/failure，并新增 normal/superset/dropset/restpause
// 新建组默认 'normal'；统计/UI 以此枚举标记。
export type SetType =
  | 'normal'
  | 'superset'
  | 'dropset'
  | 'restpause'
  | 'warmup'
  | 'working'
  | 'drop'
  | 'failure';

// 动作字典表
export interface Exercise {
  id?: number;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  unit: Unit;
  isCustom: boolean;
  notes?: string;
  image?: string; // 本地演示图（base64 data URL，纯本地，无远程资源）
  createdAt: number;
}

// 训练日（顶层记录）
export interface Workout {
  id?: number;
  date: number; // timestamp
  name: string;
  notes?: string;
  durationSec?: number; // 训练总时长
  templateId?: number; // 可选：由模板创建
  createdAt: number;
}

// 训练日中的动作实例（关联 Workout 与 Exercise）
export interface WorkoutExercise {
  id?: number;
  workoutId: number;
  exerciseId: number;
  order: number;
  notes?: string;
  restSec?: number; // 该动作的组间休息
  supersetGroup?: number; // 超级组分组：同 workout 内同组号的动作互为超级组（0/空 表示无）
}

// 组（属于 WorkoutExercise）
export interface WorkoutSet {
  id?: number;
  workoutExerciseId: number;
  order: number;
  weight: number;
  reps: number;
  rpe?: number; // 1-10, 可选
  setType: SetType;
  isCompleted: boolean;
  note?: string;
  completedAt?: number; // 完成该组时的时间戳（P2：用于计算平均组间休息）
  restSec?: number; // 该组实际组间休息(秒)（P2：可选记录，缺省由 completedAt 差值推导）
}

// 训练计划 / 模板（可复用结构）
export interface Template {
  id?: number;
  name: string;
  description?: string;
  createdAt: number;
}

// 模板中的动作
export interface TemplateExercise {
  id?: number;
  templateId: number;
  exerciseId: number;
  order: number;
  targetSets: number;
  targetReps: number;
  targetWeight: number;
  restSec?: number;
}

// 应用设置（键值对）
export interface Setting {
  key: string;
  value: string;
}

// 身体测量（增强）：体重、体脂率、各围度
export interface BodyMeasurement {
  id?: number;
  date: number;
  bodyweight?: number; // 体重
  bodyfat?: number; // 体脂率(%)
  chest?: number; // 胸围
  waist?: number; // 腰围
  hip?: number; // 臀围
  arm?: number; // 上臂围
  thigh?: number; // 大腿围
  note?: string;
}

// 视图聚合：训练日 + 动作 + 组
export interface WorkoutExerciseView extends WorkoutExercise {
  exercise?: Exercise;
  sets: WorkoutSet[];
}
export interface WorkoutView extends Workout {
  exercises: WorkoutExerciseView[];
}