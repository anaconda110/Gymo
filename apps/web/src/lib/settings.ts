// 设置 store —— 单位、默认休息时长、主题、1RM 公式、计时器声音/振动。持久化到 IndexedDB settings 表。
// 切换单位时在 Dexie 事务内对历史重量数据做批量换算，保证显示与存储语义统一、可往返还原。
import { writable } from 'svelte/store';
import { db } from './db';
import type { Unit } from './types';
import { convertAndRound } from './unit';
import type { Formula1RM } from './stats';

interface SettingsState {
  unit: Unit;
  defaultRestSec: number;
  theme: 'dark' | 'light';
  formula: Formula1RM;
  timerSound: boolean;
  timerVibrate: boolean;
}

const defaults: SettingsState = {
  unit: 'kg',
  defaultRestSec: 90,
  theme: 'dark',
  formula: 'epley',
  timerSound: true,
  timerVibrate: true
};

function createSettings() {
  const { subscribe, set, update } = writable<SettingsState>(defaults);

  async function load() {
    const rows = await db.settings.toArray();
    const map = new Map(rows.map((r) => [r.key, r.value]));
    const state: SettingsState = {
      unit: (map.get('unit') as Unit) || defaults.unit,
      defaultRestSec: Number(map.get('defaultRestSec') || defaults.defaultRestSec),
      theme: (map.get('theme') as 'dark' | 'light') || defaults.theme,
      formula: (map.get('formula') as Formula1RM) || defaults.formula,
      timerSound: map.get('timerSound') == null ? defaults.timerSound : map.get('timerSound') === '1',
      timerVibrate: map.get('timerVibrate') == null ? defaults.timerVibrate : map.get('timerVibrate') === '1'
    };
    set(state);
    applyTheme(state.theme);
  }

  async function persist(partial: Partial<SettingsState>) {
    update((s) => {
      const next = { ...s, ...partial };
      if (partial.unit) db.settings.put({ key: 'unit', value: partial.unit });
      if (partial.defaultRestSec !== undefined)
        db.settings.put({ key: 'defaultRestSec', value: String(partial.defaultRestSec) });
      if (partial.theme) {
        db.settings.put({ key: 'theme', value: partial.theme });
        applyTheme(partial.theme);
      }
      if (partial.formula) db.settings.put({ key: 'formula', value: partial.formula });
      if (partial.timerSound !== undefined)
        db.settings.put({ key: 'timerSound', value: partial.timerSound ? '1' : '0' });
      if (partial.timerVibrate !== undefined)
        db.settings.put({ key: 'timerVibrate', value: partial.timerVibrate ? '1' : '0' });
      return next;
    });
  }

  // 切换单位：在事务内对 sets.weight / templateExercises.targetWeight / bodyMeasurements.bodyweight 批量换算。
  // 显示与存储统一语义：库内始终以"当前单位"存储；切换即换算全部历史，保证往返还原（100kg <-> 220.46lb）。
  async function changeUnit(next: Unit) {
    const cur = (await readCurrent()).unit;
    if (cur === next) return;
    await db.transaction(
      'rw',
      db.sets,
      db.templateExercises,
      db.bodyMeasurements,
      db.settings,
      async () => {
        // sets.weight
        const sets = await db.sets.toArray();
        if (sets.length) {
          await db.sets.bulkPut(
            sets.map((s) => ({ ...s, weight: convertAndRound(s.weight, cur, next) }))
          );
        }
        // templateExercises.targetWeight
        const tes = await db.templateExercises.toArray();
        if (tes.length) {
          await db.templateExercises.bulkPut(
            tes.map((t) => ({ ...t, targetWeight: convertAndRound(t.targetWeight, cur, next) }))
          );
        }
        // bodyMeasurements.bodyweight
        const bms = await db.bodyMeasurements.toArray();
        if (bms.length) {
          await db.bodyMeasurements.bulkPut(
            bms.map((b) => ({
              ...b,
              bodyweight: b.bodyweight == null ? b.bodyweight : convertAndRound(b.bodyweight, cur, next)
            }))
          );
        }
        await db.settings.put({ key: 'unit', value: next });
      }
    );
    await persist({ unit: next });
  }

  async function readCurrent(): Promise<SettingsState> {
    let snap: SettingsState = defaults;
    const unsub = subscribe((v) => (snap = v));
    unsub();
    return snap;
  }

  return { subscribe, load, set: persist, changeUnit };
}

function applyTheme(theme: 'dark' | 'light') {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

export const settings = createSettings();