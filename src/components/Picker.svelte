<script lang="ts">
  // 通用底部弹窗（picker sheet）—— 抽取自各页面重复的 .picker 结构。
  // 纯本地、无依赖；通过 slot 承载内容，open/close 双向。
  import { createEventDispatcher } from 'svelte';

  export let open = false;
  export let title = '';
  export let ariaLabel = '弹窗';

  const dispatch = createEventDispatcher<{ close: void }>();

  function close() {
    open = false;
    dispatch('close');
  }

  function onBackdrop() {
    close();
  }
</script>

{#if open}
  <div class="picker">
    <button type="button" class="picker-backdrop" aria-label="关闭" on:click={onBackdrop}></button>
    <div class="picker-sheet" role="dialog" aria-modal="true" aria-label={ariaLabel}>
      <div class="between">
        {#if title}<h3>{title}</h3>{/if}
        <button type="button" aria-label="关闭" on:click={close}>✕</button>
      </div>
      <slot {close} />
    </div>
  </div>
{/if}

<style>
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
  .between {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  h3 {
    font-size: 16px;
    font-weight: 700;
  }
</style>