// Dexie.js 数据库定义 —— Gymo 的纯本地存储层
import Dexie, { type Table } from 'dexie';
import type {
  Exercise,
  Workout,
  WorkoutExercise,
  WorkoutSet,
  Template,
  TemplateExercise,
  Setting,
  BodyMeasurement
} from './types';

export class GymoDB extends Dexie {
  exercises!: Table<Exercise, number>;
  workouts!: Table<Workout, number>;
  workoutExercises!: Table<WorkoutExercise, number>;
  sets!: Table<WorkoutSet, number>;
  templates!: Table<Template, number>;
  templateExercises!: Table<TemplateExercise, number>;
  settings!: Table<Setting, string>;
  bodyMeasurements!: Table<BodyMeasurement, number>;

  constructor() {
    super('gymo-db');
    // v1：初始 schema
    this.version(1).stores({
      exercises: '++id, name, muscleGroup, equipment, isCustom',
      workouts: '++id, date, templateId, createdAt',
      workoutExercises: '++id, workoutId, exerciseId, order',
      sets: '++id, workoutExerciseId, order, isCompleted',
      templates: '++id, name, createdAt',
      templateExercises: '++id, templateId, exerciseId, order',
      settings: 'key, value',
      bodyMeasurements: '++id, date'
    });

    // v2：扩展字段索引 + 去掉 settings.value 冗余索引
    // - sets 增加 setType 索引（便于按组类型批量查询统计），并补齐 completedAt/restSec/durationSec 字段（仅类型层，旧数据兼容：缺省即可）
    // - workoutExercises 增加 supersetGroup 索引（超级组查询）
    // - workouts 增加 durationSec 索引（训练时长统计/恢复进行中训练）
    // - settings 仅保留主键 key，去掉 value 冗余索引
    this.version(2).stores({
      exercises: '++id, name, muscleGroup, equipment, isCustom',
      workouts: '++id, date, templateId, createdAt, durationSec',
      workoutExercises: '++id, workoutId, exerciseId, order, supersetGroup',
      sets: '++id, workoutExerciseId, order, isCompleted, setType',
      templates: '++id, name, createdAt',
      templateExercises: '++id, templateId, exerciseId, order',
      settings: 'key',
      bodyMeasurements: '++id, date'
    }).upgrade((tx) => {
      // 旧数据兼容：为已存在但缺字段的行补默认值，确保新索引/字段语义一致。
      // 仅做必要的轻量补齐，不强制重写全表。
      return tx.table('sets').toCollection().modify((s: WorkoutSet) => {
        if (s.setType == null) s.setType = 'normal';
        // completedAt/restSec/durationSec 为可选字段，缺省即视为未记录，无需回填。
      });
    });
  }
}

export const db = new GymoDB();