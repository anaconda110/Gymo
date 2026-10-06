<script lang="ts">
  import { onMount } from 'svelte';
  import { db } from '../lib/db';
  import { go } from '../lib/router';
  import { getTemplates, startFromTemplate } from '../lib/workout';
  import { exportTemplateJSON, importTemplateJSON, download, readFileText } from '../lib/exportImport';
  import type { Template, TemplateExercise, Exercise } from '../lib/types';

  let templates: Template[] = [];
  let allExercises: Exercise[] = [];
  let exMap: Record<number, Exercise> = {};
  let teCounts: Record<number, number> = {};
  let importMsg = '';

  async function refresh() {
    templates = await getTemplates();
    allExercises = await db.exercises.toArray();
    exMap = Object.fromEntries(allExercises.map((e) => [e.id!, e]));
    const te = await db.templateExercises.toArray();
    teCounts = {};
    for (const t of te) {
      teCounts[t.templateId] = (teCounts[t.templateId] ?? 0) + 1;
    }
  }
  onMount(refresh);

  async function start(t: Template) {
    if (!t.id) return;
    const id = await startFromTemplate(t.id);
    go('workout', { id });
  }

  async function remove(t: Template) {
    if (!t.id || !confirm(`删除模板「${t.name}」？`)) return;
    await db.transaction('rw', db.templates, db.templateExercises, async () => {
      await db.templateExercises.where('templateId').equals(t.id!).delete();
      await db.templates.delete(t.id!);
    });
    refresh();
  }

  async function createBlank() {
    const id = await db.templates.add({ name: '新计划', createdAt: Date.now() });
    go('template-edit', { id: id as number });
  }

  async function exportTemplate(t: Template) {
    if (!t.id) return;
    const text = await exportTemplateJSON(t.id);
    download(`gymo-template-${t.name}-${Date.now()}.json`, text, 'application/json');
  }

  async function onImport(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const text = await readFileText(file);
      const newId = await importTemplateJSON(text, 'new');
      importMsg = `导入成功，新模板 id=${newId}`;
      await refresh();
    } catch (err) {
      importMsg = '导入失败：' + (err as Error).message;
    } finally {
      input.value = '';
    }
  }
</script>

<div class="topbar">
  <h1>计划 / 模板</h1>
  <button type="button" class="btn btn-primary small" on:click={createBlank}>＋ 新建</button>
</div>

<p class="dim intro">创建可复用训练结构，一键开始训练；支持导出/导入本地 .json 模板文件。</p>

<div class="card import-card">
  <label class="btn btn-ghost btn-block">
    从本地 .json 文件导入模板
    <input type="file" accept="application/json" style="display:none" on:change={onImport} />
  </label>
  {#if importMsg}<p class="dim" style="margin-top:8px">{importMsg}</p>{/if}
</div>

{#if templates.length === 0}
  <div class="list-empty">还没有模板，点击右上角新建，或从本地文件导入。</div>
{:else}
  {#each templates as t}
    <div class="card tcard">
      <button type="button" class="ex-main" on:click={() => go('template-edit', { id: t.id ?? 0 })}>
        <div class="n">{t.name}</div>
        <div class="dim">{teCounts[t.id ?? 0] ?? 0} 个动作 {t.description ? `· ${t.description}` : ''}</div>
      </button>
      <div class="t-actions">
        <button type="button" class="btn btn-primary small" on:click={() => start(t)}>开始</button>
        <button type="button" class="btn btn-ghost small" on:click={() => exportTemplate(t)}>导出</button>
        <button type="button" class="btn btn-danger small" on:click={() => remove(t)}>删除</button>
      </div>
    </div>
  {/each}
{/if}

<style>
  .small {
    padding: 6px 12px;
    font-size: 13px;
  }
  .intro {
    margin-bottom: 12px;
  }
  .import-card {
    margin-bottom: 12px;
  }
  .tcard {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }
  .ex-main {
    flex: 1;
    cursor: pointer;
    text-align: left;
    background: none;
    border: none;
    color: inherit;
    padding: 0;
    font: inherit;
  }
  .n {
    font-weight: 700;
  }
  .t-actions {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
</style>