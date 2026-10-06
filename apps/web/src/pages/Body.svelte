<script lang="ts">
  import { onMount } from 'svelte';
  import { db } from '../lib/db';
  import type { BodyMeasurement } from '../lib/types';
  import LineChart from '../components/LineChart.svelte';
  import Picker from '../components/Picker.svelte';
  import { settings } from '../lib/settings';
  import { dateInputValue, parseDateInput, dateStr } from '../lib/date';

  let list: BodyMeasurement[] = [];
  let editing: BodyMeasurement | null = null;
  let showEditor = false;
  let hint = '';

  function blank(): BodyMeasurement {
    return {
      date: Date.now(),
      bodyweight: undefined,
      bodyfat: undefined,
      chest: undefined,
      waist: undefined,
      hip: undefined,
      arm: undefined,
      thigh: undefined,
      note: ''
    };
  }

  async function refresh() {
    list = (await db.bodyMeasurements.toArray()).sort((a, b) => b.date - a.date);
  }
  onMount(refresh);

  function startAdd() {
    editing = blank();
    showEditor = true;
  }

  function edit(row: BodyMeasurement) {
    editing = { ...row };
    showEditor = true;
  }

  function num(v: string): number | undefined {
    if (v === '') return undefined;
    const n = parseFloat(v);
    if (isNaN(n)) return undefined;
    if (n < 0) {
      hint = '数值不能为负';
      return undefined;
    }
    return n;
  }

  async function save() {
    if (!editing) return;
    const row: BodyMeasurement = {
      date: editing.date,
      bodyweight: editing.bodyweight,
      bodyfat: editing.bodyfat,
      chest: editing.chest,
      waist: editing.waist,
      hip: editing.hip,
      arm: editing.arm,
      thigh: editing.thigh,
      note: editing.note
    };
    if (editing.id) {
      await db.bodyMeasurements.update(editing.id, row);
    } else {
      await db.bodyMeasurements.add(row);
    }
    showEditor = false;
    editing = null;
    refresh();
  }

  async function remove(row: BodyMeasurement) {
    if (!row.id || !confirm('删除该条身体测量记录？')) return;
    await db.bodyMeasurements.delete(row.id);
    refresh();
  }

  function setField(e: Event, field: keyof BodyMeasurement) {
    if (!editing) return;
    const v = (e.target as HTMLInputElement).value;
    const n = num(v);
    editing = { ...editing, [field]: n };
  }

  function setNote(e: Event) {
    if (!editing) return;
    editing = { ...editing, note: (e.target as HTMLInputElement).value };
  }

  function setDate(e: Event) {
    if (!editing) return;
    const v = (e.target as HTMLInputElement).value; // yyyy-mm-dd
    const ts = parseDateInput(v);
    if (ts != null) editing = { ...editing, date: ts };
  }

  function fmtN(n: number | undefined): string {
    return n == null ? '—' : String(n);
  }

  function shortLabel(label: string): string {
    return label.replace(/\(.*\)/, '');
  }

  function fieldVal(m: BodyMeasurement, key: keyof BodyMeasurement): number | undefined {
    return m[key] as number | undefined;
  }

  $: unit = $settings.unit;

  // 字段表
  const fields: { key: keyof BodyMeasurement; label: string; chart: boolean }[] = [
    { key: 'bodyweight', label: `体重(${unit})`, chart: true },
    { key: 'bodyfat', label: '体脂率(%)', chart: true },
    { key: 'chest', label: '胸围(cm)', chart: true },
    { key: 'waist', label: '腰围(cm)', chart: true },
    { key: 'hip', label: '臀围(cm)', chart: true },
    { key: 'arm', label: '上臂围(cm)', chart: true },
    { key: 'thigh', label: '大腿围(cm)', chart: true }
  ];

  // 各字段折线图数据（按日期升序，过滤空值）。接受 rows 参数以便在响应式语句中
  // 显式依赖 list，确保 refresh() 后趋势图重算渲染。
  function pointsFrom(rows: BodyMeasurement[], key: keyof BodyMeasurement): { x: number; y: number }[] {
    return rows
      .slice()
      .sort((a, b) => a.date - b.date)
      .filter((m) => fieldVal(m, key) != null)
      .map((m) => ({ x: m.date, y: fieldVal(m, key) as number }));
  }

  $: chartFields = fields.filter((f) => f.chart);

  // 趋势图数据随 list 变化重算：直接引用 list 让 Svelte 建立响应式依赖，
  // 否则 #each chartFields 不会在 refresh() 后重渲染，导致新增测量后折线图不出现。
  $: charts = chartFields.map((f) => ({ f, pts: pointsFrom(list, f.key) }));
</script>

<div class="topbar">
  <h1>身体测量</h1>
  <button type="button" class="btn btn-primary small" on:click={startAdd}>＋ 记录</button>
</div>

<p class="dim intro">记录体重、体脂率与各围度，纯本地存储；各指标以内联 SVG 绘制趋势。体重单位随设置（当前 {unit}）。</p>

{#each charts as c}
  {#if c.pts.length > 0}
    <div class="section-title">{shortLabel(c.f.label)}趋势</div>
    <LineChart points={c.pts} yLabel={shortLabel(c.f.label)} />
  {/if}
{/each}

{#if list.length === 0}
  <div class="section-title">历史记录</div>
  <div class="list-empty">暂无身体测量记录</div>
{:else}
  <div class="section-title">历史记录</div>
  {#each list as m}
    <div class="card m-row">
      <div class="m-head">
        <button type="button" class="m-date" on:click={() => edit(m)}>{dateStr(m.date)}</button>
        <div class="m-actions">
          <button type="button" class="mini" on:click={() => edit(m)} aria-label="编辑">✎</button>
          <button type="button" class="mini danger" on:click={() => remove(m)} aria-label="删除">✕</button>
        </div>
      </div>
      <div class="m-fields">
        {#each fields as f}
          {#if fieldVal(m, f.key) != null}
            <span class="tag">{shortLabel(f.label)}: {fmtN(fieldVal(m, f.key))}</span>
          {/if}
        {/each}
      </div>
      {#if m.note}<div class="dim note">{m.note}</div>{/if}
    </div>
  {/each}
{/if}

<Picker bind:open={showEditor} title={editing?.id ? '编辑测量' : '新增测量'} ariaLabel="记录身体测量">
  <label class="lbl" for="bm-date">日期</label>
  <input id="bm-date" type="date" value={dateInputValue(editing?.date ?? Date.now())} on:change={setDate} />

  {#each fields as f}
    <label class="lbl" for={`bm-${f.key}`}>{f.label}</label>
    <input id={`bm-${f.key}`} type="number" inputmode="decimal" min="0" step="any"
      value={editing ? (fieldVal(editing, f.key) ?? '') : ''} placeholder="—" on:change={(e) => setField(e, f.key)} />
  {/each}

  <label class="lbl" for="bm-note">备注</label>
  <input id="bm-note" type="text" value={editing?.note ?? ''} on:change={setNote} />

  {#if hint}<p class="dim" style="color:var(--danger); margin-top:6px">{hint}</p>{/if}
  <button type="button" class="btn btn-primary btn-block" style="margin-top:12px" on:click={save}>保存</button>
</Picker>

<style>
  .small {
    padding: 6px 12px;
    font-size: 13px;
  }
  .intro {
    margin-bottom: 12px;
  }
  .m-row {
    margin-bottom: 10px;
  }
  .m-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }
  .m-date {
    font-weight: 700;
    background: none;
    border: none;
    padding: 0;
    color: inherit;
    cursor: pointer;
    font: inherit;
  }
  .m-actions {
    display: flex;
    gap: 6px;
  }
  .m-fields {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .note {
    margin-top: 6px;
    font-size: 12px;
  }
  .mini {
    background: var(--bg-elev2);
    border-radius: 6px;
    width: 28px;
    height: 28px;
  }
  .mini.danger {
    color: var(--danger);
  }
  .lbl {
    display: block;
    color: var(--fg-dim);
    font-size: 12px;
    margin: 10px 0 4px;
  }
</style>