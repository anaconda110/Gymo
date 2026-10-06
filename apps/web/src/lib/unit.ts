// 单位换算与统一语义 —— 纯本地、纯函数，无副作用。
// 1 kg = 2.20462 lb（与业界通用换算系数一致）。
// 显示与存储统一语义：数据库里始终以"当前 settings.unit"为存储单位记录数值，
// 切换单位时在 Dexie 事务内对历史数据做批量换算，保证显示与存储一致、可往返还原。

import type { Unit } from './types';

export const KG_TO_LB = 2.20462;
export const LB_TO_KG = 1 / KG_TO_LB;

export function convertWeight(value: number, from: Unit, to: Unit): number {
  if (from === to || !isFinite(value)) return value;
  return from === 'kg' ? value * KG_TO_LB : value * LB_TO_KG;
}

// 舍入到 2 位小数，避免浮点漂移导致往返不精确（如 100kg -> 220.462 -> 100.0000...）
export function roundWeight(value: number): number {
  if (!isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

export function convertAndRound(value: number, from: Unit, to: Unit): number {
  return roundWeight(convertWeight(value, from, to));
}

// 输入框友好显示：整数不带小数点；否则保留 2 位（去掉尾随 0 由 toFixed 处理后 Number 化）
export function fmtWeight(value: number, _unit: Unit): string {
  if (!isFinite(value) || value === 0) return '0';
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}