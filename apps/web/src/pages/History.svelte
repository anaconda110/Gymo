<script lang="ts">
  import { onMount } from 'svelte';
  import {
    getAllExercisesWithStats,
    getDailyAggregates,
    getSetTypeStats,
    getWorkoutAvgRest,
    type DayAgg
  } from '../lib/history';
  import { go } from '../lib/router';
  import { listWorkouts } from '../lib/workout';
  import type { Workout } from '../lib/types';
  import { fmt } from '../lib/stats';
  import { muscleGroupLabel, setTypeLabel } from '../lib/seed';
  import { weeklyAggregates, monthlyAggregates, type PeriodAgg } from '../lib/p2';

  let mode: 'exercises' | 'log' | 'calendar' = 'exercises';
  let exStats: Awaited<ReturnType<typeof getAllExercisesWithStats>> = [];
  let workouts: Workout[] = [];
  let dayMap: Map<string, DayAgg> = new Map();
  let maxDayVol = 1;
  let restMap: Map<number, number> = new Map();

  // 日历当前视图月份
  let viewYear = new Date().getFullYear();
  let viewMonth = new Date().getMonth(); // 0-based
  // 日历子视图：月 / 年
  let calMode: 'month' | 'year' = 'month';
  // 年视图当前年份
  let yearViewYear = new Date().getFullYear();

  async function refresh() {
    exStats = await getAllExercisesWithStats();
    workouts = await listWorkouts();
    dayMap = await getDailyAggregates();
    maxDayVol = Math.max(1, ...[...dayMap.values()].map((d) => d.volume));
    restMap = await getWorkoutAvgRest();
  }
  onMount(refresh);

  function dateStr(ts: number): string {
    return new Date(ts).toLocaleString();
  }

  // 日历网格计算
  const WEEK_HEAD = ['一', '二', '三', '四', '五', '六', '日'];

  function ymdKey(y: number, m: number, d: number): string {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d + 0).padStart(2, '0')}`;
  }

  function monthMatrix(y: number, m: number): (number | null)[] {
    const first = new Date(y, m, 1);
    let firstWeekday = first.getDay(); // 0=Sun
    firstWeekday = firstWeekday === 0 ? 6 : firstWeekday - 1;
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }

  $: cells = monthMatrix(viewYear, viewMonth);
  $: monthLabel = `${viewYear} 年 ${viewMonth + 1} 月`;

  function prevMonth() {
    if (viewMonth === 0) {
      viewMonth = 11;
      viewYear -= 1;
    } else {
      viewMonth -= 1;
    }
  }
  function nextMonth() {
    if (viewMonth === 11) {
      viewMonth = 0;
      viewYear += 1;
    } else {
      viewMonth += 1;
    }
  }
  function goToday() {
    const n = new Date();
    viewYear = n.getFullYear();
    viewMonth = n.getMonth();
  }

  // 热力色阶：0 -> 透明；越大越偏橙红
  function heatColor(vol: number): string {
    if (vol <= 0) return 'transparent';
    const t = Math.min(1, vol / maxDayVol);
    const alpha = 0.25 + 0.75 * t;
    return `rgba(255, 90, 31, ${alpha.toFixed(2)})`;
  }

  function clickDay(d: number | null) {
    if (d == null) return;
    const key = ymdKey(viewYear, viewMonth, d);
    const agg = dayMap.get(key);
    if (agg && agg.workoutIds.length) {
      go('workout', { id: agg.workoutIds[0] });
    }
  }

  function isToday(d: number | null): boolean {
    if (d == null) return false;
    const n = new Date();
    return viewYear === n.getFullYear() && viewMonth === n.getMonth() && d === n.getDate();
  }

  function typeLabelOf(k: string): string {
    return (setTypeLabel as Record<string, string>)[k] ?? k;
  }

  // 组类型统计总览（复用统一一份）
  let typeStats: Record<string, number> = {};
  async function loadTypeStats() {
    typeStats = await getSetTypeStats();
  }
  onMount(loadTypeStats);

  // 周/月聚合
  $: weekAggs = weeklyAggregates(dayMap);
  $: monthAggs = monthlyAggregates(dayMap);
  $: maxWeekVol = Math.max(1, ...weekAggs.map((w) => w.volume));
  $: maxMonthVol = Math.max(1, ...monthAggs.map((w) => w.volume));

  // 年视图：12 个月的月度热力缩略（复用 monthAggs 容量作为色阶）
  $: yearMonths = Array.from({ length: 12 }, (_, m) => {
    const mk = `${yearViewYear}-${String(m + 1).padStart(2, '0')}`;
    const agg = monthAggs.find((a) => a.key === mk);
    return { m, vol: agg?.volume ?? 0, sessions: agg?.sessions ?? 0, sets: agg?.sets ?? 0 };
  });
  $: maxYearMonthVol = Math.max(1, ...yearMonths.map((y) => y.vol));

  function yearHeatColor(vol: number): string {
    if (vol <= 0) return 'transparent';
    const t = Math.min(1, vol / maxYearMonthVol);
    const alpha = 0.25 + 0.75 * t;
    return `rgba(255, 90, 31, ${alpha.toFixed(2)})`;
  }

  function barHeight(v: number, max: number): number {
    return Math.round((Math.min(1, v / max)) * 48);
  }
</script>

<div class="topbar"><h1>历史 / 统计</h1></div>

<div class="seg">
  <button type="button" class="seg-btn" class:active={mode === 'exercises'} on:click={() => (mode = 'exercises')}>按动作</button>
  <button type="button" class="seg-btn" class:active={mode === 'log'} on:click={() => (mode = 'log')}>按日期</button>
  <button type="button" class="seg-btn" class:active={mode === 'calendar'} on:click={() => (mode = 'calendar')}>日历</button>
</div>

{#if mode === 'exercises'}
  <div class="section-title">动作 PR 排行（估计1RM）</div>
  {#each exStats as row}
    <button type="button" class="card ex-row" on:click={() => go('exercise', { id: row.exercise.id ?? 0 })}>
      <div class="ex-main">
        <div class="n">{row.exercise.name}</div>
        <div class="dim">{muscleGroupLabel[row.exercise.muscleGroup]} · {row.totalSets} 组</div>
      </div>
      <div class="r">
        <div class="big">{fmt(row.pr1RM, 1)}</div>
        <div class="dim">1RM · 顶重 {fmt(row.prWeight, 1)}</div>
      </div>
    </button>
  {:else}
    <div class="list-empty">暂无数据</div>
  {/each}

  <div class="section-title">组类型统计</div>
  <div class="type-row">
    {#each Object.entries(typeStats) as [k, v]}
      <span class="tag">{typeLabelOf(k)}: {v}</span>
    {/each}
    {#if Object.keys(typeStats).length === 0}
      <span class="dim">暂无</span>
    {/if}
  </div>
{:else if mode === 'log'}
  <div class="section-title">训练日志</div>
  {#each workouts as w}
    <button type="button" class="card" on:click={() => go('workout', { id: w.id ?? 0 })}>
      <div class="n">{w.name}</div>
      <div class="dim">
        {dateStr(w.date)}{w.durationSec ? ` · ${Math.round(w.durationSec / 60)}min` : ''}
        {#if restMap.get(w.id ?? -1) != null} · 平均休息 {fmt(restMap.get(w.id ?? -1) ?? 0, 0)}s{/if}
      </div>
    </button>
  {:else}
    <div class="list-empty">暂无训练</div>
  {/each}
{:else}
  <div class="cal-subseg">
    <button type="button" class="seg-btn small" class:active={calMode === 'month'} on:click={() => (calMode = 'month')}>月视图</button>
    <button type="button" class="seg-btn small" class:active={calMode === 'year'} on:click={() => (calMode = 'year')}>年视图</button>
  </div>

  {#if calMode === 'month'}
    <div class="section-title">训练日历（热力图）</div>
    <div class="cal-nav">
      <button type="button" class="btn btn-ghost small" on:click={prevMonth}>‹</button>
      <span class="month-label">{monthLabel}</span>
      <button type="button" class="btn btn-ghost small" on:click={nextMonth}>›</button>
      <button type="button" class="btn btn-ghost small today" on:click={goToday}>今天</button>
    </div>

    <div class="calendar" role="grid" aria-label="训练日历">
      <div class="week-head">
        {#each WEEK_HEAD as h}
          <div class="wh">{h}</div>
        {/each}
      </div>
      <div class="grid">
        {#each cells as d}
          {@const key = d == null ? '' : ymdKey(viewYear, viewMonth, d)}
          {@const agg = d == null ? null : (dayMap.get(key) ?? null)}
          <button type="button" class="cell" class:empty={d == null} class:today={isToday(d)}
            style={`background:${d != null && agg ? heatColor(agg.volume) : 'transparent'}`}
            disabled={d == null || !agg || agg.workoutIds.length === 0}
            on:click={() => clickDay(d)}
            title={d != null && agg ? `${key} · 容量 ${fmt(agg.volume, 0)} · ${agg.sets} 组` : ''}
            aria-label={d != null ? `${key}${agg && agg.workoutIds.length ? '，有训练' : ''}` : ''}>
            {#if d != null}
              <span class="d-num">{d}</span>
              {#if agg && agg.volume > 0}
                <span class="d-dot"></span>
              {/if}
            {/if}
          </button>
        {/each}
      </div>
    </div>

    <div class="legend">
      <span class="dim">少</span>
      <span class="legend-cell" style="background:rgba(255,90,31,0.25)"></span>
      <span class="legend-cell" style="background:rgba(255,90,31,0.55)"></span>
      <span class="legend-cell" style="background:rgba(255,90,31,0.85)"></span>
      <span class="dim">多</span>
      <span class="dim" style="margin-left:auto">点击有训练的日期查看</span>
    </div>
  {:else}
    <div class="section-title">年视图（{yearViewYear} 年 · 月度热力缩略）</div>
    <div class="cal-nav">
      <button type="button" class="btn btn-ghost small" on:click={() => (yearViewYear -= 1)}>‹</button>
      <span class="month-label">{yearViewYear} 年</span>
      <button type="button" class="btn btn-ghost small" on:click={() => (yearViewYear += 1)}>›</button>
    </div>
    <div class="year-grid" data-testid="year-view">
      {#each yearMonths as ym}
        <div class="ym" title={`${yearViewYear}-${String(ym.m + 1).padStart(2, '0')} · 容量 ${fmt(ym.vol, 0)} · ${ym.sessions} 次训练`}
          style={`background:${yearHeatColor(ym.vol)}`}>
          <div class="ym-label">{ym.m + 1}月</div>
          <div class="ym-vol">{fmt(ym.vol, 0)}</div>
          <div class="ym-sess">{ym.sessions} 次</div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- 周/月聚合汇总（内联 SVG 柱状 + 数值卡） -->
  <div class="section-title">每周容量汇总</div>
  {#if weekAggs.length === 0}
    <div class="list-empty">暂无数据</div>
  {:else}
    <div class="agg-bars" data-testid="weekly-agg">
      <svg class="agg-svg" viewBox="0 0 {weekAggs.length * 36 + 8} 64" preserveAspectRatio="xMidYMid meet" role="img" aria-label="每周容量柱状图">
        {#each weekAggs as w, i}
          {@const h = barHeight(w.volume, maxWeekVol)}
          <rect x={i * 36 + 4} y={54 - h} width="28" height={h} class="bar" />
          <text x={i * 36 + 18} y="62" text-anchor="middle" class="bar-x">{w.label.slice(5)}</text>
        {/each}
      </svg>
    </div>
    <div class="agg-cards">
      {#each weekAggs as w}
        <div class="agg-card">
          <div class="agg-k">{w.label}</div>
          <div class="agg-v">{fmt(w.volume, 0)}</div>
          <div class="dim agg-sub">{w.sessions} 次 · {w.sets} 组</div>
        </div>
      {/each}
    </div>
  {/if}

  <div class="section-title">每月容量汇总</div>
  {#if monthAggs.length === 0}
    <div class="list-empty">暂无数据</div>
  {:else}
    <div class="agg-bars" data-testid="monthly-agg">
      <svg class="agg-svg" viewBox="0 0 {monthAggs.length * 36 + 8} 64" preserveAspectRatio="xMidYMid meet" role="img" aria-label="每月容量柱状图">
        {#each monthAggs as w, i}
          {@const h = barHeight(w.volume, maxMonthVol)}
          <rect x={i * 36 + 4} y={54 - h} width="28" height={h} class="bar" />
          <text x={i * 36 + 18} y="62" text-anchor="middle" class="bar-x">{w.label.slice(5)}</text>
        {/each}
      </svg>
    </div>
    <div class="agg-cards">
      {#each monthAggs as w}
        <div class="agg-card">
          <div class="agg-k">{w.label}</div>
          <div class="agg-v">{fmt(w.volume, 0)}</div>
          <div class="dim agg-sub">{w.sessions} 次 · {w.sets} 组</div>
        </div>
      {/each}
    </div>
  {/if}
{/if}

<style>
  .seg { display:flex; gap:0; margin-bottom:12px; border:1px solid var(--border); border-radius:8px; overflow:hidden; }
  .seg-btn { flex:1; padding:8px; color: var(--fg-dim); }
  .seg-btn.active { background: var(--accent); color:#fff; }
  .seg-btn.small { flex:0 0 auto; padding:6px 14px; font-size:13px; }
  .cal-subseg { display:flex; gap:6px; margin-bottom:10px; }
  .card { text-align:left; }
  .ex-row { display:flex; justify-content:space-between; align-items:center; cursor:pointer; width:100%; text-align:left; }
  .n { font-weight:600; }
  .r { text-align:right; }
  .big { font-size:18px; font-weight:800; font-variant-numeric: tabular-nums; }
  .type-row { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px; }

  .cal-nav { display:flex; align-items:center; gap:8px; margin-bottom:10px; }
  .cal-nav .month-label { flex:1; text-align:center; font-weight:600; }
  .small { padding:6px 10px; font-size:13px; }
  .today { margin-left:auto; }
  .calendar { background: var(--bg-elev); border:1px solid var(--border); border-radius: var(--radius); padding:8px; }
  .week-head { display:grid; grid-template-columns: repeat(7, 1fr); margin-bottom:6px; }
  .wh { text-align:center; color: var(--fg-dim); font-size:11px; }
  .grid { display:grid; grid-template-columns: repeat(7, 1fr); gap:3px; }
  .cell {
    aspect-ratio: 1 / 1;
    border: 1px solid var(--border);
    border-radius: 6px;
    position: relative;
    display:flex;
    align-items:flex-start;
    justify-content:flex-start;
    padding: 3px;
    color: var(--fg-dim);
    font-size: 11px;
    cursor: pointer;
  }
  .cell:disabled { cursor: default; }
  .cell.empty { border-color: transparent; background: transparent !important; cursor: default; }
  .cell.today { border-color: var(--accent); }
  .d-dot {
    position:absolute;
    right:4px;
    bottom:4px;
    width:6px;
    height:6px;
    border-radius:50%;
    background: var(--accent);
  }
  .legend { display:flex; align-items:center; gap:6px; margin-top:8px; }
  .legend-cell { width:14px; height:14px; border-radius:3px; display:inline-block; border:1px solid var(--border); }

  .year-grid {
    display:grid;
    grid-template-columns: repeat(3, 1fr);
    gap:8px;
    margin-bottom:10px;
  }
  .ym {
    border:1px solid var(--border);
    border-radius:8px;
    padding:8px 6px;
    text-align:center;
    min-height:64px;
  }
  .ym-label { font-size:13px; font-weight:700; }
  .ym-vol { font-size:16px; font-weight:800; font-variant-numeric: tabular-nums; }
  .ym-sess { font-size:11px; color: var(--fg-dim); }

  .agg-bars { background: var(--bg-elev); border:1px solid var(--border); border-radius: var(--radius); padding:8px; margin-bottom:8px; overflow-x:auto; }
  .agg-svg { height:64px; display:block; }
  .agg-svg .bar { fill: var(--accent); }
  .agg-svg .bar-x { fill: var(--fg-dim); font-size: 8px; }
  .agg-cards { display:flex; gap:8px; overflow-x:auto; margin-bottom:10px; }
  .agg-card {
    background: var(--bg-elev);
    border:1px solid var(--border);
    border-radius: var(--radius);
    padding:8px 10px;
    min-width:110px;
    flex-shrink:0;
  }
  .agg-k { font-size:11px; color: var(--fg-dim); }
  .agg-v { font-size:16px; font-weight:800; font-variant-numeric: tabular-nums; }
  .agg-sub { font-size:11px; }
</style>