import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from './db';
import { exportJSON, importJSON, type BackupFile } from './exportImport';

beforeEach(async () => {
  // 每个用例前清空所有表
  await db.transaction(
    'rw',
    db.tables,
    async () => {
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
    }
  );
});

async function seedExisting() {
  // 已有数据：1 个动作、1 个训练日（含动作实例与组）、1 个模板
  const exId = (await db.exercises.add({
    name: '已有动作',
    muscleGroup: 'chest',
    equipment: 'barbell',
    unit: 'kg',
    isCustom: false,
    createdAt: 1
  })) as number;
  const wId = (await db.workouts.add({ date: 1, name: '已有训练', createdAt: 1 })) as number;
  const weId = (await db.workoutExercises.add({
    workoutId: wId,
    exerciseId: exId,
    order: 0
  })) as number;
  await db.sets.add({
    workoutExerciseId: weId,
    order: 0,
    weight: 50,
    reps: 5,
    setType: 'normal',
    isCompleted: true
  });
  const tId = (await db.templates.add({ name: '已有模板', createdAt: 1 })) as number;
  await db.templateExercises.add({
    templateId: tId,
    exerciseId: exId,
    order: 0,
    targetSets: 3,
    targetReps: 8,
    targetWeight: 60
  });
  await db.bodyMeasurements.add({ date: 1, bodyweight: 70 });
  await db.settings.put({ key: 'unit', value: 'kg' });
  return { exId, wId, weId, tId };
}

function makeBackup(): BackupFile {
  // 一份独立备份：id 从 100 段起，外键指向备份内 id
  return {
    app: 'Gymo',
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      exercises: [{ id: 100, name: '备份动作', muscleGroup: 'back', equipment: 'dumbbell', unit: 'kg', isCustom: true, createdAt: 2 }],
      workouts: [{ id: 200, date: 2, name: '备份训练', createdAt: 2 }],
      workoutExercises: [{ id: 300, workoutId: 200, exerciseId: 100, order: 0 }],
      sets: [{ id: 400, workoutExerciseId: 300, order: 0, weight: 80, reps: 3, setType: 'working', isCompleted: true }],
      templates: [{ id: 500, name: '备份模板', createdAt: 2 }],
      templateExercises: [{ id: 600, templateId: 500, exerciseId: 100, order: 0, targetSets: 4, targetReps: 6, targetWeight: 70 }],
      settings: [{ key: 'defaultRestSec', value: '120' }],
      bodyMeasurements: [{ id: 700, date: 2, bodyweight: 72 }]
    }
  };
}

describe('importJSON merge id 重映射', () => {
  it('合并导入不覆盖已有数据，且导入行获得新自增 id', async () => {
    const existing = await seedExisting();
    const backup = makeBackup();
    await importJSON(JSON.stringify(backup), 'merge');

    // 已有数据仍在
    expect(await db.exercises.get(existing.exId)).toBeTruthy();
    expect(await db.workouts.get(existing.wId)).toBeTruthy();
    expect(await db.templates.get(existing.tId)).toBeTruthy();

    // 导入的动作/训练/模板被新增（不使用源 id 100/200/500）
    expect(await db.exercises.get(100)).toBeUndefined();
    expect(await db.workouts.get(200)).toBeUndefined();
    expect(await db.templates.get(500)).toBeUndefined();

    const allEx = await db.exercises.toArray();
    const allW = await db.workouts.toArray();
    const allT = await db.templates.toArray();
    expect(allEx.length).toBe(2);
    expect(allW.length).toBe(2);
    expect(allT.length).toBe(2);

    const newEx = allEx.find((e) => e.name === '备份动作')!;
    const newW = allW.find((w) => w.name === '备份训练')!;
    const newT = allT.find((t) => t.name === '备份模板')!;
    expect(newEx.id).not.toBe(100);
    expect(newW.id).not.toBe(200);
    expect(newT.id).not.toBe(500);
  });

  it('外键被重建：workoutExercises.workoutId / sets.workoutExerciseId / templateExercises.templateId 指向新 id', async () => {
    await seedExisting();
    await importJSON(JSON.stringify(makeBackup()), 'merge');

    const newW = (await db.workouts.toArray()).find((w) => w.name === '备份训练')!;
    const newEx = (await db.exercises.toArray()).find((e) => e.name === '备份动作')!;
    const newT = (await db.templates.toArray()).find((t) => t.name === '备份模板')!;

    const we = (await db.workoutExercises.toArray()).find((w) => w.workoutId === newW.id && w.exerciseId === newEx.id);
    expect(we).toBeTruthy();
    expect(we!.workoutId).toBe(newW.id);
    expect(we!.exerciseId).toBe(newEx.id);

    const sets = await db.sets.where('workoutExerciseId').equals(we!.id!).toArray();
    expect(sets.length).toBe(1);
    expect(sets[0].weight).toBe(80);
    expect(sets[0].workoutExerciseId).toBe(we!.id);

    const te = (await db.templateExercises.toArray()).find(
      (t) => t.templateId === newT.id && t.exerciseId === newEx.id
    );
    expect(te).toBeTruthy();
    expect(te!.templateId).toBe(newT.id);
    expect(te!.targetWeight).toBe(70);
  });

  it('两次合并导入同一份备份不覆盖、各得新 id，外键各自完整', async () => {
    await seedExisting();
    const b = makeBackup();
    await importJSON(JSON.stringify(b), 'merge');
    await importJSON(JSON.stringify(b), 'merge');

    const exNames = (await db.exercises.toArray()).map((e) => e.name);
    // 已有 + 两份备份动作 = 3 个动作
    expect(exNames.filter((n) => n === '备份动作').length).toBe(2);
    expect(exNames.filter((n) => n === '已有动作').length).toBe(1);

    const ws = (await db.workouts.toArray()).filter((w) => w.name === '备份训练');
    expect(ws.length).toBe(2);
    // 每个 workout 都应有其专属的 workoutExercise 与 set
    for (const w of ws) {
      const we = await db.workoutExercises.where('workoutId').equals(w.id!).toArray();
      expect(we.length).toBe(1);
      const sets = await db.sets.where('workoutExerciseId').equals(we[0].id!).toArray();
      expect(sets.length).toBe(1);
    }
  });

  it('settings 合并为 upsert（同名键覆盖，不同键保留）', async () => {
    await seedExisting(); // 写入 unit=kg
    await importJSON(JSON.stringify(makeBackup()), 'merge'); // 写入 defaultRestSec=120
    const unit = await db.settings.get('unit');
    const rest = await db.settings.get('defaultRestSec');
    expect(unit?.value).toBe('kg');
    expect(rest?.value).toBe('120');
  });
});

describe('exportJSON round-trip', () => {
  it('导出后 replace 导入应还原数据', async () => {
    await seedExisting();
    const text = await exportJSON();
    const json = JSON.parse(text);
    expect(json.app).toBe('Gymo');
    // 清空再 replace 导入
    await db.delete();
    // 重新打开同名库（fake-indexeddb 中 db.delete 后需 reopen）
    db.open();
    await importJSON(text, 'replace');
    const ex = await db.exercises.toArray();
    expect(ex.length).toBe(1);
    expect(ex[0].name).toBe('已有动作');
  });
});