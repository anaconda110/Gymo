// 日期工具 —— 抽取自各页面里重复的本地日期格式化，统一一份。
// 纯函数，无依赖、无副作用、无网络。

// 返回 YYYY-MM-DD（本地时区）
export function ymd(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 当天 0 点时间戳（本地时区）
export function midnightTs(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// <input type="date"> 使用的 YYYY-MM-DD 值
export function dateInputValue(ts: number): string {
  return ymd(ts);
}

// 把 <input type="date"> 的 YYYY-MM-DD 解析为本地 0 点时间戳
export function parseDateInput(v: string): number | null {
  if (!v) return null;
  const ts = new Date(v + 'T00:00:00').getTime();
  return isNaN(ts) ? null : ts;
}

export function dateStr(ts: number): string {
  return new Date(ts).toLocaleDateString();
}

export function dateTimeStr(ts: number): string {
  return new Date(ts).toLocaleString();
}

// 短日期：月/日
export function shortDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// 是否今天
export function isToday(ts: number): boolean {
  return new Date(ts).toDateString() === new Date().toDateString();
}

// 友好的相对日期：今天/昨天/否则本地日期
export function friendlyDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return '今天';
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return '昨天';
  return d.toLocaleDateString();
}