// 训练记录读写辅助
import { db } from './db';
import type {
  Workout,
  WorkoutExercise,
  WorkoutSet,
  WorkoutView,
  WorkoutExerciseView,
  Template
} from './types';

// 读取单个训练日的完整视图（含动作与组）
export async function getWorkoutView(workoutId: number): Promise<WorkoutView | null> {
  const workout = await db.workouts.get(workoutId);
  if (!workout || !workout.id) return null;
  const wex = await db.workoutExercises.where('workoutId').equals(workoutId).sortBy('order');
  const exercises: WorkoutExerciseView[] = [];
  for (const we of wex) {
    const exercise = we.exerciseId ? await db.exercises.get(we.exerciseId) : undefined;
    const sets = await db.sets.where('workoutExerciseId').equals(we.id!).sortBy('order');
    exercises.push({ ...we, exercise, sets });
  }
  return { ...workout, exercises };
}

// 创建空训练日
export async function createWorkout(name?: string, templateId?: number): Promise<number> {
  const id = await db.workouts.add({
    date: Date.now(),
    name: name || new Date().toLocaleString(),
    templateId,
    createdAt: Date.now()
  });
  return id as number;
}

// 给训练日添加一个动作
export async function addExerciseToWorkout(
  workoutId: number,
  exerciseId: number,
  restSec?: number
): Promise<number> {
  const existing = await db.workoutExercises.where('workoutId').equals(workoutId).toArray();
  const order = existing.length;
  const id = await db.workoutExercises.add({
    workoutId,
    exerciseId,
    order,
    restSec
  });
  return id as number;
}

// 给动作添加一组
export async function addSet(
  workoutExerciseId: number,
  partial: Partial<WorkoutSet> = {}
): Promise<number> {
  const existing = await db.sets.where('workoutExerciseId').equals(workoutExerciseId).toArray();
  const order = existing.length;
  const id = await db.sets.add({
    workoutExerciseId,
    order,
    weight: partial.weight ?? 0,
    reps: partial.reps ?? 0,
    rpe: partial.rpe,
    setType: partial.setType ?? 'normal',
    isCompleted: partial.isCompleted ?? false,
    note: partial.note
  });
  return id as number;
}

export async function updateSet(id: number, patch: Partial<WorkoutSet>): Promise<void> {
  await db.sets.update(id, patch);
}

export async function deleteSet(id: number): Promise<void> {
  await db.sets.delete(id);
}

export async function copySet(set: WorkoutSet): Promise<void> {
  if (!set.id) return;
  await addSet(set.workoutExerciseId, {
    weight: set.weight,
    reps: set.reps,
    rpe: set.rpe,
    setType: set.setType,
    note: set.note,
    isCompleted: false
  });
}

export async function updateWorkoutExercise(
  id: number,
  patch: Partial<WorkoutExercise>
): Promise<void> {
  await db.workoutExercises.update(id, patch);
}

// P2：超级组一键配对 —— 将指定动作与「训练日内按 order 的下一个动作」配为同一超级组。
// 自动分配一个新的 supersetGroup（= 当前训练日内已用最大组号 + 1，从 1 起）。
// 若已是最后一个动作（无下一个），则不配对并返回 false。
export async function pairSupersetWithNext(
  workoutId: number,
  workoutExerciseId: number
): Promise<boolean> {
  const all = await db.workoutExercises.where('workoutId').equals(workoutId).sortBy('order');
  const idx = all.findIndex((w) => w.id === workoutExerciseId);
  if (idx < 0 || idx >= all.length - 1) return false;
  const cur = all[idx];
  const next = all[idx + 1];
  // 已同属一个超级组则不重复
  const curG = cur.supersetGroup ?? 0;
  const nextG = next.supersetGroup ?? 0;
  if (curG > 0 && curG === nextG) return true;
  // 分配新组号
  const used = all.map((w) => w.supersetGroup ?? 0);
  const newGroup = (used.length ? Math.max(...used) : 0) + 1;
  await db.transaction('rw', db.workoutExercises, async () => {
    await db.workoutExercises.update(cur.id!, { supersetGroup: newGroup });
    await db.workoutExercises.update(next.id!, { supersetGroup: newGroup });
  });
  return true;
}

// 解除超级组配对（清除该动作及其同组伙伴的 supersetGroup）
export async function unpairSuperset(workoutExerciseId: number): Promise<void> {
  const cur = await db.workoutExercises.get(workoutExerciseId);
  if (!cur || !cur.supersetGroup) return;
  const group = cur.supersetGroup;
  const partners = await db.workoutExercises
    .where('workoutId')
    .equals(cur.workoutId)
    .filter((w) => (w.supersetGroup ?? 0) === group)
    .toArray();
  await db.transaction('rw', db.workoutExercises, async () => {
    for (const p of partners) {
      await db.workoutExercises.update(p.id!, { supersetGroup: undefined });
    }
  });
}

export async function removeWorkoutExercise(id: number): Promise<void> {
  await db.transaction('rw', db.workoutExercises, db.sets, async () => {
    await db.sets.where('workoutExerciseId').equals(id).delete();
    await db.workoutExercises.delete(id);
  });
}

export async function deleteWorkout(id: number): Promise<void> {
  await db.transaction('rw', db.workouts, db.workoutExercises, db.sets, async () => {
    const wex = await db.workoutExercises.where('workoutId').equals(id).toArray();
    for (const we of wex) {
      if (we.id) await db.sets.where('workoutExerciseId').equals(we.id).delete();
    }
    await db.workoutExercises.where('workoutId').equals(id).delete();
    await db.workouts.delete(id);
  });
}

export async function finishWorkout(id: number, durationSec: number, notes?: string): Promise<void> {
  await db.workouts.update(id, { durationSec, notes });
}

// 从模板创建训练日
export async function startFromTemplate(templateId: number): Promise<number> {
  const tmpl = await db.templates.get(templateId);
  if (!tmpl || !tmpl.id) throw new Error('模板不存在');
  const tExercises = await db.templateExercises.where('templateId').equals(tmpl.id).sortBy('order');
  const workoutId = await createWorkout(tmpl.name, tmpl.id);
  for (const te of tExercises) {
    const weId = await addExerciseToWorkout(workoutId, te.exerciseId, te.restSec);
    for (let i = 0; i < te.targetSets; i++) {
      await addSet(weId, {
        weight: te.targetWeight,
        reps: te.targetReps,
        setType: 'working'
      });
    }
  }
  return workoutId;
}

export async function listWorkouts(): Promise<Workout[]> {
  const all = await db.workouts.toArray();
  return all.sort((a, b) => b.date - a.date);
}

export async function getTemplates(): Promise<Template[]> {
  const all = await db.templates.toArray();
  return all.sort((a, b) => b.createdAt - a.createdAt);
}