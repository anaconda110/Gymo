// Dexie schema 迁移测试：用 fake-indexeddb 造出旧版本的库，再触发升级。
//
// 这层此前完全没有覆盖——迁移写错会静默丢数据，而 Web 端的库是用户的唯一副本。
// 做法：绕开应用的单例 db，手工用 Dexie 建 v1 库写入旧格式行，关闭后用同一个
// 名字 + 应用的 upgrade 逻辑重开，断言旧数据被补齐而非丢失。
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto'; // 必须在 dexie 之前：Dexie 在模块初始化时读取全局 indexedDB
import Dexie from 'dexie';

const DB_NAME = 'migration-test-db';

// v1 schema：与 apps/web/src/lib/db.ts 的 version(1) 完全一致
const V1_STORES = {
  exercises: '++id, name, muscleGroup, equipment, isCustom',
  workouts: '++id, date, templateId, createdAt',
  workoutExercises: '++id, workoutId, exerciseId, order',
  sets: '++id, workoutExerciseId, order, isCompleted',
  templates: '++id, name, createdAt',
  templateExercises: '++id, templateId, exerciseId, order',
  settings: 'key, value',
  bodyMeasurements: '++id, date'
};

// v2 schema：与 db.ts 的 version(2) 一致
const V2_STORES = {
  exercises: '++id, name, muscleGroup, equipment, isCustom',
  workouts: '++id, date, templateId, createdAt, durationSec',
  workoutExercises: '++id, workoutId, exerciseId, order, supersetGroup',
  sets: '++id, workoutExerciseId, order, isCompleted, setType',
  templates: '++id, name, createdAt',
  templateExercises: '++id, templateId, exerciseId, order',
  settings: 'key',
  bodyMeasurements: '++id, date'
};

beforeEach(async () => {
  await Dexie.delete(DB_NAME);
});

describe('Dexie v1 -> v2 迁移', () => {
  it('旧 sets 行被补上 setType=normal，且原有数据不丢', async () => {
    // 1) 造一个 v1 库，写入缺 setType 的旧数据
    const v1 = new Dexie(DB_NAME);
    v1.version(1).stores(V1_STORES);
    await v1.open();
    await v1.table('exercises').add({
      name: '卧推',
      muscleGroup: 'chest',
      equipment: 'barbell',
      unit: 'kg',
      isCustom: false,
      createdAt: 1
    });
    await v1.table('workouts').add({ date: 1000, name: '旧训练日', createdAt: 1000 });
    await v1.table('workoutExercises').add({ workoutId: 1, exerciseId: 1, order: 0 });
    const oldSetId = await v1.table('sets').add({
      workoutExerciseId: 1,
      order: 0,
      weight: 60,
      reps: 8,
      isCompleted: true
      // 注意：没有 setType —— v1 时代还没有这个字段
    });
    v1.close();

    // 2) 用 v2 + 与 db.ts 相同的 upgrade 逻辑重开
    const v2 = new Dexie(DB_NAME);
    v2.version(1).stores(V1_STORES);
    v2.version(2)
      .stores(V2_STORES)
      .upgrade((tx) =>
        tx
          .table('sets')
          .toCollection()
          .modify((s: { setType?: string }) => {
            if (s.setType == null) s.setType = 'normal';
          })
      );
    await v2.open();

    // 3) 断言：旧数据仍在，且字段被补齐
    const sets = await v2.table('sets').toArray();
    expect(sets).toHaveLength(1);
    expect(sets[0].id).toBe(oldSetId);
    expect(sets[0].weight).toBe(60);
    expect(sets[0].reps).toBe(8);
    expect(sets[0].setType).toBe('normal');

    const exercises = await v2.table('exercises').toArray();
    expect(exercises).toHaveLength(1);
    expect(exercises[0].name).toBe('卧推');

    // 4) 新索引可用（v2 新增的 setType 能查询）
    const byType = await v2.table('sets').where('setType').equals('normal').toArray();
    expect(byType).toHaveLength(1);

    v2.close();
  });

  it('v2 新增索引 supersetGroup / durationSec 可查询', async () => {
    const v2 = new Dexie(DB_NAME);
    v2.version(1).stores(V1_STORES);
    v2.version(2).stores(V2_STORES);
    await v2.open();

    await v2.table('workouts').add({ date: 1, name: 'w', createdAt: 1, durationSec: 3600 });
    await v2.table('workoutExercises').add({
      workoutId: 1,
      exerciseId: 1,
      order: 0,
      supersetGroup: 2
    });

    expect(await v2.table('workouts').where('durationSec').equals(3600).toArray()).toHaveLength(1);
    expect(
      await v2.table('workoutExercises').where('supersetGroup').equals(2).toArray()
    ).toHaveLength(1);

    v2.close();
  });

  it('已带 setType 的行不被迁移改写', async () => {
    const v1 = new Dexie(DB_NAME);
    v1.version(1).stores(V1_STORES);
    await v1.open();
    await v1.table('sets').add({
      workoutExerciseId: 1,
      order: 0,
      weight: 80,
      reps: 5,
      isCompleted: true,
      setType: 'failure'
    });
    v1.close();

    const v2 = new Dexie(DB_NAME);
    v2.version(1).stores(V1_STORES);
    v2.version(2)
      .stores(V2_STORES)
      .upgrade((tx) =>
        tx
          .table('sets')
          .toCollection()
          .modify((s: { setType?: string }) => {
            if (s.setType == null) s.setType = 'normal';
          })
      );
    await v2.open();

    const sets = await v2.table('sets').toArray();
    expect(sets[0].setType).toBe('failure');

    v2.close();
  });
});
