<script lang="ts">
  import { onMount } from 'svelte';
  import { route, go } from '../lib/router';
  import { db } from '../lib/db';
  import { startFromTemplate } from '../lib/workout';
  import type { Template, TemplateExercise, Exercise } from '../lib/types';
  import { muscleGroupLabel } from '../lib/seed';

  let templateId = Number($route.params.id);
  let template: Template | null = null;
  let notFound = false;
  let items: TemplateExercise[] = [];
  let allExercises: Exercise[] = [];
  let exMap: Record<number, Exercise> = {};
  let showAdd = false;
  let pickedId = 0;
  let targetSets = 3;
  let targetReps = 8;
  let targetWeight = 0;

  async function refresh() {
    template = (await db.templates.get(templateId)) ?? null;
    if (!template) {
      notFound = true;
      return;
    }
    notFound = false;
    items = (await db.templateExercises.where('templateId').equals(templateId).toArray()).sort(
      (a, b) => a.order - b.order
    );
    allExercises = await db.exercises.toArray();
    exMap = Object.fromEntries(allExercises.map((e) => [e.id!, e]));
  }
  onMount(refresh);

  async function saveName() {
    if (template) await db.templates.update(templateId, { name: template.name, description: template.description });
  }

  async function addEx() {
    if (!pickedId) return;
    const order = items.length;
    await db.templateExercises.add({
      templateId,
      exerciseId: pickedId,
      order,
      targetSets,
      targetReps,
      targetWeight
    });
    showAdd = false;
    pickedId = 0;
    refresh();
  }

  function val(e: Event): number {
    return Number((e.target as HTMLInputElement).value);
  }

  async function updateItem(it: TemplateExercise, field: keyof TemplateExercise, value: number) {
    await db.templateExercises.update(it.id!, { [field]: value } as Partial<TemplateExercise>);
    refresh();
  }

  async function removeItem(it: TemplateExercise) {
    if (!it.id) return;
    await db.templateExercises.delete(it.id);
    refresh();
  }

  async function start() {
    if (!template) return;
    const id = await startFromTemplate(templateId);
    go('workout', { id });
  }
</script>

<div class="topbar">
  <div class="row">
    <button type="button" class="back" on:click={() => go('templates')}>‹</button>
    <h1>{template?.name ?? '编辑模板'}</h1>
  </div>
  <button type="button" class="btn btn-primary small" on:click={start}>开始训练</button>
</div>

{#if template}
  <label class="lbl" for="tmpl-name">模板名称</label>
  <input id="tmpl-name" bind:value={template.name} on:change={saveName} />

  <label class="lbl" for="tmpl-desc">说明</label>
  <input id="tmpl-desc" bind:value={template.description} on:change={saveName} />

  <div class="section-title">动作列表（{items.length}）</div>
  {#each items as it}
    <div class="card it">
      <div class="between">
        <div class="n">{exMap[it.exerciseId]?.name ?? '(已删除)'}</div>
        <button type="button" class="mini danger" on:click={() => removeItem(it)}>✕</button>
      </div>
      <div class="dim">{muscleGroupLabel[exMap[it.exerciseId]?.muscleGroup ?? 'fullbody']}</div>
      <div class="row inputs">
        <label>组数<input class="narrow" type="number" value={it.targetSets}
          on:change={(e) => updateItem(it, 'targetSets', val(e))} /></label>
        <label>目标次数<input class="narrow" type="number" value={it.targetReps}
          on:change={(e) => updateItem(it, 'targetReps', val(e))} /></label>
        <label>起始重量<input class="narrow" type="number" value={it.targetWeight}
          on:change={(e) => updateItem(it, 'targetWeight', val(e))} /></label>
      </div>
    </div>
  {:else}
    <div class="list-empty">还没有动作</div>
  {/each}

  <button type="button" class="btn btn-ghost btn-block" on:click={() => (showAdd = true)}>＋ 添加动作</button>
{:else if notFound}
  <div class="list-empty" style="padding-top:40px">
    <p style="font-size:16px; font-weight:700; margin-bottom:8px">模板不存在</p>
    <p class="dim" style="margin-bottom:16px">该模板可能已被删除，或链接有误。</p>
    <button type="button" class="btn btn-primary" on:click={() => go('templates')}>返回计划列表</button>
  </div>
{:else}
  <div class="list-empty">加载中…</div>
{/if}

{#if showAdd}
  <div class="picker">
    <button type="button" class="picker-backdrop" aria-label="关闭添加动作" on:click={() => (showAdd = false)}></button>
    <div class="picker-sheet" role="dialog" aria-modal="true" aria-label="添加动作到模板">
      <div class="between">
        <h3>添加动作到模板</h3>
        <button type="button" aria-label="关闭" on:click={() => (showAdd = false)}>✕</button>
      </div>
      <select bind:value={pickedId}>
        <option value={0}>选择动作…</option>
        {#each allExercises as ex}<option value={ex.id}>{ex.name}</option>{/each}
      </select>
      <div class="row inputs" style="margin-top:10px">
        <label>组数<input class="narrow" type="number" bind:value={targetSets} /></label>
        <label>次数<input class="narrow" type="number" bind:value={targetReps} /></label>
        <label>重量<input class="narrow" type="number" bind:value={targetWeight} /></label>
      </div>
      <button type="button" class="btn btn-primary btn-block" style="margin-top:12px" on:click={addEx}>添加</button>
    </div>
  </div>
{/if}

<style>
  .small { padding: 6px 12px; font-size: 13px; }
  .lbl { display:block; color: var(--fg-dim); font-size:12px; margin:10px 0 4px; }
  .n { font-weight:700; }
  .inputs { gap:12px; margin-top:8px; flex-wrap:wrap; }
  .inputs label { font-size:12px; color: var(--fg-dim); display:flex; flex-direction:column; gap:4px; }
  .mini.danger { color: var(--danger); background:var(--bg-elev2); border-radius:6px; width:28px; height:28px; }
  .picker { position: fixed; inset:0; z-index:50; display:flex; align-items:flex-end; justify-content:center; }
  .picker-backdrop { position:absolute; inset:0; background:rgba(0,0,0,.5); border:none; cursor:pointer; padding:0; }
  .picker-sheet { position:relative; background: var(--bg-elev); width:100%; max-width:640px; margin:0 auto; border-radius:16px 16px 0 0; padding:14px; }
</style>