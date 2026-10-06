<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { route, go } from '../lib/router';
  import { db } from '../lib/db';
  import { getWorkoutView, createWorkout, addExerciseToWorkout, finishWorkout, deleteWorkout } from '../lib/workout';
  import { settings } from '../lib/settings';
  import type { WorkoutView, Exercise } from '../lib/types';
  import ExerciseCard from '../components/ExerciseCard.svelte';
  import RestTimer from '../components/RestTimer.svelte';
  import { muscleGroupLabel, muscleGroups } from '../lib/seed';
  import { startPersisting, stopPersisting, getRunningWorkout, setTimerPrefs } from '../lib/restTimer';

  // 响应式读取路由参数；无 id 时为 NaN，会在 ensureWorkout 中自动创建新训练并跳转
  $: workoutId = Number($route.params.id);
  let view: WorkoutView | null = null;
  let allExercises: Exercise[] = [];
  let showPicker = false;
  let filterGroup = '';
  let search = '';
  let startTime = Date.now();
  let notes = '';
  let elapsed = 0;
  let tickI: ReturnType<typeof setInterval>;
  let redirecting = false;

  async function refresh() {
    view = await getWorkoutView(workoutId);
    if (view) {
      notes = view.notes ?? '';
      // 进行中训练：用 createdAt 作为起始时间戳（崩溃恢复时仍可计算时长）
      startTime = view.createdAt ?? Date.now();
      // 启动中途持久化（每 15s 写回 createdAt，便于退出/崩溃后恢复）
      startPersisting(workoutId, startTime);
    }
  }

  // 无 id 时自动创建新训练并跳转，避免卡在“加载中…”空状态
  async function ensureWorkout(id: number): Promise<void> {
    if (isNaN(id)) {
      redirecting = true;
      view = null;
      try {
        const newId = await createWorkout();
        go('workout', { id: newId });
      } catch (e) {
        redirecting = false;
        console.error('创建训练失败', e);
      }
      return;
    }
    redirecting = false;
    await refresh();
  }

  onMount(async () => {
    allExercises = await db.exercises.toArray();
    // 同步计时器提示偏好
    setTimerPrefs($settings.timerSound, $settings.timerVibrate);
    tickI = setInterval(() => (elapsed = Math.round((Date.now() - startTime) / 1000)), 1000);
    // 若有上次未结束的进行中训练，提示恢复
    const running = getRunningWorkout();
    if (running && isNaN(Number($route.params.id))) {
      const w = await db.workouts.get(running.id);
      if (w && w.durationSec == null) {
        if (confirm('检测到上次有未结束的训练，是否恢复？')) {
          go('workout', { id: running.id });
          return;
        }
      }
    }
  });

  // workoutId 变化时（首次进入、自动跳转后、或在训练间切换）刷新
  $: ensureWorkout(workoutId);

  onDestroy(() => {
    clearInterval(tickI);
    stopPersisting();
  });

  $: unit = $settings.unit;
  $: defaultRest = $settings.defaultRestSec;

  $: filtered = allExercises.filter((e) => {
    if (filterGroup && e.muscleGroup !== filterGroup) return false;
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  async function pickExercise(ex: Exercise) {
    if (!ex.id) return;
    await addExerciseToWorkout(workoutId, ex.id, defaultRest);
    showPicker = false;
    refresh();
  }

  async function finish() {
    const dur = Math.round((Date.now() - startTime) / 1000);
    await finishWorkout(workoutId, dur, notes);
    stopPersisting();
    go('home');
  }

  async function remove() {
    if (!confirm('删除该训练日及其所有组？')) return;
    stopPersisting();
    await deleteWorkout(workoutId);
    go('home');
  }

  function fmtElapsed(s: number): string {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  }
</script>

<div class="topbar">
  <div class="row">
    <button type="button" class="back" on:click={() => go('home')}>‹</button>
    <h1>{view?.name ?? '训练中'}</h1>
  </div>
  <span class="dim timer">⏱ {fmtElapsed(elapsed)}</span>
</div>

{#if view}
  {#if view.exercises.length === 0}
    <div class="list-empty">
      还没有添加动作，点击下方“添加动作”开始记录。
    </div>
  {/if}

  {#each view.exercises as we (we.id)}
    <ExerciseCard {we} {defaultRest} {unit} siblings={view.exercises} on:changed={refresh} />
  {/each}

  <button type="button" class="btn btn-ghost btn-block" on:click={() => (showPicker = true)}>＋ 添加动作</button>

  <div class="section-title">备注</div>
  <textarea bind:value={notes} rows="2" placeholder="训练备注…"></textarea>

  <div class="actions">
    <button type="button" class="btn btn-primary btn-block" on:click={finish}>完成训练 ✓</button>
    <button type="button" class="btn btn-danger btn-block" on:click={remove}>放弃并删除</button>
  </div>
{:else if redirecting}
  <div class="list-empty">正在创建新训练…</div>
{:else}
  <div class="list-empty">加载中…</div>
{/if}

<RestTimer />

{#if showPicker}
  <div class="picker">
    <button type="button" class="picker-backdrop" aria-label="关闭选择动作" on:click={() => (showPicker = false)}></button>
    <div class="picker-sheet" role="dialog" aria-modal="true" aria-label="选择动作">
      <div class="between">
        <h3>选择动作</h3>
        <button type="button" aria-label="关闭" on:click={() => (showPicker = false)}>✕</button>
      </div>
      <input placeholder="搜索动作…" bind:value={search} />
      <div class="chips">
        <button type="button" class="chip" class:active={filterGroup === ''} on:click={() => (filterGroup = '')}>全部</button>
        {#each muscleGroups as g}
          <button type="button" class="chip" class:active={filterGroup === g} on:click={() => (filterGroup = g)}>
            {muscleGroupLabel[g]}
          </button>
        {/each}
      </div>
      <div class="ex-list">
        {#each filtered as ex}
          <button type="button" class="ex-item" on:click={() => pickExercise(ex)}>
            <div class="ex-left">
              {#if ex.image}
                <img class="thumb" src={ex.image} alt="" />
              {/if}
              <div>
                <div class="n">{ex.name}</div>
                <div class="dim">{muscleGroupLabel[ex.muscleGroup]} · {ex.isCustom ? '自定义' : '内置'}</div>
              </div>
            </div>
            <span class="add">＋</span>
          </button>
        {:else}
          <div class="list-empty">未找到动作，可在动作库新增。</div>
        {/each}
      </div>
    </div>
  </div>
{/if}

<style>
  .timer {
    font-variant-numeric: tabular-nums;
    font-weight: 700;
  }
  .actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 16px 0;
  }
  .picker {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }
  .picker-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    border: none;
    cursor: pointer;
    padding: 0;
  }
  .picker-sheet {
    position: relative;
    background: var(--bg-elev);
    width: 100%;
    max-width: 640px;
    margin: 0 auto;
    border-radius: 16px 16px 0 0;
    padding: 14px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 10px 0;
  }
  .ex-list {
    overflow-y: auto;
    flex: 1;
  }
  .ex-item {
    display: flex;
    width: 100%;
    justify-content: space-between;
    align-items: center;
    padding: 10px;
    border-bottom: 1px solid var(--border);
    cursor: pointer;
    text-align: left;
  }
  .ex-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .thumb {
    width: 36px;
    height: 36px;
    object-fit: cover;
    border-radius: 6px;
    border: 1px solid var(--border);
  }
  .ex-item:active {
    background: var(--bg-elev2);
  }
  .n {
    font-weight: 600;
  }
  .add {
    color: var(--accent);
    font-size: 22px;
  }
</style>