// Android legacy 备份的翻译与信封校验（规范见 docs/BACKUP-FORMAT.md）
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto'; // 必须在 ./db 之前加载，否则 Dexie 拿不到 indexedDB
import { db } from './db';
import { exportJSON, importJSON, SCHEMA_VERSION } from './exportImport';

beforeEach(async () => {
  // 与 exportImport.test.ts 同一清理方式：清表而非删库
  await db.transaction('rw', db.tables, async () => {
    for (const t of [
      'exercises',
      'workouts',
      'workoutExercises',
      'sets',
      'templates',
      'templateExercises',
      'settings',
      'bodyMeasurements'
    ] as const) {
      await db.table(t).clear();
    }
  });
});

// 一段真实的 Android 原生备份（BackupManager.exportToJson 的形状）
const androidBackup = {
  version: 1,
  exercises: [
    { id: 1, name: '杠铃卧推', targetMuscle: '胸部', category: '杠铃', isCustom: false, isHidden: false },
    { id: 2, name: '杠铃弯举', targetMuscle: '手臂', category: '杠铃', isCustom: false, isHidden: false },
    { id: 3, name: '仰卧杠铃臂屈伸', targetMuscle: '手臂', category: '杠铃', isCustom: false, isHidden: false },
    { id: 4, name: '卷腹', targetMuscle: '核心', category: '自重', isCustom: false, isHidden: false }
  ],
  sessions: [{ id: 10, startTime: 1750000000000, endTime: 1750003600000, note: '状态不错' }],
  workoutExercises: [
    { id: 100, sessionId: 10, exerciseId: 1, orderIndex: 0 },
    { id: 101, sessionId: 10, exerciseId: 2, orderIndex: 1 }
  ],
  sets: [
    { id: 1000, workoutExerciseId: 100, setIndex: 0, weight: 60.0, reps: 8, type: 'NORMAL', isCompleted: true },
    { id: 1001, workoutExerciseId: 100, setIndex: 1, weight: 65.0, reps: 6, type: 'FAILURE', isCompleted: true },
    { id: 1002, workoutExerciseId: 101, setIndex: 0, weight: 30.0, reps: 10, type: 'WARMUP', isCompleted: true }
  ]
};

describe('信封 v1', () => {
  it('导出带 schemaVersion 与 producer=web', async () => {
    const json = JSON.parse(await exportJSON());
    expect(json.app).toBe('Gymo');
    expect(json.schemaVersion).toBe(SCHEMA_VERSION);
    expect(json.producer).toBe('web');
  });

  it('拒绝高于支持版本的输入', async () => {
    const future = JSON.stringify({
      app: 'Gymo',
      schemaVersion: SCHEMA_VERSION + 1,
      exportedAt: new Date().toISOString(),
      data: {}
    });
    await expect(importJSON(future, 'merge')).rejects.toThrow(/高于本版本支持/);
  });

  it('拒绝非 Gymo 文件', async () => {
    await expect(importJSON(JSON.stringify({ foo: 1 }), 'merge')).rejects.toThrow(/不是 Gymo/);
  });
});

describe('Android legacy 备份翻译', () => {
  it('导入后训练日/动作实例/组的外键完整', async () => {
    const res = await importJSON(JSON.stringify(androidBackup), 'merge');
    expect(res.workouts).toBe(1);
    expect(res.sets).toBe(3);

    const workouts = await db.workouts.toArray();
    expect(workouts).toHaveLength(1);
    expect(workouts[0].date).toBe(1750000000000);
    expect(workouts[0].notes).toBe('状态不错');

    const wes = await db.workoutExercises.toArray();
    expect(wes).toHaveLength(2);
    for (const we of wes) {
      expect(await db.exercises.get(we.exerciseId)).toBeTruthy();
      expect(we.workoutId).toBe(workouts[0].id);
    }

    const sets = await db.sets.toArray();
    expect(sets).toHaveLength(3);
    const weIds = new Set(wes.map((w) => w.id));
    for (const s of sets) expect(weIds.has(s.workoutExerciseId)).toBe(true);
  });

  it('字段映射：setIndex→order、type→setType、startTime→date', async () => {
    await importJSON(JSON.stringify(androidBackup), 'merge');
    const sets = await db.sets.toArray();
    // 排序后 order 升序为 [0,0,1]（两条 setIndex=0 分属不同动作实例）
    expect([...sets.map((s) => s.order)].sort((a, b) => a - b)).toEqual([0, 0, 1]);
    // setType 映射：NORMAL→normal、FAILURE→failure、WARMUP→warmup
    expect(new Set(sets.map((s) => s.setType))).toEqual(new Set(['normal', 'failure', 'warmup']));
    const first = sets.find((s) => s.weight === 60)!;
    expect(first.reps).toBe(8);
    expect(first.setType).toBe('normal');
  });

  it('肌群映射：「手臂」按动作名细分二头/三头', async () => {
    await importJSON(JSON.stringify(androidBackup), 'merge');
    const ex = await db.exercises.toArray();
    const byName = Object.fromEntries(ex.map((e) => [e.name, e]));
    expect(byName['杠铃卧推'].muscleGroup).toBe('chest');
    expect(byName['杠铃卧推'].equipment).toBe('barbell');
    expect(byName['卷腹'].muscleGroup).toBe('core');
    expect(byName['卷腹'].equipment).toBe('bodyweight');
    expect(byName['杠铃弯举'].muscleGroup).toBe('biceps');
    expect(byName['仰卧杠铃臂屈伸'].muscleGroup).toBe('triceps');
  });

  it('有损点会产出告警而非静默丢弃', async () => {
    const res = await importJSON(JSON.stringify(androidBackup), 'merge');
    expect(res.warnings.join('')).toMatch(/Android/);
  });

  it('两次导入 Android 备份不冲突且各自外键完整', async () => {
    await importJSON(JSON.stringify(androidBackup), 'merge');
    await importJSON(JSON.stringify(androidBackup), 'merge');
    const workouts = await db.workouts.toArray();
    const wes = await db.workoutExercises.toArray();
    const sets = await db.sets.toArray();
    expect(workouts).toHaveLength(2);
    expect(wes).toHaveLength(4);
    expect(sets).toHaveLength(6);
    const weIds = new Set(wes.map((w) => w.id));
    for (const s of sets) expect(weIds.has(s.workoutExerciseId)).toBe(true);
    // 两次导入的动作字典也不冲突（各自新 id）
    const ex = await db.exercises.toArray();
    expect(ex).toHaveLength(8);
  });

  it('未知字段被忽略（前向兼容）', async () => {
    const withExtra = {
      ...androidBackup,
      futureField: { anything: true },
      sets: androidBackup.sets.map((s) => ({ ...s, futureSetField: 42 }))
    };
    const res = await importJSON(JSON.stringify(withExtra), 'merge');
    expect(res.sets).toBe(3);
  });
});
