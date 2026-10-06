// 数据导入导出 —— JSON 全量备份恢复 + CSV 导出（动作历史）
import { db } from './db';
import type { WorkoutView, Template, TemplateExercise } from './types';
import { getWorkoutView } from './workout';

const TABLES = [
  'exercises',
  'workouts',
  'workoutExercises',
  'sets',
  'templates',
  'templateExercises',
  'settings',
  'bodyMeasurements'
] as const;

export interface BackupFile {
  app: 'Gymo';
  version: number;
  exportedAt: string;
  data: Record<string, unknown[]>;
}

// JSON 全量导出
export async function exportJSON(): Promise<string> {
  const data: Record<string, unknown[]> = {};
  for (const t of TABLES) {
    data[t] = await db.table(t).toArray();
  }
  const file: BackupFile = {
    app: 'Gymo',
    version: 1,
    exportedAt: new Date().toISOString(),
    data
  };
  return JSON.stringify(file, null, 2);
}

// JSON 导入：
// - replace：清空全部表后按原 id 写入（恢复式）
// - merge：保留已有数据，对导入行重映射自增 id 并重建外键，不覆盖已有记录。
//   重映射覆盖：workouts.id -> workoutExercises.workoutId；
//               workoutExercises.id -> sets.workoutExerciseId；
//               templates.id -> templateExercises.templateId；
//               exercises/templates/sets/bodyMeasurements/settings 的主键 id 去掉后由 DB 自增。
export async function importJSON(json: string, mode: 'replace' | 'merge' = 'replace'): Promise<void> {
  const parsed = JSON.parse(json) as BackupFile;
  if (parsed.app !== 'Gymo') throw new Error('不是 Gymo 备份文件');
  await db.transaction('rw', db.tables, async () => {
    if (mode === 'replace') {
      for (const t of TABLES) {
        await db.table(t).clear();
      }
      for (const t of TABLES) {
        const rows = parsed.data[t];
        if (Array.isArray(rows) && rows.length) {
          await db.table(t).bulkPut(rows as any[]);
        }
      }
      return;
    }

    // ---- merge 模式：重映射 id 并重建外键 ----
    const data = parsed.data;
    const exercisesRows = (data.exercises ?? []) as any[];
    const workoutsRows = (data.workouts ?? []) as any[];
    const weRows = (data.workoutExercises ?? []) as any[];
    const setsRows = (data.sets ?? []) as any[];
    const templatesRows = (data.templates ?? []) as any[];
    const teRows = (data.templateExercises ?? []) as any[];
    const settingsRows = (data.settings ?? []) as any[];
    const bodyRows = (data.bodyMeasurements ?? []) as any[];

    // exercises：去掉主键 id，让 DB 自增；记录 oldId -> newId 映射
    const exIdMap = new Map<number, number>();
    for (const r of exercisesRows) {
      const oldId = r.id;
      const { id: _oid, ...rest } = r;
      void _oid;
      const newId = (await db.exercises.add(rest)) as number;
      if (oldId != null) exIdMap.set(oldId, newId);
    }

    // workouts：去掉主键 id，自增；记录映射
    const wIdMap = new Map<number, number>();
    for (const r of workoutsRows) {
      const oldId = r.id;
      const { id: _wid, ...rest } = r;
      void _wid;
      const newId = (await db.workouts.add(rest)) as number;
      if (oldId != null) wIdMap.set(oldId, newId);
    }

    // workoutExercises：重映射 workoutId/exerciseId，自增主键，记录映射
    const weIdMap = new Map<number, number>();
    for (const r of weRows) {
      const oldId = r.id;
      const newWorkoutId = wIdMap.get(r.workoutId) ?? r.workoutId;
      const newExerciseId = exIdMap.get(r.exerciseId) ?? r.exerciseId;
      const { id: _weid, workoutId: _w, exerciseId: _e, ...rest } = r;
      void _weid; void _w; void _e;
      const newId = (await db.workoutExercises.add({
        ...rest,
        workoutId: newWorkoutId,
        exerciseId: newExerciseId
      })) as number;
      if (oldId != null) weIdMap.set(oldId, newId);
    }

    // sets：重映射 workoutExerciseId，主键自增
    for (const r of setsRows) {
      const newWeId = weIdMap.get(r.workoutExerciseId) ?? r.workoutExerciseId;
      const { id: _sid, workoutExerciseId: _we, ...rest } = r;
      void _sid; void _we;
      await db.sets.add({ ...rest, workoutExerciseId: newWeId });
    }

    // templates：自增主键，记录映射
    const tIdMap = new Map<number, number>();
    for (const r of templatesRows) {
      const oldId = r.id;
      const { id: _tid, ...rest } = r;
      void _tid;
      const newId = (await db.templates.add(rest)) as number;
      if (oldId != null) tIdMap.set(oldId, newId);
    }

    // templateExercises：重映射 templateId/exerciseId，主键自增
    for (const r of teRows) {
      const newTemplateId = tIdMap.get(r.templateId) ?? r.templateId;
      const newExerciseId = exIdMap.get(r.exerciseId) ?? r.exerciseId;
      const { id: _teid, templateId: _t, exerciseId: _e2, ...rest } = r;
      void _teid; void _t; void _e2;
      await db.templateExercises.add({
        ...rest,
        templateId: newTemplateId,
        exerciseId: newExerciseId
      });
    }

    // settings：按 key upsert（键值表，合并语义即覆盖同名键）
    for (const r of settingsRows) {
      if (r && r.key != null) await db.settings.put({ key: r.key, value: r.value });
    }

    // bodyMeasurements：自增主键
    for (const r of bodyRows) {
      const { id: _bid, ...rest } = r;
      void _bid;
      await db.bodyMeasurements.add(rest);
    }
  });
}

// CSV 导出：按动作的历史记录
export async function exportHistoryCSV(): Promise<string> {
  const workouts = await db.workouts.toArray();
  const rows: string[] = [
    'date,workout,exercise,order,weight,reps,rpe,setType,completed,note'
  ];
  for (const w of workouts) {
    if (!w.id) continue;
    const view = await getWorkoutView(w.id);
    if (!view) continue;
    const dateStr = new Date(w.date).toISOString();
    for (const we of view.exercises) {
      const exName = we.exercise?.name ?? '(已删除动作)';
      for (const s of we.sets) {
        const note = (s.note ?? '').replace(/"/g, '""');
        rows.push(
          [
            dateStr,
            `"${w.name}"`,
            `"${exName}"`,
            s.order + 1,
            s.weight,
            s.reps,
            s.rpe ?? '',
            s.setType,
            s.isCompleted ? 1 : 0,
            `"${note}"`
          ].join(',')
        );
      }
    }
  }
  return rows.join('\n');
}

export function download(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function readFileText(file: File): Promise<string> {
  return file.text();
}

// ---- 单个计划模板的本地文件导出/导入 ----
export interface TemplateFile {
  app: 'Gymo-Template';
  version: number;
  exportedAt: string;
  template: Template;
  exercises: TemplateExercise[];
}

// 把单个模板导出为可下载的 JSON 字符串
export async function exportTemplateJSON(templateId: number): Promise<string> {
  const template = await db.templates.get(templateId);
  if (!template) throw new Error('模板不存在');
  const exercises = (
    await db.templateExercises.where('templateId').equals(templateId).toArray()
  ).sort((a, b) => a.order - b.order);
  const file: TemplateFile = {
    app: 'Gymo-Template',
    version: 1,
    exportedAt: new Date().toISOString(),
    template,
    exercises
  };
  return JSON.stringify(file, null, 2);
}

// 从本地 JSON 文件导入模板（合并模式：以新 id 写入，避免覆盖已有模板）
// 返回新建模板的 id
export async function importTemplateJSON(
  json: string,
  mode: 'new' | 'replace' = 'new'
): Promise<number> {
  const parsed = JSON.parse(json) as TemplateFile;
  if (parsed.app !== 'Gymo-Template') throw new Error('不是 Gymo 模板文件');
  const src = parsed.template;
  const srcEx = parsed.exercises ?? [];
  return await db.transaction('rw', db.templates, db.templateExercises, async () => {
    let newId: number;
    if (mode === 'replace' && src.id != null) {
      // 尝试按源 id 覆盖：先清掉旧的动作
      await db.templateExercises.where('templateId').equals(src.id).delete();
      await db.templates.put({ ...src, id: src.id });
      newId = src.id;
    } else {
      // 新建：去掉源 id，生成新模板
      const { id: _omit, ...rest } = src;
      void _omit;
      newId = (await db.templates.add({ ...rest, createdAt: Date.now() })) as number;
    }
    for (const ex of srcEx) {
      const { id: _omit, ...rest } = ex;
      void _omit;
      await db.templateExercises.add({ ...rest, templateId: newId });
    }
    return newId;
  });
}