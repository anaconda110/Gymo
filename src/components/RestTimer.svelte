<script lang="ts">
  import { restTimer, startRest, addRest, stop } from '../lib/restTimer';
  import { fmt } from '../lib/stats';

  $: t = $restTimer;
</script>

{#if t.active}
  <div class="timer-bar">
    <div class="t-info">
      <div class="t-label">{t.label ?? '组间休息'}</div>
      <div class="t-time">{fmt(t.remaining, 0)}</div>
    </div>
    <div class="t-actions">
      <button type="button" class="t-btn" on:click={() => addRest(15)}>+15s</button>
      <button type="button" class="t-btn" on:click={() => addRest(-15)}>-15s</button>
      <button type="button" class="t-btn skip" on:click={stop}>跳过</button>
    </div>
  </div>
{/if}

<style>
  .t-info {
    display: flex;
    flex-direction: column;
  }
  .t-label {
    font-size: 11px;
    opacity: 0.85;
  }
  .t-time {
    font-size: 26px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    line-height: 1.1;
  }
  .t-actions {
    display: flex;
    gap: 6px;
  }
  .t-btn {
    background: rgba(255, 255, 255, 0.18);
    color: #fff;
    border-radius: 8px;
    padding: 8px 10px;
    font-size: 13px;
    font-weight: 600;
  }
  .t-btn.skip {
    background: rgba(0, 0, 0, 0.25);
  }
</style>