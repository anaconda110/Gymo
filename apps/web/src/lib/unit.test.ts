import { describe, it, expect } from 'vitest';
import { convertWeight, convertAndRound, roundWeight, KG_TO_LB, LB_TO_KG } from './unit';

describe('unit 换算', () => {
  it('1kg = 2.20462lb', () => {
    expect(KG_TO_LB).toBeCloseTo(2.20462, 5);
    expect(LB_TO_KG).toBeCloseTo(1 / 2.20462, 5);
  });

  it('同单位不换算', () => {
    expect(convertWeight(100, 'kg', 'kg')).toBe(100);
    expect(convertWeight(100, 'lb', 'lb')).toBe(100);
  });

  it('kg -> lb', () => {
    expect(convertWeight(100, 'kg', 'lb')).toBeCloseTo(220.462, 3);
  });

  it('往返还原：100kg -> lb -> kg 还原 100', () => {
    const lb = convertAndRound(100, 'kg', 'lb');
    expect(lb).toBeCloseTo(220.46, 2);
    const back = convertAndRound(lb, 'lb', 'kg');
    expect(back).toBe(100);
  });

  it('roundWeight 截断到 2 位小数', () => {
    expect(roundWeight(220.46231)).toBe(220.46);
    expect(roundWeight(99.999)).toBe(100);
  });

  it('非有限值返回 0 / 原值', () => {
    expect(roundWeight(NaN)).toBe(0);
    expect(convertWeight(NaN, 'kg', 'lb')).toBe(NaN);
  });
});