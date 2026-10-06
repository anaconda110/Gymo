import { describe, it, expect } from 'vitest';
import {
  suggestNextGoal,
  prMilestones,
  downsampleTrend,
  downsamplePoints,
  weeklyAggregates,
  monthlyAggregates,
  averageRestFromTimestamps,
  averageRestOfSets,
  bodyweightAtDate,
  relativeIntensityTrend
} from './p2';
import type { ExerciseHistoryEntry, DayAgg } from './history';
import type { TrendPoint } from './history';

function entry(date: number, sets: { weight: number; reps: number; isCompleted?: boolean }[]): ExerciseHistoryEntry {
  return {
    date,
    workoutId: 1,
    workoutName: 'w',
    sets: sets.map((s, i) => ({
      id: i,
      workoutExerciseId: 1,
      order: i,
      weight: s.weight,
      reps: s.reps,
      setType: 'normal',
      isCompleted: s.isCompleted ?? true
    })),
    topWeight: Math.max(...sets.map((s) => s.weight)),
    top1RM: Math.max(...sets.map((s) => s.weight * (1 + s.reps / 30))),
    volume: sets.reduce((sum, s) => sum + s.weight * s.reps, 0)
  };
}

describe('suggestNextGoal', () => {
  it('空历史返回 null', () => {
    expect(suggestNextGoal([])).toBeNull();
  });

  it('达标(次数>=5)线性递增 +step', () => {
    const hist = [entry(1000, [{ weight: 100, reps: 5 }])];
    const g = suggestNextGoal(hist, 2.5);
    expect(g).not.toBeNull();
    expect(g!.weight).toBe(102.5);
    expect(g!.reps).toBe(5);
    expect(g!.reason).toContain('递增');
  });

  it('未达标(<5次)保持重量', () => {
    const hist = [entry(1000, [{ weight: 100, reps: 3 }])];
    const g = suggestNextGoal(hist, 2.5);
    expect(g!.weight).toBe(100);
    expect(g!.reason).toContain('保持');
  });

  it('取最近一次（按日期），而非历史首条', () => {
    const hist = [
      entry(1000, [{ weight: 80, reps: 8 }]),
      entry(2000, [{ weight: 90, reps: 3 }]) // 最近，未达标
    ];
    const g = suggestNextGoal(hist, 2.5);
    expect(g!.weight).toBe(90);
  });

  it('忽略进行中/空训练日（无已完成有效组）', () => {
    const hist = [
      entry(1000, [{ weight: 100, reps: 8 }]), // 已完成实绩
      entry(2000, [{ weight: 0, reps: 0, isCompleted: false }]) // 进行中空训练日
    ];
    const g = suggestNextGoal(hist, 2.5);
    expect(g).not.toBeNull();
    expect(g!.weight).toBe(102.5); // 基于 100×8 递增
  });
});

describe('prMilestones', () => {
  it('记录每次打破历史最大值', () => {
    const hist = [
      entry(1000, [{ weight: 100, reps: 5 }]), // 顶重100, 容量500
      entry(2000, [{ weight: 90, reps: 8 }]), // 顶重90<100 不破；1RM=90*1.267=114>116? no. 容量720>500 破容量
      entry(3000, [{ weight: 110, reps: 3 }]) // 顶重110破
    ];
    const ms = prMilestones(hist);
    // 第一条三个维度都破
    expect(ms.length).toBeGreaterThanOrEqual(3);
    expect(ms.some((m) => m.kind === 'maxWeight' && m.value === 100)).toBeTruthy();
    expect(ms.some((m) => m.kind === 'maxWeight' && m.value === 110)).toBeTruthy();
    expect(ms.some((m) => m.kind === 'maxVolume' && m.value === 720)).toBeTruthy();
  });

  it('空历史返回空', () => {
    expect(prMilestones([])).toEqual([]);
  });
});

describe('downsampleTrend / downsamplePoints', () => {
  it('点数<=max 原样返回副本', () => {
    const pts: TrendPoint[] = [{ date: 1, top1RM: 10, volume: 100 }];
    expect(downsampleTrend(pts, 60)).toHaveLength(1);
  });

  it('超过 max 时降到 <=max 且保留首末与极值', () => {
    const pts: TrendPoint[] = Array.from({ length: 200 }, (_, i) => ({
      date: i,
      top1RM: i === 150 ? 999 : i, // 极大在 150
      volume: i
    }));
    const out = downsampleTrend(pts, 60);
    expect(out.length).toBeLessThanOrEqual(60);
    expect(out.length).toBeGreaterThanOrEqual(4);
    // 首末保留
    expect(out[0].date).toBe(0);
    expect(out[out.length - 1].date).toBe(199);
    // 极值保留
    expect(out.some((p) => p.top1RM === 999)).toBeTruthy();
  });

  it('downsamplePoints 保留 y 极值', () => {
    const pts = Array.from({ length: 100 }, (_, i) => ({ x: i, y: i === 50 ? 500 : i }));
    const out = downsamplePoints(pts, 30);
    expect(out.length).toBeLessThanOrEqual(30);
    expect(out.some((p) => p.y === 500)).toBeTruthy();
    expect(out[0].x).toBe(0);
    expect(out[out.length - 1].x).toBe(99);
  });
});

function dayAgg(key: string, ts: number, volume: number, sessions = 1): DayAgg {
  return { date: key, ts, volume, sets: 1, workoutIds: [ts] };
}

describe('weeklyAggregates / monthlyAggregates', () => {
  it('按周聚合（周一起）', () => {
    // 2024-01-01 周一 ts
    const mon = new Date(2024, 0, 1).getTime();
    const wed = new Date(2024, 0, 3).getTime();
    const nextMon = new Date(2024, 0, 8).getTime();
    const map = new Map<string, DayAgg>([
      ['2024-01-01', dayAgg('2024-01-01', mon, 100)],
      ['2024-01-03', dayAgg('2024-01-03', wed, 200)],
      ['2024-01-08', dayAgg('2024-01-08', nextMon, 50)]
    ]);
    const w = weeklyAggregates(map);
    expect(w.length).toBe(2);
    const first = w.find((x) => x.ts === mon);
    expect(first!.volume).toBe(300);
    expect(first!.sessions).toBe(2);
  });

  it('按月聚合', () => {
    const jan1 = new Date(2024, 0, 1).getTime();
    const jan15 = new Date(2024, 0, 15).getTime();
    const feb1 = new Date(2024, 1, 1).getTime();
    const map = new Map<string, DayAgg>([
      ['2024-01-01', dayAgg('2024-01-01', jan1, 100)],
      ['2024-01-15', dayAgg('2024-01-15', jan15, 200)],
      ['2024-02-01', dayAgg('2024-02-01', feb1, 50)]
    ]);
    const m = monthlyAggregates(map);
    expect(m.length).toBe(2);
    expect(m.find((x) => x.key === '2024-01')!.volume).toBe(300);
    expect(m.find((x) => x.key === '2024-02')!.volume).toBe(50);
  });
});

describe('averageRest', () => {
  it('相邻时间戳差值平均', () => {
    const ts = [1000, 61000, 121000]; // 间隔各 60s
    expect(averageRestFromTimestamps(ts)).toBeCloseTo(60, 1);
  });
  it('不足两点返回 0', () => {
    expect(averageRestFromTimestamps([1000])).toBe(0);
    expect(averageRestFromTimestamps([])).toBe(0);
  });
  it('由 sets 计算（仅含 completedAt 的已完成组）', () => {
    const sets = [
      { isCompleted: true, completedAt: 1000 },
      { isCompleted: true, completedAt: 70000 },
      { isCompleted: false } as any
    ];
    expect(averageRestOfSets(sets)).toBeCloseTo(69, 0);
  });
});

describe('relativeIntensity', () => {
  it('bodyweightAtDate 取 <= 日期的最近一条', () => {
    const bw = [
      { date: 1000, bodyweight: 70 },
      { date: 3000, bodyweight: 72 }
    ];
    expect(bodyweightAtDate(bw, 2000)).toBe(70);
    expect(bodyweightAtDate(bw, 4000)).toBe(72);
    expect(bodyweightAtDate(bw, 500)).toBe(70); // 全部晚于 ts 取最早
  });
  it('relativeIntensityTrend 除以体重，缺失体重的点丢弃', () => {
    const trend: TrendPoint[] = [
      { date: 2000, top1RM: 100, volume: 100 },
      { date: 5000, top1RM: 120, volume: 200 }
    ];
    const bw = [{ date: 1000, bodyweight: 80 }];
    const out = relativeIntensityTrend(trend, bw);
    expect(out.length).toBe(2);
    expect(out[0].top1RM).toBeCloseTo(100 / 80, 4);
    expect(out[1].top1RM).toBeCloseTo(120 / 80, 4);
  });
  it('无体重数据返回空', () => {
    const trend: TrendPoint[] = [{ date: 2000, top1RM: 100, volume: 100 }];
    expect(relativeIntensityTrend(trend, [])).toEqual([]);
  });
});