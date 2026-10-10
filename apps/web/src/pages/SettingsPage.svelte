<script lang="ts">
  import { settings } from '../lib/settings';
  import { exportJSON, exportHistoryCSV, importJSON, download, readFileText } from '../lib/exportImport';
  import { db } from '../lib/db';
  import { seedIfEmpty } from '../lib/seed';
  import { go } from '../lib/router';
  import { formulaList, formulaLabels, type Formula1RM } from '../lib/stats';
  import { setTimerPrefs } from '../lib/restTimer';

  let unit: 'kg' | 'lb' = $settings.unit;
  let defaultRestSec = $settings.defaultRestSec;
  let theme: 'dark' | 'light' = $settings.theme;
  let formula: Formula1RM = $settings.formula;
  let timerSound = $settings.timerSound;
  let timerVibrate = $settings.timerVibrate;
  let importMode: 'replace' | 'merge' = 'replace';
  let msg = '';
  let busy = false;
  let converting = false;

  // 切换单位：在 Dexie 事务内批量换算历史重量（sets/templateExercises/bodyMeasurements）
  async function saveUnit() {
    if (unit === $settings.unit) return;
    converting = true;
    msg = '正在换算历史数据…';
    try {
      await settings.changeUnit(unit);
      msg = `已切换单位为 ${unit}，历史重量已批量换算`;
    } catch (e) {
      msg = '单位切换失败：' + (e as Error).message;
    } finally {
      converting = false;
    }
  }
  async function saveRest() { await settings.set({ defaultRestSec }); }
  async function saveTheme() { await settings.set({ theme }); }
  async function saveFormula() { await settings.set({ formula }); }
  async function saveTimerSound() { setTimerPrefs(timerSound, timerVibrate); await settings.set({ timerSound }); }
  async function saveTimerVibrate() { setTimerPrefs(timerSound, timerVibrate); await settings.set({ timerVibrate }); }

  async function doExportJSON() {
    const text = await exportJSON();
    download(`gymo-backup-${Date.now()}.json`, text, 'application/json');
  }
  async function doExportCSV() {
    const text = await exportHistoryCSV();
    download(`gymo-history-${Date.now()}.csv`, text, 'text/csv');
  }
  async function onImport(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    busy = true;
    msg = '';
    try {
      const text = await readFileText(file);
      const res = await importJSON(text, importMode);
      msg = importMode === 'merge' ? '合并导入成功（已重映射 id，未覆盖已有）' : '导入成功';
      if (res.warnings.length) msg += '；提示：' + res.warnings.join('；');
      await seedIfEmpty();
      await settings.load();
      unit = $settings.unit;
    } catch (err) {
      msg = '导入失败：' + (err as Error).message;
    } finally {
      busy = false;
      input.value = '';
    }
  }

  // 清空数据：二次确认（先 confirm，再输入"清空"二字确认）
  let wipeStage = 0; // 0=未触发,1=等待输入确认
  let wipeInput = '';
  function startWipe() {
    if (!confirm('清空所有本地数据？此操作不可恢复。请先导出备份。')) return;
    wipeStage = 1;
    wipeInput = '';
  }
  async function confirmWipe() {
    if (wipeInput.trim() !== '清空') {
      msg = '请输入"清空"二字以二次确认';
      return;
    }
    busy = true;
    try {
      await db.delete();
      location.reload();
    } finally {
      busy = false;
    }
  }
  function cancelWipe() {
    wipeStage = 0;
    wipeInput = '';
  }
</script>

<div class="topbar"><h1>设置</h1></div>

<div class="section-title">单位</div>
<div class="card">
  <div class="row between">
    <span>重量单位{#if converting}（换算中…）{/if}</span>
    <select bind:value={unit} on:change={saveUnit} disabled={converting}>
      <option value="kg">kg (公斤)</option>
      <option value="lb">lb (磅)</option>
    </select>
  </div>
  <p class="dim" style="margin-top:6px">切换单位时会在事务内对历史 sets/template/bodyweight 批量换算，可往返还原（100kg ⇄ 220.46lb）。</p>
</div>

<div class="section-title">训练</div>
<div class="card">
  <div class="row between">
    <span>默认组间休息 (秒)</span>
    <input class="narrow" type="number" min="0" bind:value={defaultRestSec} on:change={saveRest} />
  </div>
  <div class="row between" style="margin-top:10px">
    <span>1RM 估算公式</span>
    <select bind:value={formula} on:change={saveFormula} aria-label="1RM 公式">
      {#each formulaList as f}
        <option value={f}>{formulaLabels[f]}</option>
      {/each}
    </select>
  </div>
</div>

<div class="section-title">计时器提示</div>
<div class="card">
  <div class="row between">
    <span>结束声音（本地 Web Audio beep）</span>
    <label class="switch"><input type="checkbox" bind:checked={timerSound} on:change={saveTimerSound} /> <span>开</span></label>
  </div>
  <div class="row between" style="margin-top:10px">
    <span>结束振动</span>
    <label class="switch"><input type="checkbox" bind:checked={timerVibrate} on:change={saveTimerVibrate} /> <span>开</span></label>
  </div>
</div>

<div class="section-title">主题</div>
<div class="card">
  <div class="row between">
    <span>外观</span>
    <select bind:value={theme} on:change={saveTheme}>
      <option value="dark">暗色</option>
      <option value="light">亮色</option>
    </select>
  </div>
</div>

<div class="section-title">数据 · 备份与恢复</div>
<div class="card">
  <p class="dim">所有数据仅存在本设备浏览器的 IndexedDB 中。请定期导出备份。</p>
  <div class="btn-col">
    <button type="button" class="btn btn-block" on:click={doExportJSON}>导出 JSON 备份（全量）</button>
    <button type="button" class="btn btn-block" on:click={doExportCSV}>导出 CSV（动作历史）</button>
  </div>
  <div class="divider"></div>
  <span class="dim">导入模式</span>
  <div class="row" style="margin:6px 0">
    <label><input type="radio" name="mode" value="replace" bind:group={importMode} /> 替换（清空后导入）</label>
    <label><input type="radio" name="mode" value="merge" bind:group={importMode} /> 合并（重映射id，不覆盖）</label>
  </div>
  <label class="btn btn-ghost btn-block">
    选择 JSON 文件导入
    <input type="file" accept="application/json" style="display:none" on:change={onImport} />
  </label>
  {#if msg}<p class="dim" style="margin-top:8px">{msg}</p>{/if}
</div>

<div class="section-title">危险区</div>
<div class="card">
  {#if wipeStage === 1}
    <p class="dim" style="margin-bottom:6px">请输入 <strong>清空</strong> 二字以二次确认：</p>
    <div class="row" style="gap:8px">
      <input type="text" bind:value={wipeInput} placeholder="清空" />
      <button type="button" class="btn btn-danger" on:click={confirmWipe} disabled={busy}>确认清空</button>
      <button type="button" class="btn btn-ghost" on:click={cancelWipe}>取消</button>
    </div>
  {:else}
    <button type="button" class="btn btn-danger btn-block" on:click={startWipe} disabled={busy}>清空所有本地数据</button>
  {/if}
</div>

<p class="dim center">Gymo · 纯本地训练记录 · 无后端无账号</p>

<style>
  .btn-col { display:flex; flex-direction:column; gap:8px; margin-top:8px; }
  .center { text-align:center; margin-top:20px; }
  .switch { display:flex; align-items:center; gap:6px; font-size:13px; color: var(--fg-dim); }
</style>