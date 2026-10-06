// 内置常见力量动作库 —— 首次启动时种子化
import { db } from './db';
import type { Exercise, MuscleGroup, Equipment, Unit, SetType } from './types';

const now = Date.now();

const seed: Omit<Exercise, 'id'>[] = [
  // 胸
  { name: '卧推 Bench Press', muscleGroup: 'chest', equipment: 'barbell', unit: 'kg', isCustom: false, createdAt: now },
  { name: '哑铃卧推 Dumbbell Press', muscleGroup: 'chest', equipment: 'dumbbell', unit: 'kg', isCustom: false, createdAt: now },
  { name: '上斜哑铃卧推 Incline DB Press', muscleGroup: 'chest', equipment: 'dumbbell', unit: 'kg', isCustom: false, createdAt: now },
  { name: '双杠臂屈伸 Dips', muscleGroup: 'chest', equipment: 'bodyweight', unit: 'kg', isCustom: false, createdAt: now },
  // 背
  { name: '硬拉 Deadlift', muscleGroup: 'back', equipment: 'barbell', unit: 'kg', isCustom: false, createdAt: now },
  { name: '杠铃划船 Barbell Row', muscleGroup: 'back', equipment: 'barbell', unit: 'kg', isCustom: false, createdAt: now },
  { name: '引体向上 Pull-up', muscleGroup: 'back', equipment: 'bodyweight', unit: 'kg', isCustom: false, createdAt: now },
  { name: '高位下拉 Lat Pulldown', muscleGroup: 'back', equipment: 'cable', unit: 'kg', isCustom: false, createdAt: now },
  // 肩
  { name: '推举 Overhead Press', muscleGroup: 'shoulders', equipment: 'barbell', unit: 'kg', isCustom: false, createdAt: now },
  { name: '哑铃推举 DB Shoulder Press', muscleGroup: 'shoulders', equipment: 'dumbbell', unit: 'kg', isCustom: false, createdAt: now },
  { name: '侧平举 Lateral Raise', muscleGroup: 'shoulders', equipment: 'dumbbell', unit: 'kg', isCustom: false, createdAt: now },
  // 手臂
  { name: '杠铃弯举 Barbell Curl', muscleGroup: 'biceps', equipment: 'barbell', unit: 'kg', isCustom: false, createdAt: now },
  { name: '哑铃弯举 Dumbbell Curl', muscleGroup: 'biceps', equipment: 'dumbbell', unit: 'kg', isCustom: false, createdAt: now },
  { name: '臂屈伸 Triceps Pushdown', muscleGroup: 'triceps', equipment: 'cable', unit: 'kg', isCustom: false, createdAt: now },
  { name: '窄距卧推 Close-grip Bench', muscleGroup: 'triceps', equipment: 'barbell', unit: 'kg', isCustom: false, createdAt: now },
  // 腿
  { name: '深蹲 Squat', muscleGroup: 'legs', equipment: 'barbell', unit: 'kg', isCustom: false, createdAt: now },
  { name: '罗马尼亚硬拉 RDL', muscleGroup: 'legs', equipment: 'barbell', unit: 'kg', isCustom: false, createdAt: now },
  { name: '腿举 Leg Press', muscleGroup: 'legs', equipment: 'machine', unit: 'kg', isCustom: false, createdAt: now },
  { name: '保加利亚分腿蹲 Bulgarian Split Squat', muscleGroup: 'legs', equipment: 'dumbbell', unit: 'kg', isCustom: false, createdAt: now },
  // 核心
  { name: '平板支撑 Plank', muscleGroup: 'core', equipment: 'bodyweight', unit: 'kg', isCustom: false, createdAt: now },
  { name: '悬垂举腿 Hanging Leg Raise', muscleGroup: 'core', equipment: 'bodyweight', unit: 'kg', isCustom: false, createdAt: now }
];

const defaultSettings: { key: string; value: string }[] = [
  { key: 'unit', value: 'kg' },
  { key: 'defaultRestSec', value: '90' },
  { key: 'theme', value: 'dark' }
];

export async function seedIfEmpty(): Promise<void> {
  const count = await db.exercises.count();
  if (count === 0) {
    await db.exercises.bulkAdd(seed as Exercise[]);
  }
  for (const s of defaultSettings) {
    const existing = await db.settings.get(s.key);
    if (!existing) await db.settings.put(s);
  }
}

// 中文标签（用于显示）
export const muscleGroupLabel: Record<MuscleGroup, string> = {
  chest: '胸部',
  back: '背部',
  shoulders: '肩部',
  biceps: '肱二头肌',
  triceps: '肱三头肌',
  legs: '腿部',
  core: '核心',
  fullbody: '全身'
};

export const equipmentLabel: Record<Equipment, string> = {
  barbell: '杠铃',
  dumbbell: '哑铃',
  machine: '器械',
  bodyweight: '自重',
  kettlebell: '壶铃',
  cable: '绳索',
  other: '其他'
};

export const muscleGroups: MuscleGroup[] = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'core', 'fullbody'
];
export const equipments: Equipment[] = [
  'barbell', 'dumbbell', 'machine', 'bodyweight', 'kettlebell', 'cable', 'other'
];

export function unitLabel(u: Unit): string {
  return u === 'kg' ? 'kg' : 'lb';
}

// 组类型标签（中文名 + 简码）
export const setTypeLabel: Record<SetType, string> = {
  normal: '常规',
  superset: '超级组',
  dropset: '递减组',
  restpause: '休息暂停',
  warmup: '热身',
  working: '工作',
  drop: '递减',
  failure: '力竭'
};

export const setTypeShort: Record<SetType, string> = {
  normal: 'N',
  superset: 'SS',
  dropset: 'DS',
  restpause: 'RP',
  warmup: 'W',
  working: 'W',
  drop: 'D',
  failure: 'F'
};

// 组类型选择器使用的可选值：常规 / 超级组 / 递减组 / 休息暂停 / 热身 / 力竭。
// 'working'/'drop' 保留为历史兼容类型，下拉不再默认提供（已由 working/dropset 覆盖语义）。
export const setTypeOptions: SetType[] = [
  'normal',
  'superset',
  'dropset',
  'restpause',
  'warmup',
  'failure'
];

// 历史展示用全量类型（含兼容旧类型）
export const allSetTypes: SetType[] = [
  ...setTypeOptions,
  'working',
  'drop'
];