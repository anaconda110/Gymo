// 历史查询：按动作查看历史与 PR
import { db } from './db';
import type { WorkoutSet, Exercise, SetType } from './types';
import { best1RM, maxWeight, volumeOf, type Formula1RM } from './stats';

export interface ExerciseHistoryEntry {
  date: number;
  workoutId: number;
  workoutName: string;
  sets: WorkoutSet[];
  topWeight: number;
  top1RM: number;
  volume: number;
}

// 批量查询：一次 toArray 拉全部 workoutExercises / sets / workouts，内存聚合，减少 IndexedDB 往返。
export async function getExerciseHistory(
  exerciseId: number,
  formula: Formula1RM = 'epley'
): Promise<ExerciseHistoryEntry[]> {
  const wexAll = await db.workoutExercises.toArray();
  const wex = wexAll.filter((w) => w.exerciseId === exerciseId && w.id != null);
  if (wex.length === 0) return [];

  const setsAll = await db.sets.toArray();
  const workoutsAll = await db.workouts.toArray();
  const workoutMap = new Map(workoutsAll.filter((w) => w.id != null).map((w) => [w.id!, w]));
  const setsByWe = new Map<number, WorkoutSet[]>();
  for (const s of setsAll) {
    const arr = setsByWe.get(s.workoutExerciseId);
    if (arr) arr.push(s);
    else setsByWe.set(s.workoutExerciseId, [s]);
  }

  const entries: ExerciseHistoryEntry[] = [];
  for (const we of wex) {
    const workout = workoutMap.get(we.workoutId);
    if (!workout || !workout.id) continue;
    const sets = (setsByWe.get(we.id!) ?? []).slice().sort((a, b) => a.order - b.order);
    entries.push({
      date: workout.date,
      workoutId: workout.id,
      workoutName: workout.name,
      sets,
      topWeight: maxWeight(sets),
      top1RM: best1RM(sets, formula),
      volume: volumeOf(sets)
    });
  }
  return entries.sort((a, b) => b.date - a.date);
}

export async function getAllExercisesWithStats(
  formula: Formula1RM = 'epley'
): Promise<
  { exercise: Exercise; pr1RM: number; prWeight: number; totalSets: number }[]
> {
  // 批量：一次拉 sets / workoutExercises，内存聚合，避免每个动作各跑一遍 getExerciseHistory。
  const [exercises, wexAll, setsAll] = await Promise.all([
    db.exercises.toArray(),
    db.workoutExercises.toArray(),
    db.sets.toArray()
  ]);
  const weByExercise = new Map<number, number[]>();
  for (const w of wexAll) {
    if (w.id == null) continue;
    const arr = weByExercise.get(w.exerciseId);
    if (arr) arr.push(w.id);
    else weByExercise.set(w.exerciseId, [w.id]);
  }
  const setsByWe = new Map<number, WorkoutSet[]>();
  for (const s of setsAll) {
    const arr = setsByWe.get(s.workoutExerciseId);
    if (arr) arr.push(s);
    else setsByWe.set(s.workoutExerciseId, [s]);
  }

  const result = [];
  for (const ex of exercises) {
    if (!ex.id) continue;
    const weIds = weByExercise.get(ex.id) ?? [];
    let pr1RM = 0;
    let prWeight = 0;
    let totalSets = 0;
    for (const weId of weIds) {
      const sets = setsByWe.get(weId) ?? [];
      pr1RM = Math.max(pr1RM, best1RM(sets, formula));
      prWeight = Math.max(prWeight, maxWeight(sets));
      totalSets += sets.filter((s) => s.isCompleted).length;
    }
    result.push({ exercise: ex, pr1RM, prWeight, totalSets });
  }
  return result.sort((a, b) => b.pr1RM - a.pr1RM);
}

// 统一一份组类型统计：全量
export function countSetTypes(sets: WorkoutSet[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const s of sets) {
    if (!s.isCompleted) continue;
    const k = s.setType ?? 'normal';
    counts[k] = (counts[k] ?? 0) + 1;
  }
  return counts;
}

// 统计所有历史组按 setType 分组的已完成组数（批量查询）
export async function getSetTypeStats(): Promise<Record<string, number>> {
  const sets = await db.sets.toArray();
  return countSetTypes(sets);
}

// 统计某动作历史组按 setType 分组的已完成组数（批量查询）
export async function getExerciseSetTypeStats(exerciseId: number): Promise<Record<string, number>> {
  const [wexAll, setsAll] = await Promise.all([
    db.workoutExercises.toArray(),
    db.sets.toArray()
  ]);
  const weIds = new Set(wexAll.filter((w) => w.exerciseId === exerciseId && w.id != null).map((w) => w.id!));
  const sets = setsAll.filter((s) => weIds.has(s.workoutExerciseId));
  return countSetTypes(sets);
}

// 趋势数据点：按日期升序的 (date, top1RM, volume)
export interface TrendPoint {
  date: number;
  top1RM: number;
  volume: number;
}

export async function getExerciseTrend(
  exerciseId: number,
  formula: Formula1RM = 'epley'
): Promise<TrendPoint[]> {
  const hist = await getExerciseHistory(exerciseId, formula);
  return hist
    .slice()
    .sort((a, b) => a.date - b.date)
    .map((h) => ({ date: h.date, top1RM: h.top1RM, volume: h.volume }));
}

// 日历/热力图数据：返回按日期字符串(YYYY-MM-DD)聚合的训练量与训练日 id 列表
export interface DayAgg {
  date: string; // YYYY-MM-DD
  ts: number; // 当天 0 点时间戳
  volume: number;
  sets: number;
  workoutIds: number[];
}

export async function getDailyAggregates(): Promise<Map<string, DayAgg>> {
  // 批量：一次拉全部 workouts / workoutExercises / sets，内存聚合。
  const [workouts, wexAll, setsAll] = await Promise.all([
    db.workouts.toArray(),
    db.workoutExercises.toArray(),
    db.sets.toArray()
  ]);
  const wexByWorkout = new Map<number, number[]>();
  for (const w of wexAll) {
    if (w.id == null) continue;
    const arr = wexByWorkout.get(w.workoutId);
    if (arr) arr.push(w.id);
    else wexByWorkout.set(w.workoutId, [w.id]);
  }
  const setsByWe = new Map<number, WorkoutSet[]>();
  for (const s of setsAll) {
    const arr = setsByWe.get(s.workoutExerciseId);
    if (arr) arr.push(s);
    else setsByWe.set(s.workoutExerciseId, [s]);
  }

  const map = new Map<string, DayAgg>();
  for (const w of workouts) {
    if (!w.id) continue;
    const weIds = wexByWorkout.get(w.id) ?? [];
    let vol = 0;
    let sets = 0;
    for (const weId of weIds) {
      const ss = setsByWe.get(weId) ?? [];
      for (const s of ss) {
        if (s.isCompleted) {
          vol += s.weight * s.reps;
          sets += 1;
        }
      }
    }
    const key = ymd(w.date);
    const existing = map.get(key);
    if (existing) {
      existing.volume += vol;
      existing.sets += sets;
      if (!existing.workoutIds.includes(w.id)) existing.workoutIds.push(w.id);
    } else {
      map.set(key, { date: key, ts: midnightTs(w.date), volume: vol, sets, workoutIds: [w.id] });
    }
  }
  return map;
}

function ymd(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function midnightTs(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// 组类型标签辅助（供页面使用，避免重复实现）
export function setTypeStatsRows(
  stats: Record<string, number>,
  labelOf: (t: SetType) => string,
  order: SetType[]
): { type: SetType; label: string; count: number }[] {
  return order
    .map((t) => ({ type: t, label: labelOf(t), count: stats[t] ?? 0 }))
    .filter((r) => r.count > 0);
}

// P2：每个训练日的平均组间休息(秒) —— 由该训练日下所有已完成组的 completedAt 时间戳相邻差值平均。
// 批量加载，内存聚合。返回 Map<workoutId, avgRestSec>。
export async function getWorkoutAvgRest(): Promise<Map<number, number>> {
  const [wexAll, setsAll] = await Promise.all([
    db.workoutExercises.toArray(),
    db.sets.toArray()
  ]);
  const weByWorkout = new Map<number, number[]>();
  for (const w of wexAll) {
    if (w.id == null) continue;
    const arr = weByWorkout.get(w.workoutId);
    if (arr) arr.push(w.id);
    else weByWorkout.set(w.workoutId, [w.id]);
  }
  const tsByWe = new Map<number, number[]>();
  for (const s of setsAll) {
    if (!s.isCompleted || s.completedAt == null) continue;
    const arr = tsByWe.get(s.workoutExerciseId);
    if (arr) arr.push(s.completedAt);
    else tsByWe.set(s.workoutExerciseId, [s.completedAt]);
  }
  const out = new Map<number, number>();
  for (const [workoutId, weIds] of weByWorkout) {
    const allTs: number[] = [];
    for (const weId of weIds) {
      const arr = tsByWe.get(weId);
      if (arr) allTs.push(...arr);
    }
    allTs.sort((a, b) => a - b);
    if (allTs.length < 2) continue;
    let sum = 0;
    let count = 0;
    for (let i = 1; i < allTs.length; i++) {
      const gap = (allTs[i] - allTs[i - 1]) / 1000;
      if (gap > 0 && isFinite(gap)) {
        sum += gap;
        count++;
      }
    }
    if (count > 0) out.set(workoutId, sum / count);
  }
  return out;
}