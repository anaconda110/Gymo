// 全局组间休息计时器 + Web Audio 本地 beep（不联网） + 训练总时长中途持久化。
import { writable } from 'svelte/store';
import { db } from './db';

interface TimerState {
  active: boolean;
  remaining: number; // 秒
  total: number;
  until: number | null; // 结束时间戳
  label?: string; // P2：超级组流转提示等附加文案
}

const initialState: TimerState = { active: false, remaining: 0, total: 0, until: null, label: undefined };

const { subscribe, set, update } = writable<TimerState>(initialState);
let interval: ReturnType<typeof setInterval> | null = null;

// 声音/振动开关（由 settings 同步设置；默认开）
let soundEnabled = true;
let vibrateEnabled = true;

export function setTimerPrefs(sound: boolean, vibrate: boolean): void {
  soundEnabled = sound;
  vibrateEnabled = vibrate;
}

// Web Audio 本地生成 beep：不加载任何远程资源，纯振荡器合成。
let audioCtx: AudioContext | null = null;
function beep(): void {
  if (!soundEnabled) return;
  try {
    if (typeof window === 'undefined') return;
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return;
    if (!audioCtx) audioCtx = new Ctor();
    const ctx = audioCtx;
    if (ctx.state === 'suspended') void ctx.resume();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.36);
    // 第二声
    const o2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    o2.type = 'sine';
    o2.frequency.value = 1175;
    g2.gain.setValueAtTime(0.0001, ctx.currentTime + 0.18);
    g2.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.2);
    g2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.55);
    o2.connect(g2);
    g2.connect(ctx.destination);
    o2.start(ctx.currentTime + 0.18);
    o2.stop(ctx.currentTime + 0.56);
  } catch {
    /* noop */
  }
}

function vibrate(): void {
  if (!vibrateEnabled) return;
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([200, 80, 200]);
  } catch {
    /* noop */
  }
}

function tick() {
  update((s) => {
    if (!s.active || s.until === null) return s;
    const remaining = Math.max(0, Math.round((s.until - Date.now()) / 1000));
    if (remaining <= 0) {
      stop();
      beep();
      vibrate();
      return { active: false, remaining: 0, total: s.total, until: null, label: undefined };
    }
    return { ...s, remaining };
  });
}

export function startRest(totalSec: number, label?: string): void {
  if (totalSec <= 0) return;
  const until = Date.now() + totalSec * 1000;
  set({ active: true, remaining: totalSec, total: totalSec, until, label });
  if (interval) clearInterval(interval);
  interval = setInterval(tick, 250);
}

export function addRest(sec: number): void {
  update((s) => {
    if (!s.active || s.until === null) return s;
    const until = s.until + sec * 1000;
    const remaining = Math.max(0, Math.round((until - Date.now()) / 1000));
    return { ...s, until, remaining, total: s.total + sec };
  });
}

export function stop(): void {
  if (interval) clearInterval(interval);
  interval = null;
  set({ active: false, remaining: 0, total: 0, until: null, label: undefined });
}

// 训练总时长中途持久化：定时把"进行中训练"的 createdAt（用作起始时间戳）写回，
// 以及标记 running 状态。崩溃/退出后可据此恢复进行中训练。
const RUN_KEY = 'gymo:runningWorkoutId';
const START_KEY = 'gymo:runningWorkoutStart';

export function setRunningWorkout(workoutId: number, startTs: number): void {
  try {
    localStorage.setItem(RUN_KEY, String(workoutId));
    localStorage.setItem(START_KEY, String(startTs));
  } catch {
    /* noop */
  }
}

export function clearRunningWorkout(): void {
  try {
    localStorage.removeItem(RUN_KEY);
    localStorage.removeItem(START_KEY);
  } catch {
    /* noop */
  }
}

export function getRunningWorkout(): { id: number; start: number } | null {
  try {
    const id = localStorage.getItem(RUN_KEY);
    const start = localStorage.getItem(START_KEY);
    if (id && start) return { id: Number(id), start: Number(start) };
  } catch {
    /* noop */
  }
  return null;
}

// 定时持久化进行中训练（每 15s 把 startTime 写入 workout.createdAt 字段，便于恢复时长计算）
let persistI: ReturnType<typeof setInterval> | null = null;
export function startPersisting(workoutId: number, startTs: number): void {
  stopPersisting();
  setRunningWorkout(workoutId, startTs);
  persistI = setInterval(() => {
    void db.workouts.update(workoutId, { createdAt: startTs }).catch(() => {});
  }, 15_000);
}

export function stopPersisting(): void {
  if (persistI) clearInterval(persistI);
  persistI = null;
  clearRunningWorkout();
}

export const restTimer = { subscribe };