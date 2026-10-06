// 统计与派生指标：训练容量、1RM 估算（多公式可切换）、PR
import type { WorkoutSet } from './types';

// 1RM 估算公式枚举
export type Formula1RM = 'epley' | 'brzycki' | 'lombardi' | 'oconner';

export const formulaLabels: Record<Formula1RM, string> = {
  epley: 'Epley',
  brzycki: 'Brzycki',
  lombardi: 'Lombardi',
  oconner: "O'Conner"
};

export const formulaList: Formula1RM[] = ['epley', 'brzycki', 'lombardi', 'oconner'];

// reps 上限：超过该次数不再用公式估算（此时估算误差过大），仅返回顶重本身
export const ESTIMATE_REPS_MAX = 12;

// 各公式 1RM 估算（纯函数）
// - Epley:   1RM = w × (1 + r/30)
// - Brzycki: 1RM = w × 36 / (37 - r)
// - Lombardi:1RM = w × r^0.10
// - O'Conner:1RM = w × (1 + r/40)
export function estimate1RM(
  weight: number,
  reps: number,
  formula: Formula1RM = 'epley'
): number {
  if (weight <= 0 || reps <= 0 || !isFinite(weight) || !isFinite(reps)) return 0;
  if (reps === 1) return weight;
  // 超过上限次数：不再用公式估，仅返回顶重（避免误导）
  if (reps > ESTIMATE_REPS_MAX) return weight;
  switch (formula) {
    case 'brzycki':
      return weight * (36 / (37 - reps));
    case 'lombardi':
      return weight * Math.pow(reps, 0.1);
    case 'oconner':
      return weight * (1 + reps / 40);
    case 'epley':
    default:
      return weight * (1 + reps / 30);
  }
}

// 由 RPE 反推 1RM（基于 RPE 到力竭次数的换算表，Helms 系数）。
// rpeRirMap: RPE 10 -> 0 次保留力竭，9 -> 1，8 -> 2，...，1 -> 9
// 公式：1RM ≈ weight × (1 + (reps + rir) / 30)（沿用 Epley 形式，把"等价力竭次数"代入）
export function estimate1RMFromRPE(
  weight: number,
  reps: number,
  rpe: number,
  formula: Formula1RM = 'epley'
): number {
  if (weight <= 0 || reps <= 0 || !isFinite(rpe)) return 0;
  const rpeClamped = Math.min(10, Math.max(1, rpe));
  const rir = 10 - rpeClamped; // reps in reserve
  return estimate1RM(weight, reps + rir, formula);
}

// 训练容量 = Σ(weight × reps)，仅统计已完成组
export function volumeOf(sets: WorkoutSet[]): number {
  return sets
    .filter((s) => s.isCompleted)
    .reduce((sum, s) => sum + s.weight * s.reps, 0);
}

export function totalReps(sets: WorkoutSet[]): number {
  return sets.filter((s) => s.isCompleted).reduce((sum, s) => s.reps, 0);
}

export function totalSets(sets: WorkoutSet[]): number {
  return sets.filter((s) => s.isCompleted).length;
}

// 该动作历史中最佳的 1RM 估计值（可指定公式）
export function best1RM(sets: WorkoutSet[], formula: Formula1RM = 'epley'): number {
  return sets
    .filter((s) => s.isCompleted && s.weight > 0 && s.reps > 0)
    .reduce((max, s) => {
      const v =
        s.rpe != null && s.rpe > 0
          ? Math.max(estimate1RM(s.weight, s.reps, formula), estimate1RMFromRPE(s.weight, s.reps, s.rpe, formula))
          : estimate1RM(s.weight, s.reps, formula);
      return Math.max(max, v);
    }, 0);
}

// 最大重量
export function maxWeight(sets: WorkoutSet[]): number {
  return sets
    .filter((s) => s.isCompleted && s.weight > 0)
    .reduce((max, s) => Math.max(max, s.weight), 0);
}

// 最大次数（在某重量下）
export function maxRepsAtTopWeight(sets: WorkoutSet[]): { weight: number; reps: number } {
  const completed = sets.filter((s) => s.isCompleted && s.weight > 0);
  if (completed.length === 0) return { weight: 0, reps: 0 };
  const top = completed.reduce((m, s) => (s.weight > m.weight ? s : m), completed[0]);
  return { weight: top.weight, reps: top.reps };
}

export function fmt(n: number, digits = 1): string {
  if (!isFinite(n) || n === 0) return '0';
  return Number.isInteger(n) ? String(n) : n.toFixed(digits);
}