<script lang="ts">
  import { onMount } from 'svelte';
  import { route, go } from '../lib/router';
  import {
    getExerciseHistory,
    getExerciseTrend,
    getExerciseSetTypeStats,
    type ExerciseHistoryEntry,
    type TrendPoint
  } from '../lib/history';
  import { db } from '../lib/db';
  import type { Exercise, SetType, BodyMeasurement } from '../lib/types';
  import { fmt, formulaList, formulaLabels, type Formula1RM } from '../lib/stats';
  import { settings } from '../lib/settings';
  import { muscleGroupLabel, equipmentLabel, setTypeLabel, allSetTypes } from '../lib/seed';
  import TrendChart from '../components/TrendChart.svelte';
  import {
    suggestNextGoal,
    prMilestones,
    averageRestOfSets,
    relativeIntensityTrend,
    bodyweightTrend,
    type NextGoal,
    type PRMilestone
  } from '../lib/p2';

  let exerciseId = Number($route.params.id);
  let exercise: Exercise | null = null;
  let history: ExerciseHistoryEntry[] = [];
  let trend: TrendPoint[] = [];
  let typeStats: Record<string, number> = {};
  let pr1RM = 0;
  let prWeight = 0;
  let totalVol = 0;
  let totalSets = 0;
  let notFound = false;
  let formula: Formula1RM = $settings.formula;
  let goal: NextGoal | null = null;
  let milestones: PRMilestone[] = [];
  let avgRest = 0; // 该动作平均组间休息(秒)
  let bodyMeas: BodyMeasurement[] = [];
  let bwTrend: { date: number; bodyweight: number }[] = [];
  let relative = false;

  async function refresh() {
    exercise = (await db.exercises.get(exerciseId)) ?? null;
    if (!exercise) {
      notFound = true;
      return;
    }
    notFound = false;
    history = await getExerciseHistory(exerciseId, formula);
    trend = await getExerciseTrend(exerciseId, formula);
    typeStats = await getExerciseSetTypeStats(exerciseId);
    pr1RM = Math.max(0, ...history.map((h) => h.top1RM));
    prWeight = Math.max(0, ...history.map((h) => h.topWeight));
    totalVol = history.reduce((s, h) => s + h.volume, 0);
    totalSets = history.reduce((s, h) => s + h.sets.filter((x) => x.isCompleted).length, 0);
    // 下次目标建议
    const step = $settings.unit === 'lb' ? 5 : 2.5;
    goal = suggestNextGoal(history, step);
    // PR 里程碑
    milestones = prMilestones(history);
    // 平均组间休息：汇总该动作所有历史已完成组的 completedAt
    const allSets = history.flatMap((h) => h.sets);
    avgRest = averageRestOfSets(allSets);
    // 体重数据（用于相对强度/叠加）
    bodyMeas = (await db.bodyMeasurements.toArray())
      .filter((b) => b.bodyweight != null)
      .sort((a, b) => a.date - b.date);
    bwTrend = bodyMeas.map((b) => ({ date: b.date, bodyweight: b.bodyweight as number }));
  }

  onMount(refresh);

  // 切换公式时重新计算 PR 与趋势
  async function changeFormula(f: Formula1RM) {
    formula = f;
    await settings.set({ formula: f });
    await refresh();
  }
  function onFormulaChange(e: Event) {
    const v = (e.currentTarget as HTMLSelectElement).value as Formula1RM;
    void changeFormula(v);
  }
  $: formula, refresh;

  // 相对强度模式：把 1RM 趋势转换为「1RM/体重」
  $: trendShown = relative && bwTrend.length > 0 ? relativeIntensityTrend(trend, bwTrend) : trend;

  function dateStr(ts: number): string {
    return new Date(ts).toLocaleDateString();
  }

  function kindColor(k: PRMilestone['kind']): string {
    return k === 'maxWeight' ? 'var(--accent)' : k === 'est1RM' ? '#b06' : 'var(--green)';
  }

  // 求和（供模板 fallback 判断，直接引用 typeStats 以保证响应式）
  $: typeStatsSum = Object.values(typeStats).reduce((a, b) => a + b, 0);
  $: hasBodyweight = bwTrend.length > 0;

  const allTypes: SetType[] = allSetTypes;
</script>

<div class="topbar">
  <div class="row">
    <button type="button" class="back" on:click={() => go('exercises')}>‹</button>
    <h1>{exercise?.name ?? '动作详情'}</h1>
  </div>
</div>

{#if notFound}
  <div class="list-empty" style="padding-top:40px">
    <p style="font-size:16px; font-weight:700; margin-bottom:8px">动作不存在</p>
    <p class="dim" style="margin-bottom:16px">该动作可能已被删除，或链接有误。</p>
    <button type="button" class="btn btn-primary" on:click={() => go('exercises')}>返回动作库</button>
  </div>
{:else if exercise}
  <div class="meta row">
    <div class="dim meta-txt">
      {muscleGroupLabel[exercise.muscleGroup]} · {equipmentLabel[exercise.equipment]} · {exercise.unit}
    </div>
  </div>

  {#if exercise.image}
    <div class="demo">
      <img src={exercise.image} alt={`${exercise.name} 演示图`} class="demo-img" />
      <div class="dim">本地演示图</div>
    </div>
  {/if}

  {#if goal}
    <div class="goal-card" data-testid="detail-next-goal">
      <span class="dim">下次建议：</span>
      <strong>{goal.weight}×{goal.reps}</strong>
      <span class="dim goal-reason">（{goal.reason}）</span>
    </div>
  {/if}

  <div class="row between formula-bar">
    <span class="dim">1RM 公式</span>
    <select value={formula} on:change={onFormulaChange} aria-label="1RM 公式">
      {#each formulaList as f}
        <option value={f}>{formulaLabels[f]}</option>
      {/each}
    </select>
  </div>

  <div class="stats-grid">
    <div class="stat"><div class="v">{fmt(prWeight, 1)}</div><div class="k">最大重量</div></div>
    <div class="stat"><div class="v">{fmt(pr1RM, 1)}</div><div class="k">估计1RM(PR)</div></div>
    <div class="stat"><div class="v">{totalSets}</div><div class="k">总组数</div></div>
    <div class="stat"><div class="v">{fmt(totalVol, 0)}</div><div class="k">总容量</div></div>
  </div>

  <div class="stats-grid">
    <div class="stat"><div class="v">{fmt(avgRest, 0)}s</div><div class="k">平均组间休息</div></div>
  </div>

  <div class="section-title">
    趋势（{relative ? '相对强度' : '容量 / 1RM'}）
    {#if hasBodyweight}
      <label class="rel-tog" data-testid="relative-toggle">
        <input type="checkbox" bind:checked={relative} />
        相对强度(重量/体重)
      </label>
    {/if}
  </div>
  <TrendChart points={trendShown} unitLabel={exercise.unit} {relative} bodyweights={bwTrend} />

  <div class="section-title">PR 里程碑时间线</div>
  {#if milestones.length === 0}
    <div class="list-empty">暂无 PR 记录</div>
  {:else}
    <ul class="pr-list" data-testid="pr-timeline">
      {#each milestones as m}
        <li class="pr-item">
          <span class="pr-dot" style={`background:${kindColor(m.kind)}`}></span>
          <span class="pr-date">{dateStr(m.date)}</span>
          <span class="pr-label">{m.label}</span>
          <span class="pr-val">{fmt(m.value, m.kind === 'maxVolume' ? 0 : 1)}</span>
        </li>
      {/each}
    </ul>
  {/if}

  <div class="section-title">组类型统计</div>
  <div class="type-row">
    {#each allTypes as t}
      {#if (typeStats[t] ?? 0) > 0}
        <span class="tag t-tag">{setTypeLabel[t]}: {typeStats[t] ?? 0}</span>
      {/if}
    {/each}
    {#if typeStatsSum === 0}
      <span class="dim">暂无</span>
    {/if}
  </div>

  <div class="section-title">历史记录</div>
  {#if history.length === 0}
    <div class="list-empty">暂无历史记录</div>
  {:else}
    {#each history as h}
      <div class="card hist">
        <div class="between">
          <div>
            <button type="button" class="hd" on:click={() => go('workout', { id: h.workoutId })}>{dateStr(h.date)}</button>
            <div class="dim">{h.workoutName}</div>
          </div>
          <div class="dim r">
            顶重 {fmt(h.topWeight, 1)} · 1RM {fmt(h.top1RM, 1)} · 容量 {fmt(h.volume, 0)}
          </div>
        </div>
        <div class="sets-line">
          {#each h.sets as s}
            <span class="set-pill" class:done={s.isCompleted}>
              {s.weight}×{s.reps}{s.rpe ? `@${s.rpe}` : ''}{s.setType && s.setType !== 'normal' && s.setType !== 'working' ? `·${setTypeLabel[s.setType]}` : ''}
            </span>
          {/each}
        </div>
      </div>
    {/each}
  {/if}
{:else}
  <div class="list-empty">加载中…</div>
{/if}

<style>
  .meta {
    margin-bottom: 10px;
  }
  .formula-bar {
    margin: 10px 0;
  }
  .formula-bar select {
    width: auto;
  }
  .meta-txt {
    flex: 1;
  }
  .demo {
    margin-bottom: 10px;
    text-align: center;
  }
  .demo-img {
    max-width: 100%;
    max-height: 220px;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    object-fit: contain;
    background: var(--bg-elev);
  }
  .goal-card {
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-left: 3px solid var(--accent);
    border-radius: var(--radius);
    padding: 8px 10px;
    margin-bottom: 10px;
    font-size: 13px;
    display: flex;
    gap: 6px;
    align-items: baseline;
    flex-wrap: wrap;
  }
  .goal-card strong {
    color: var(--accent);
    font-size: 15px;
  }
  .goal-reason {
    font-size: 11px;
  }
  .stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr;
    gap: 8px;
    margin-bottom: 10px;
  }
  .stats-grid:last-of-type {
    grid-template-columns: 1fr;
  }
  .stat {
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 10px 6px;
    text-align: center;
  }
  .stat .v {
    font-size: 18px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }
  .stat .k {
    font-size: 10px;
    color: var(--fg-dim);
    margin-top: 2px;
  }
  .rel-tog {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--fg-dim);
    margin-left: 8px;
    cursor: pointer;
    font-weight: normal;
  }
  .rel-tog input {
    width: auto;
    accent-color: var(--accent);
  }
  .pr-list {
    list-style: none;
    padding: 0;
    margin: 0 0 10px;
  }
  .pr-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-bottom: 1px solid var(--border);
    font-size: 13px;
  }
  .pr-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .pr-date {
    color: var(--fg-dim);
    font-variant-numeric: tabular-nums;
  }
  .pr-label {
    flex: 1;
  }
  .pr-val {
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .type-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 6px;
  }
  .t-tag {
    background: var(--bg-elev2);
  }
  .hist .hd {
    font-weight: 600;
    cursor: pointer;
    background: none;
    border: none;
    color: inherit;
    padding: 0;
    font: inherit;
  }
  .r {
    text-align: right;
  }
  .sets-line {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 8px;
  }
  .set-pill {
    background: var(--bg-elev2);
    border-radius: 6px;
    padding: 2px 6px;
    font-size: 12px;
    opacity: 0.6;
  }
  .set-pill.done {
    opacity: 1;
    color: var(--accent);
  }
</style>