<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import type { WorkoutExerciseView, WorkoutSet, SetType } from '../lib/types';
  import {
    addSet,
    updateSet,
    deleteSet,
    copySet,
    removeWorkoutExercise,
    updateWorkoutExercise,
    pairSupersetWithNext,
    unpairSuperset
  } from '../lib/workout';
  import { startRest } from '../lib/restTimer';
  import { getExerciseHistory } from '../lib/history';
  import { suggestNextGoal, type NextGoal } from '../lib/p2';
  import { muscleGroupLabel, equipmentLabel, setTypeLabel, setTypeOptions } from '../lib/seed';
  import { volumeOf } from '../lib/stats';

  export let we: WorkoutExerciseView;
  export let defaultRest: number;
  export let unit: 'kg' | 'lb';
  // 同一训练日的全部动作实例（用于超级组关联展示与一键配对）
  export let siblings: WorkoutExerciseView[] = [];

  const dispatch = createEventDispatcher<{ changed: void; rest: number }>();

  let restInput = we.restSec ?? defaultRest;
  let showRest = false;
  let supersetInput = we.supersetGroup ?? 0;
  let goal: NextGoal | null = null;

  $: sets = we.sets;
  $: completedVol = volumeOf(sets);

  // 超级组伙伴：同 workout 内同 supersetGroup 且非自身
  $: supersetPartners = (we.supersetGroup ?? 0) > 0
    ? siblings.filter(
        (s) => s.id !== we.id && (s.supersetGroup ?? 0) === (we.supersetGroup ?? 0)
      )
    : [];

  // 是否为训练日内最后一个动作（决定能否与下一动作配对）
  $: orderIdx = siblings.findIndex((s) => s.id === we.id);
  $: canPairNext = orderIdx >= 0 && orderIdx < siblings.length - 1;

  // 下次目标建议：拉取该动作历史后纯本地计算
  async function loadGoal() {
    if (!we.exerciseId) return;
    try {
      const hist = await getExerciseHistory(we.exerciseId);
      const step = unit === 'lb' ? 5 : 2.5;
      goal = suggestNextGoal(hist, step);
    } catch {
      goal = null;
    }
  }
  onMount(loadGoal);
  // 动作或单位变化时重算
  $: if (we.exerciseId) loadGoal();

  function val(e: Event): string {
    return (e.target as HTMLInputElement).value;
  }

  async function addNext(prefillFrom?: WorkoutSet) {
    const partial: Partial<WorkoutSet> = prefillFrom
      ? { weight: prefillFrom.weight, reps: prefillFrom.reps, rpe: prefillFrom.rpe, setType: prefillFrom.setType }
      : goal
        ? { weight: goal.weight, reps: goal.reps }
        : {};
    await addSet(we.id!, partial);
    dispatch('changed');
  }

  async function toggleComplete(s: WorkoutSet) {
    const next = !s.isCompleted;
    // 完成时记录完成时间戳，供平均组间休息统计；取消完成则清除
    await updateSet(s.id!, {
      isCompleted: next,
      completedAt: next ? Date.now() : undefined
    });
    if (next) {
      // 超级组流转：完成一组后，计时器服务于超级组流转——提示下一动作
      if ((we.supersetGroup ?? 0) > 0 && supersetPartners.length > 0) {
        const nextName = supersetPartners[0].exercise?.name ?? '超级组伙伴';
        startRest(we.restSec ?? defaultRest, `超级组 → 下一动作：${nextName}`);
      } else {
        startRest(we.restSec ?? defaultRest);
      }
    }
    dispatch('changed');
  }

  // 校验 + 即时保存（防抖）：避免失焦丢失，未失焦点完成训练也能保存。
  // weight>=0、reps>=0（次数可 0 表示失败/无效组）、rpe 1-10。
  const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  let invalidHint = ''; // 临时提示
  let invalidTimer: ReturnType<typeof setTimeout> | null = null;

  function flashHint(msg: string) {
    invalidHint = msg;
    if (invalidTimer) clearTimeout(invalidTimer);
    invalidTimer = setTimeout(() => (invalidHint = ''), 2000);
  }

  function scheduleSave(key: string, fn: () => Promise<void>, ms = 450) {
    const prev = debounceTimers.get(key);
    if (prev) clearTimeout(prev);
    debounceTimers.set(
      key,
      setTimeout(() => {
        debounceTimers.delete(key);
        void fn();
      }, ms)
    );
  }

  async function saveField(s: WorkoutSet, field: 'weight' | 'reps', value: string): Promise<boolean> {
    const num = parseFloat(value);
    if (isNaN(num)) {
      flashHint('请输入数字');
      dispatch('changed');
      return false;
    }
    if (num < 0) {
      flashHint(`${field === 'weight' ? '重量' : '次数'}不能为负`);
      dispatch('changed');
      return false;
    }
    await updateSet(s.id!, { [field]: num } as Partial<WorkoutSet>);
    dispatch('changed');
    return true;
  }

  function onFieldInput(s: WorkoutSet, field: 'weight' | 'reps', value: string) {
    // 即时输入保存（防抖），不做硬性拦截，最终保存时再校验
    const key = `s-${s.id}-${field}`;
    scheduleSave(key, () => saveField(s, field, value).then(() => {}));
  }

  // 失焦提交：被拒时回退输入框显示为旧值（数据库未变更），避免非法值残留在界面。
  function onFieldChange(s: WorkoutSet, field: 'weight' | 'reps', e: Event) {
    const input = e.target as HTMLInputElement;
    // 取消可能仍在挂起的防抖保存（用同一非法值），避免重复提示
    const key = `s-${s.id}-${field}`;
    const prev = debounceTimers.get(key);
    if (prev) {
      clearTimeout(prev);
      debounceTimers.delete(key);
    }
    void saveField(s, field, input.value).then((ok) => {
      if (!ok) input.value = String(s[field] ?? 0);
    });
  }

  async function saveRpe(s: WorkoutSet, value: string): Promise<boolean> {
    const trimmed = value.trim();
    if (trimmed === '') {
      await updateSet(s.id!, { rpe: undefined });
      dispatch('changed');
      return true;
    }
    const num = parseFloat(trimmed);
    if (isNaN(num)) {
      flashHint('RPE 需为数字');
      dispatch('changed');
      return false;
    }
    if (num < 1 || num > 10) {
      flashHint('RPE 需在 1-10 之间');
      // 越界回退旧值（触发刷新）
      dispatch('changed');
      return false;
    }
    await updateSet(s.id!, { rpe: num });
    dispatch('changed');
    return true;
  }

  // RPE 失焦提交：越界被拒时回退输入框为旧值（或空），避免非法值残留。
  function onRpeChange(s: WorkoutSet, e: Event) {
    const input = e.target as HTMLInputElement;
    const key = `s-${s.id}-rpe`;
    const prev = debounceTimers.get(key);
    if (prev) {
      clearTimeout(prev);
      debounceTimers.delete(key);
    }
    void saveRpe(s, input.value).then((ok) => {
      if (!ok) input.value = s.rpe == null ? '' : String(s.rpe);
    });
  }

  function onRpeInput(s: WorkoutSet, value: string) {
    const key = `s-${s.id}-rpe`;
    scheduleSave(key, () => saveRpe(s, value).then(() => {}));
  }

  // 单组备注：即时保存（防抖），无校验。
  async function saveNote(s: WorkoutSet, value: string): Promise<void> {
    await updateSet(s.id!, { note: value });
    dispatch('changed');
  }
  function onNoteInput(s: WorkoutSet, value: string) {
    const key = `s-${s.id}-note`;
    scheduleSave(key, () => saveNote(s, value).then(() => {}));
  }
  function onNoteChange(s: WorkoutSet, e: Event) {
    const input = e.target as HTMLInputElement;
    const key = `s-${s.id}-note`;
    const prev = debounceTimers.get(key);
    if (prev) {
      clearTimeout(prev);
      debounceTimers.delete(key);
    }
    void saveNote(s, input.value);
  }

  async function changeType(s: WorkoutSet, value: string) {
    await updateSet(s.id!, { setType: value as SetType });
    dispatch('changed');
  }

  async function del(s: WorkoutSet) {
    await deleteSet(s.id!);
    dispatch('changed');
  }

  async function duplicate(s: WorkoutSet) {
    await copySet(s);
    dispatch('changed');
  }

  async function remove() {
    await removeWorkoutExercise(we.id!);
    dispatch('changed');
  }

  async function saveRest() {
    await updateWorkoutExercise(we.id!, { restSec: restInput });
    showRest = false;
    dispatch('changed');
  }

  async function saveSuperset() {
    await updateWorkoutExercise(we.id!, { supersetGroup: supersetInput > 0 ? supersetInput : undefined });
    dispatch('changed');
  }

  async function clearSuperset() {
    supersetInput = 0;
    await unpairSuperset(we.id!);
    dispatch('changed');
  }

  // P2：一键与下一动作配对为超级组
  async function pairNext() {
    if (!we.id) return;
    const ok = await pairSupersetWithNext(we.workoutId, we.id);
    if (!ok) flashHint('已是最后一个动作，无下一动作可配对');
    dispatch('changed');
  }

  function typeShort(t: SetType): string {
    return setTypeLabel[t] ?? t;
  }
</script>

<div class="card ex" class:ss={(we.supersetGroup ?? 0) > 0}>
  <div class="ex-head">
    <div class="ex-name">{we.exercise?.name ?? '(动作已删除)'}</div>
    <button type="button" class="menu" on:click={() => (showRest = !showRest)} aria-label="动作设置">⋮</button>
  </div>
  {#if invalidHint}<div class="hint" role="status">{invalidHint}</div>{/if}
  <div class="ex-meta">
    {#if we.exercise}
      {#if we.exercise.image}
        <img class="thumb" src={we.exercise.image} alt="" />
      {/if}
      <span class="tag">{muscleGroupLabel[we.exercise.muscleGroup]}</span>
      <span class="tag">{equipmentLabel[we.exercise.equipment]}</span>
    {/if}
    <span class="dim">休息 {we.restSec ?? defaultRest}s</span>
    <span class="dim ml">容量 {completedVol}</span>
  </div>

  {#if (we.supersetGroup ?? 0) > 0}
    <div class="ss-tag">
      <span class="chip active">超级组 #{we.supersetGroup}</span>
      {#if supersetPartners.length}
        <span class="dim">关联：{supersetPartners.map((p) => p.exercise?.name ?? '?').join('、')}</span>
      {/if}
      <button type="button" class="btn btn-ghost ss-unpair" on:click={clearSuperset}>解除配对</button>
    </div>
  {:else if canPairNext}
    <div class="ss-tag">
      <button type="button" class="btn btn-ghost ss-pair" on:click={pairNext}>⇄ 与下一动作配对为超级组</button>
    </div>
  {/if}

  {#if goal}
    <div class="goal-tip" data-testid="next-goal">
      <span class="dim">下次建议：</span>
      <strong>{goal.weight}×{goal.reps}</strong>
      <span class="dim goal-reason">（{goal.reason}）</span>
    </div>
  {/if}

  {#if showRest}
    <div class="rest-edit">
      <div class="row" style="gap:8px">
        <label class="dim" for={`rest-${we.id}`}>组间休息(s)</label>
        <input id={`rest-${we.id}`} type="number" class="narrow" bind:value={restInput} />
        <button type="button" class="btn btn-ghost" on:click={saveRest}>保存</button>
      </div>
      <div class="row" style="gap:8px; margin-top:8px">
        <label class="dim" for={`ss-${we.id}`}>超级组编号</label>
        <input id={`ss-${we.id}`} type="number" class="narrow" min="0" bind:value={supersetInput} />
        <button type="button" class="btn btn-ghost" on:click={saveSuperset}>设置</button>
        <button type="button" class="btn btn-danger" on:click={clearSuperset}>清除</button>
        <button type="button" class="btn btn-danger" style="margin-left:auto" on:click={remove}>删除动作</button>
      </div>
    </div>
  {/if}

  <div class="set-header">
    <span class="col-c">#</span>
    <span class="col-w">重量({unit})</span>
    <span class="col-r">次数</span>
    <span class="col-rpe">RPE</span>
    <span class="col-type">类型</span>
    <span class="col-ok">完成</span>
  </div>

  {#each sets as s, i}
    <div class="set-block" class:done={s.isCompleted}>
      <div class="set-row">
        <span class="col-c">{i + 1}</span>
        <input class="col-w" type="number" inputmode="decimal" min="0" step="any" value={s.weight}
          on:input={(e) => onFieldInput(s, 'weight', val(e))}
          on:change={(e) => onFieldChange(s, 'weight', e)} />
        <input class="col-r" type="number" inputmode="numeric" min="0" step="1" value={s.reps}
          on:input={(e) => onFieldInput(s, 'reps', val(e))}
          on:change={(e) => onFieldChange(s, 'reps', e)} />
        <input class="col-rpe" type="number" inputmode="numeric" min="1" max="10" step="0.5" value={s.rpe ?? ''} placeholder="—"
          on:input={(e) => onRpeInput(s, val(e))}
          on:change={(e) => onRpeChange(s, e)} />
        <select class="col-type" value={s.setType} on:change={(e) => changeType(s, val(e))}
          aria-label="组类型">
          {#each setTypeOptions as t}
            <option value={t}>{setTypeLabel[t]}</option>
          {/each}
          {#if !setTypeOptions.includes(s.setType)}
            <option value={s.setType}>{typeShort(s.setType)}</option>
          {/if}
        </select>
        <div class="col-ok">
          <input class="check" type="checkbox" checked={s.isCompleted} on:change={() => toggleComplete(s)} />
        </div>
        <div class="set-actions">
          <button type="button" class="mini" title="复制组" on:click={() => duplicate(s)}>⧉</button>
          <button type="button" class="mini danger" title="删除组" on:click={() => del(s)}>✕</button>
        </div>
      </div>
      <div class="set-note-row">
        <input class="set-note" type="text" placeholder="单组备注…" value={s.note ?? ''}
          on:input={(e) => onNoteInput(s, val(e))}
          on:change={(e) => onNoteChange(s, e)} aria-label={`第${i + 1}组备注`} />
      </div>
    </div>
  {/each}

  <button type="button" class="btn btn-ghost btn-block add-set" on:click={() => addNext(sets[sets.length - 1])}>
    ＋ 下一组{sets.length ? '（预填上一组）' : goal ? '（按建议预填）' : ''}
  </button>
</div>

<style>
  .ex.ss {
    border-left: 3px solid var(--accent);
  }
  .ex-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .ex-name {
    font-weight: 700;
    font-size: 16px;
  }
  .menu {
    font-size: 22px;
    color: var(--fg-dim);
    padding: 0 6px;
  }
  .hint {
    color: var(--danger);
    font-size: 12px;
    margin: 2px 0 6px;
  }
  .ex-meta {
    display: flex;
    gap: 6px;
    align-items: center;
    margin: 6px 0 8px;
    flex-wrap: wrap;
  }
  .thumb {
    width: 28px;
    height: 28px;
    object-fit: cover;
    border-radius: 6px;
    border: 1px solid var(--border);
  }
  .ml {
    margin-left: auto;
  }
  .ss-tag {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
    margin-bottom: 6px;
  }
  .ss-pair,
  .ss-unpair {
    font-size: 12px;
    padding: 4px 8px;
  }
  .goal-tip {
    background: var(--bg-elev2);
    border-radius: 6px;
    padding: 6px 8px;
    margin-bottom: 8px;
    font-size: 12px;
    display: flex;
    gap: 4px;
    align-items: baseline;
    flex-wrap: wrap;
  }
  .goal-tip strong {
    color: var(--accent);
  }
  .goal-reason {
    font-size: 11px;
  }
  .set-block {
    padding: 4px 0;
  }
  .set-block.done {
    opacity: 0.6;
  }
  .set-header,
  .set-row {
    display: grid;
    grid-template-columns: 22px 1fr 52px 50px 70px 36px 52px;
    align-items: center;
    gap: 5px;
    padding: 2px 0;
  }
  .set-header {
    color: var(--fg-dim);
    font-size: 11px;
    text-transform: uppercase;
    padding: 4px 0;
  }
  .col-c {
    color: var(--fg-dim);
  }
  .set-row input,
  .set-row select {
    padding: 6px 6px;
    font-size: 13px;
  }
  .col-type {
    padding: 6px 4px !important;
  }
  .set-actions {
    display: flex;
    gap: 4px;
    justify-content: flex-end;
  }
  .mini {
    background: var(--bg-elev2);
    border-radius: 6px;
    width: 24px;
    height: 26px;
    font-size: 12px;
    color: var(--fg-dim);
  }
  .mini.danger {
    color: var(--danger);
  }
  .set-note-row {
    padding: 2px 0 4px 27px;
  }
  .set-note {
    width: 100%;
    padding: 4px 6px;
    font-size: 12px;
    background: var(--bg-elev2);
    border: 1px solid var(--border);
    border-radius: 6px;
  }
  .add-set {
    margin-top: 8px;
  }
  .rest-edit {
    margin: 8px 0;
  }
</style>