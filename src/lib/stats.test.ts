import { describe, it, expect } from 'vitest';
import { estimate1RM, estimate1RMFromRPE, volumeOf, ESTIMATE_REPS_MAX, type Formula1RM } from './stats';
import type { WorkoutSet } from './types';

describe('estimate1RM 各公式', () => {
  it('reps=1 直接返回重量', () => {
    for (const f of ['epley', 'brzycki', 'lombardi', 'oconner'] as Formula1RM[]) {
      expect(estimate1RM(100, 1, f)).toBe(100);
    }
  });

  it('非正输入返回 0', () => {
    expect(estimate1RM(0, 5)).toBe(0);
    expect(estimate1RM(100, 0)).toBe(0);
    expect(estimate1RM(-10, 5)).toBe(0);
  });

  it('Epley: 1RM = w*(1+r/30)', () => {
    expect(estimate1RM(100, 5, 'epley')).toBeCloseTo(100 * (1 + 5 / 30), 5);
    expect(estimate1RM(80, 8, 'epley')).toBeCloseTo(80 * (1 + 8 / 30), 5);
  });

  it('Brzycki: 1RM = w*36/(37-r)', () => {
    expect(estimate1RM(100, 5, 'brzycki')).toBeCloseTo(100 * (36 / (37 - 5)), 5);
  });

  it('Lombardi: 1RM = w*r^0.10', () => {
    expect(estimate1RM(100, 5, 'lombardi')).toBeCloseTo(100 * Math.pow(5, 0.1), 5);
  });

  it("O'Conner: 1RM = w*(1+r/40)", () => {
    expect(estimate1RM(100, 8, 'oconner')).toBeCloseTo(100 * (1 + 8 / 40), 5);
  });

  it(`reps 超过上限(${ESTIMATE_REPS_MAX})仅返回顶重`, () => {
    expect(estimate1RM(100, 15, 'epley')).toBe(100);
    expect(estimate1RM(100, 20, 'brzycki')).toBe(100);
  });

  it('不同公式 PR 排序应可改变（多公式可切换语义）', () => {
    const w = 100;
    const r = 8;
    const vals = {
      epley: estimate1RM(w, r, 'epley'),
      brzycki: estimate1RM(w, r, 'brzycki'),
      lombardi: estimate1RM(w, r, 'lombardi'),
      oconner: estimate1RM(w, r, 'oconner')
    };
    // 四者互不相等，证明切换公式会改变 PR
    const unique = new Set(Object.values(vals));
    expect(unique.size).toBe(4);
  });
});

describe('estimate1RMFromRPE (RPE 反推)', () => {
  it('RPE=10 时 rir=0，等价于普通估算', () => {
    expect(estimate1RMFromRPE(100, 5, 10, 'epley')).toBeCloseTo(estimate1RM(100, 5, 'epley'), 5);
  });
  it('RPE=8 (rir=2) 应高于 RPE=10', () => {
    expect(estimate1RMFromRPE(100, 5, 8, 'epley')).toBeGreaterThan(estimate1RMFromRPE(100, 5, 10, 'epley'));
  });
  it('RPE 越界被 clamp 到 1-10', () => {
    // rpe=99 -> clamp 10
    expect(estimate1RMFromRPE(100, 5, 99, 'epley')).toBeCloseTo(estimate1RMFromRPE(100, 5, 10, 'epley'), 5);
  });
});

describe('volumeOf', () => {
  const sets: WorkoutSet[] = [
    { id: 1, workoutExerciseId: 1, order: 0, weight: 100, reps: 8, setType: 'normal', isCompleted: true },
    { id: 2, workoutExerciseId: 1, order: 1, weight: 100, reps: 6, setType: 'normal', isCompleted: true },
    { id: 3, workoutExerciseId: 1, order: 2, weight: 100, reps: 0, setType: 'normal', isCompleted: false }
  ];
  it('仅累加已完成组 weight*reps', () => {
    expect(volumeOf(sets)).toBe(100 * 8 + 100 * 6);
  });
  it('空数组返回 0', () => {
    expect(volumeOf([])).toBe(0);
  });
});