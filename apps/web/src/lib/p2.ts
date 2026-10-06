// P2「记录+统计增强」纯函数集合：下次目标建议、PR 里程碑、趋势降采样、周/月聚合、平均休息、相对强度。
// 全部为纯函数（无 IO、无网络、无副作用），便于 vitest 单测。
import type { ExerciseHistoryEntry, TrendPoint, DayAgg } from './history';

// ---------- 1) 下次目标建议 ----------
// 线性递增策略：取最近一次训练中「顶重×对应最高次数」或最后一组完成组；
// 若该次顶重组完成了目标次数（>= 上次同重量次数 / 达到 reps 阈值）则重量 +step，次数保持；
// 否则保持重量、次数保持（或微降）。step 默认 2.5kg，单位由调用方约定（kg 用 2.5，lb 用 5）。
export interface NextGoal {
  weight: number;
  reps: number;
  reason: string;
}

// repsAchieved: 该次训练中顶重组的次数；targetReps: 期望次数（默认取该顶重组次数本身，意为「能做完就加」）
// 这里采用更实用的策略：若上一训练最后一组完成且次数 >= 5（视为轻松/达标），则加重量；
// 否则保持。并提供 step。
export function suggestNextGoal(
  history: ExerciseHistoryEntry[],
  step = 2.5
): NextGoal | null {
  if (!history.length) return null;
  // 仅取「有已完成有效组」的训练日，排除进行中/空训练日；按日期升序取最近一次实际表现。
  const sorted = history
    .slice()
    .filter((h) => h.sets.some((s) => s.isCompleted && s.weight > 0 && s.reps > 0))
    .sort((a, b) => a.date - b.date);
  if (sorted.length === 0) return null;
  const last = sorted[sorted.length - 1];
  const completed = last.sets.filter((s) => s.isCompleted && s.weight > 0 && s.reps > 0);
  if (completed.length === 0) return null;
  // 顶重组：重量最大；同重量取次数最大
  const top = completed.reduce((m, s) => {
    if (s.weight > m.weight) return s;
    if (s.weight === m.weight && s.reps > m.reps) return s;
    return m;
  }, completed[0]);
  // 是否达标：次数 >= 5 视为可加重（保守线性递增）
  const reached = top.reps >= 5;
  if (reached) {
    const nextW = roundWeight(top.weight + step);
    return {
      weight: nextW,
      reps: top.reps,
      reason: `上次顶重 ${top.weight}×${top.reps} 达标，线性递增 +${step}，次数保持 ${top.reps}`
    };
  }
  // 未达标：保持重量，次数取上次值（巩固）
  return {
    weight: top.weight,
    reps: top.reps,
    reason: `上次顶重 ${top.weight}×${top.reps} 未达 5 次，建议保持重量巩固`
  };
}

function roundWeight(w: number): number {
  return Math.round(w * 100) / 100;
}

// ---------- 2) PR 里程碑时间线 ----------
export type PRKind = 'maxWeight' | 'est1RM' | 'maxVolume';
export interface PRMilestone {
  date: number;
  kind: PRKind;
  value: number;
  label: string;
}

// 遍历历史（按日期升序），记录每次「打破历史最大值」的时刻。
export function prMilestones(history: ExerciseHistoryEntry[]): PRMilestone[] {
  const sorted = history.slice().sort((a, b) => a.date - b.date);
  let mw = 0;
  let m1 = 0;
  let mv = 0;
  const out: PRMilestone[] = [];
  for (const h of sorted) {
    if (h.topWeight > mw) {
      mw = h.topWeight;
      out.push({ date: h.date, kind: 'maxWeight', value: h.topWeight, label: '最大重量' });
    }
    if (h.top1RM > m1) {
      m1 = h.top1RM;
      out.push({ date: h.date, kind: 'est1RM', value: h.top1RM, label: '估计1RM' });
    }
    if (h.volume > mv) {
      mv = h.volume;
      out.push({ date: h.date, kind: 'maxVolume', value: h.volume, label: '最大容量' });
    }
  }
  return out;
}

// ---------- 3) 趋势降采样 ----------
// 点数超过 max 时降采样：强制保留首、末、以及极值点（最大/最小 top1RM），
// 其余按等距抽样填补，最终点数 <= max（避免 SVG 节点爆炸）。
function pickIndices(n: number, max: number, must: number[]): number[] {
  const keep = new Set<number>();
  for (const i of must) if (i >= 0 && i < n) keep.add(i);
  if (keep.size < max) {
    const seen = new Set(keep);
    const step = (n - 1) / (max - 1);
    for (let k = 0; k < max && keep.size < max; k++) {
      const idx = Math.round(k * step);
      if (idx >= 0 && idx < n && !seen.has(idx)) {
        keep.add(idx);
        seen.add(idx);
      }
    }
    // 仍不足则顺序补齐（极端情况）
    for (let i = 0; i < n && keep.size < max; i++) {
      if (!seen.has(i)) {
        keep.add(i);
        seen.add(i);
      }
    }
  }
  return Array.from(keep).sort((a, b) => a - b);
}

export function downsampleTrend<T extends TrendPoint>(points: T[], max = 60): T[] {
  if (points.length <= max) return points.slice();
  const n = points.length;
  let maxIdx = 0;
  let minIdx = 0;
  for (let i = 1; i < n; i++) {
    if (points[i].top1RM > points[maxIdx].top1RM) maxIdx = i;
    if (points[i].top1RM < points[minIdx].top1RM) minIdx = i;
  }
  return pickIndices(n, max, [0, n - 1, maxIdx, minIdx]).map((i) => points[i]);
}

// 通用降采样：对任意带 x 的点序列，按等距抽样并保留首末与 y 极值，点数 <= max。
export function downsamplePoints<T extends { x: number; y: number }>(
  points: T[],
  max = 60
): T[] {
  if (points.length <= max) return points.slice();
  const n = points.length;
  let maxIdx = 0;
  let minIdx = 0;
  for (let i = 1; i < n; i++) {
    if (points[i].y > points[maxIdx].y) maxIdx = i;
    if (points[i].y < points[minIdx].y) minIdx = i;
  }
  return pickIndices(n, max, [0, n - 1, maxIdx, minIdx]).map((i) => points[i]);
}

// ---------- 4) 周/月聚合 ----------
export interface PeriodAgg {
  key: string; // 周一日期(YYYY-MM-DD) 或月份(YYYY-MM)
  label: string;
  volume: number;
  sets: number;
  sessions: number; // 训练日数
  ts: number; // 该周期起始时间戳
}

// ISO 周一作为周起点（本地时区）。返回该日 0 点时间戳。
function weekStartTs(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  let dow = d.getDay(); // 0=Sun
  if (dow === 0) dow = 7;
  d.setDate(d.getDate() - (dow - 1));
  return d.getTime();
}

function ymdLocal(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function monthKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function weeklyAggregates(dayMap: Map<string, DayAgg>): PeriodAgg[] {
  const map = new Map<number, PeriodAgg>();
  for (const agg of dayMap.values()) {
    const ws = weekStartTs(agg.ts);
    const key = ymdLocal(ws);
    const ex = map.get(ws);
    if (ex) {
      ex.volume += agg.volume;
      ex.sets += agg.sets;
      ex.sessions += agg.workoutIds.length;
    } else {
      map.set(ws, {
        key,
        label: ymdLocal(ws),
        volume: agg.volume,
        sets: agg.sets,
        sessions: agg.workoutIds.length,
        ts: ws
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.ts - b.ts);
}

export function monthlyAggregates(dayMap: Map<string, DayAgg>): PeriodAgg[] {
  const map = new Map<string, PeriodAgg>();
  for (const agg of dayMap.values()) {
    const mk = monthKey(agg.ts);
    const ex = map.get(mk);
    if (ex) {
      ex.volume += agg.volume;
      ex.sets += agg.sets;
      ex.sessions += agg.workoutIds.length;
    } else {
      const d = new Date(agg.ts);
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      map.set(mk, {
        key: mk,
        label: mk,
        volume: agg.volume,
        sets: agg.sets,
        sessions: agg.workoutIds.length,
        ts: d.getTime()
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.ts - b.ts);
}

// ---------- 5) 平均休息时长 ----------
// 给定一组「完成时间戳」（升序），计算相邻差值的平均（秒）。
export function averageRestFromTimestamps(timestamps: number[]): number {
  const ts = timestamps.slice().sort((a, b) => a - b);
  if (ts.length < 2) return 0;
  let sum = 0;
  let count = 0;
  for (let i = 1; i < ts.length; i++) {
    const gap = (ts[i] - ts[i - 1]) / 1000;
    if (gap > 0 && isFinite(gap)) {
      sum += gap;
      count++;
    }
  }
  return count === 0 ? 0 : sum / count;
}

// 由一组 WorkoutSet（已完成，含 completedAt）计算平均组间休息。
export function averageRestOfSets(sets: { isCompleted: boolean; completedAt?: number }[]): number {
  const ts = sets
    .filter((s) => s.isCompleted && s.completedAt != null)
    .map((s) => s.completedAt as number);
  return averageRestFromTimestamps(ts);
}

// ---------- 6) 相对强度（重量 / 体重） ----------
// 在某时间点附近的体重（取 <= 该时间点的最近一条；若无则取下一条；都没有返回 null）。
export function bodyweightAtDate(
  bodyweights: { date: number; bodyweight: number }[],
  ts: number
): number | null {
  if (bodyweights.length === 0) return null;
  const sorted = bodyweights.slice().sort((a, b) => a.date - b.date);
  let prev: number | null = null;
  for (const b of sorted) {
    if (b.date <= ts) prev = b.bodyweight;
    else break;
  }
  if (prev != null) return prev;
  // 全部都晚于 ts：取最早一条
  return sorted[0].bodyweight;
}

// 把趋势点中的 top1RM 转换为相对强度（top1RM / 体重）。体重缺失的点丢弃。
export function relativeIntensityTrend(
  trend: TrendPoint[],
  bodyweights: { date: number; bodyweight: number }[]
): TrendPoint[] {
  const out: TrendPoint[] = [];
  for (const p of trend) {
    const bw = bodyweightAtDate(bodyweights, p.date);
    if (bw == null || bw <= 0) continue;
    out.push({ date: p.date, top1RM: p.top1RM / bw, volume: p.volume });
  }
  return out;
}

// 体重曲线点（按日期升序），供趋势图叠加次轴。
export function bodyweightTrend(
  bodyweights: { date: number; bodyweight: number }[]
): { x: number; y: number }[] {
  return bodyweights
    .slice()
    .sort((a, b) => a.date - b.date)
    .map((b) => ({ x: b.date, y: b.bodyweight }));
}