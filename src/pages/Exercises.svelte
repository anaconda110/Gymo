<script lang="ts">
  import { onMount } from 'svelte';
  import { db } from '../lib/db';
  import { go } from '../lib/router';
  import type { Exercise, MuscleGroup, Equipment, Unit } from '../lib/types';
  import { muscleGroupLabel, equipmentLabel, muscleGroups, equipments } from '../lib/seed';

  let exercises: Exercise[] = [];
  let search = '';
  let filterGroup = '';
  let showEditor = false;
  let editing: Exercise | null = null;
  let imgTooLarge = '';

  const blank = (): Exercise => ({
    name: '',
    muscleGroup: 'chest',
    equipment: 'barbell',
    unit: 'kg',
    isCustom: true,
    notes: '',
    image: undefined,
    createdAt: Date.now()
  });

  async function refresh() {
    exercises = (await db.exercises.toArray()).sort((a, b) => a.name.localeCompare(b.name));
  }

  onMount(refresh);

  $: filtered = exercises.filter((e) => {
    if (filterGroup && e.muscleGroup !== filterGroup) return false;
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  async function save() {
    if (!editing || !editing.name.trim()) return;
    if (editing.id) {
      await db.exercises.update(editing.id, editing);
    } else {
      await db.exercises.add(editing);
    }
    showEditor = false;
    editing = null;
    refresh();
  }

  // 读取本地图片为 base64 data URL 存入 IndexedDB（纯本地，无网络）
  async function pickImage(e: Event) {
    imgTooLarge = '';
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const cur = editing;
    if (!cur) return;
    if (file.size > 1_500_000) {
      imgTooLarge = '图片过大(>1.5MB)，请选小图';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (!editing) return;
      editing = { ...editing, image: String(reader.result) };
      editing = editing; // 触发响应式
    };
    reader.readAsDataURL(file);
  }

  function clearImage() {
    if (!editing) return;
    editing = { ...editing, image: undefined };
    editing = editing;
  }

  function newEx() {
    editing = blank();
    showEditor = true;
  }

  async function remove(ex: Exercise) {
    if (!confirm(`删除动作「${ex.name}」？历史记录将保留。`)) return;
    if (ex.id) await db.exercises.delete(ex.id);
    refresh();
  }
</script>

<div class="topbar">
  <h1>动作库</h1>
  <button type="button" class="btn btn-primary small" on:click={newEx}>＋ 新增</button>
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

{#each filtered as ex}
  <div class="card ex-row">
    <button type="button" class="ex-main" on:click={() => go('exercise', { id: ex.id ?? 0 })}>
      {#if ex.image}
        <img class="thumb" src={ex.image} alt="" />
      {/if}
      <div class="ex-text">
        <div class="n">{ex.name}</div>
        <div class="dim">
          {muscleGroupLabel[ex.muscleGroup]} · {equipmentLabel[ex.equipment]} · {ex.unit}
          {ex.isCustom ? '' : ' · 内置'}
        </div>
      </div>
    </button>
    <div class="ex-actions">
      <button type="button" class="mini" on:click={() => { editing = { ...ex }; showEditor = true; }}>✎</button>
      <button type="button" class="mini danger" on:click={() => remove(ex)}>✕</button>
    </div>
  </div>
{:else}
  <div class="list-empty">无匹配动作</div>
{/each}

{#if showEditor && editing}
  <div class="picker">
    <button type="button" class="picker-backdrop" aria-label="关闭编辑动作" on:click={() => (showEditor = false)}></button>
    <div class="picker-sheet" role="dialog" aria-modal="true" aria-label="编辑动作">
      <div class="between">
        <h3>{editing.id ? '编辑动作' : '新增动作'}</h3>
        <button type="button" aria-label="关闭" on:click={() => (showEditor = false)}>✕</button>
      </div>
      <label class="lbl" for="ex-name">名称</label>
      <input id="ex-name" bind:value={editing.name} placeholder="如：杠铃卧推" />

      <label class="lbl" for="ex-group">部位</label>
      <select id="ex-group" bind:value={editing.muscleGroup}>
        {#each muscleGroups as g}<option value={g}>{muscleGroupLabel[g]}</option>{/each}
      </select>

      <label class="lbl" for="ex-equip">器械</label>
      <select id="ex-equip" bind:value={editing.equipment}>
        {#each equipments as e}<option value={e}>{equipmentLabel[e]}</option>{/each}
      </select>

      <label class="lbl" for="ex-unit">单位</label>
      <select id="ex-unit" bind:value={editing.unit}>
        <option value="kg">kg</option>
        <option value="lb">lb</option>
      </select>

      <label class="lbl" for="ex-notes">备注</label>
      <textarea id="ex-notes" rows="2" bind:value={editing.notes}></textarea>

      <label class="lbl" for="ex-image">演示图（本地图片，base64 存入 IndexedDB）</label>
      {#if editing.image}
        <div class="img-preview">
          <img src={editing.image} alt="演示图" class="preview-img" />
          <button type="button" class="btn btn-danger small" on:click={clearImage}>移除图片</button>
        </div>
      {:else}
        <label class="btn btn-ghost btn-block">
          选择本地图片
          <input id="ex-image" type="file" accept="image/*" style="display:none" on:change={pickImage} />
        </label>
      {/if}
      {#if imgTooLarge}<p class="dim" style="color:var(--danger); margin-top:6px">{imgTooLarge}</p>{/if}

      <button type="button" class="btn btn-primary btn-block" style="margin-top:12px" on:click={save}>保存</button>
    </div>
  </div>
{/if}

<style>
  .small {
    padding: 6px 12px;
    font-size: 13px;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 10px 0;
  }
  .ex-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .ex-main {
    flex: 1;
    cursor: pointer;
    text-align: left;
    background: none;
    border: none;
    color: inherit;
    padding: 0;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .thumb {
    width: 40px;
    height: 40px;
    object-fit: cover;
    border-radius: 6px;
    border: 1px solid var(--border);
    flex-shrink: 0;
  }
  .ex-text {
    flex: 1;
  }
  .n {
    font-weight: 600;
  }
  .ex-actions {
    display: flex;
    gap: 6px;
  }
  .mini {
    background: var(--bg-elev2);
    border-radius: 6px;
    width: 30px;
    height: 30px;
  }
  .mini.danger {
    color: var(--danger);
  }
  .img-preview {
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
    margin-top: 4px;
  }
  .preview-img {
    max-width: 100%;
    max-height: 200px;
    border-radius: 8px;
    border: 1px solid var(--border);
    object-fit: contain;
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
    max-height: 86vh;
    overflow-y: auto;
  }
  .lbl {
    display: block;
    color: var(--fg-dim);
    font-size: 12px;
    margin: 10px 0 4px;
  }
</style>