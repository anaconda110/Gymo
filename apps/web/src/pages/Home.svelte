<script lang="ts">
  import { onMount } from 'svelte';
  import { go } from '../lib/router';
  import { db } from '../lib/db';
  import { createWorkout, listWorkouts, startFromTemplate, getTemplates } from '../lib/workout';
  import type { Workout, Template } from '../lib/types';
  import { fmt } from '../lib/stats';

  let workouts: Workout[] = [];
  let templates: Template[] = [];

  async function refresh() {
    workouts = await listWorkouts();
    templates = await getTemplates();
  }

  onMount(refresh);

  async function startEmpty() {
    const id = await createWorkout();
    go('workout', { id });
  }

  async function startTemplate(tid: number) {
    const id = await startFromTemplate(tid);
    go('workout', { id });
  }

  function dateStr(ts: number): string {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return '今天';
    return d.toLocaleDateString();
  }
</script>

<div class="topbar">
  <h1>Gymo</h1>
  <span class="dim">纯本地训练记录</span>
</div>

<div class="hero">
  <button type="button" class="btn btn-primary btn-block big" on:click={startEmpty}>
    ＋ 开始空训练
  </button>
  <p class="dim center">直接开始记录并计时，无需先建计划</p>
</div>

{#if templates.length > 0}
  <div class="section-title">从模板开始</div>
  <div class="tmpl-row">
    {#each templates as t}
      <button type="button" class="chip tmpl" on:click={() => startTemplate(t.id ?? 0)}>{t.name}</button>
    {/each}
  </div>
{/if}

<div class="section-title">训练历史</div>
{#if workouts.length === 0}
  <div class="list-empty">还没有训练记录，点击上方按钮开始第一次训练。</div>
{:else}
  {#each workouts.slice(0, 20) as w}
    <button type="button" class="card wl" on:click={() => go('workout', { id: w.id ?? 0 })}>
      <div class="between">
        <div>
          <div class="w-name">{w.name}</div>
          <div class="dim">{dateStr(w.date)}{w.durationSec ? ` · ${Math.round(w.durationSec / 60)}min` : ' · 进行中'}</div>
        </div>
        <span class="tag">{fmt(w.id ?? 0, 0)}</span>
      </div>
    </button>
  {/each}
{/if}

<style>
  .hero {
    padding: 18px 0;
  }
  .big {
    padding: 16px;
    font-size: 17px;
  }
  .center {
    text-align: center;
    margin-top: 8px;
  }
  .tmpl-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .chip.tmpl {
    padding: 6px 12px;
    font-size: 13px;
  }
  .wl {
    cursor: pointer;
    display: block;
    width: 100%;
    text-align: left;
  }
  .wl:active {
    background: var(--bg-elev2);
  }
  .w-name {
    font-weight: 600;
  }
</style>