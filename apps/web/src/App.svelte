<script lang="ts">
  import { route, go } from './lib/router';
  import Home from './pages/Home.svelte';
  import WorkoutPage from './pages/WorkoutPage.svelte';
  import Exercises from './pages/Exercises.svelte';
  import ExerciseDetail from './pages/ExerciseDetail.svelte';
  import Templates from './pages/Templates.svelte';
  import TemplateEditor from './pages/TemplateEditor.svelte';
  import History from './pages/History.svelte';
  import Body from './pages/Body.svelte';
  import SettingsPage from './pages/SettingsPage.svelte';

  $: path = $route.path;
</script>

<main class="app-main">
  {#if path === 'home'}
    <Home />
  {:else if path === 'workout'}
    <WorkoutPage />
  {:else if path === 'exercises'}
    <Exercises />
  {:else if path === 'exercise'}
    <ExerciseDetail />
  {:else if path === 'templates'}
    <Templates />
  {:else if path === 'template-edit'}
    <TemplateEditor />
  {:else if path === 'history'}
    <History />
  {:else if path === 'body'}
    <Body />
  {:else if path === 'settings'}
    <SettingsPage />
  {:else}
    <div class="list-empty" style="padding-top:40px">
      <p style="font-size:18px; font-weight:700; margin-bottom:8px">404 · 找不到页面</p>
      <p class="dim" style="margin-bottom:16px">地址 <code>{$route.path}</code> 不存在。</p>
      <button type="button" class="btn btn-primary" on:click={() => go('home')}>返回首页</button>
    </div>
  {/if}
</main>

<nav class="tabbar">
  <button type="button" class:active={path === 'home' || path === 'workout'} on:click={() => go('home')}>
    <span class="ico">🏋️</span>训练
  </button>
  <button type="button" class:active={path === 'exercises' || path === 'exercise'} on:click={() => go('exercises')}>
    <span class="ico">📚</span>动作库
  </button>
  <button type="button" class:active={path === 'templates' || path === 'template-edit'} on:click={() => go('templates')}>
    <span class="ico">📋</span>计划
  </button>
  <button type="button" class:active={path === 'history'} on:click={() => go('history')}>
    <span class="ico">📈</span>历史
  </button>
  <button type="button" class:active={path === 'body'} on:click={() => go('body')}>
    <span class="ico">💪</span>身体
  </button>
  <button type="button" class:active={path === 'settings'} on:click={() => go('settings')}>
    <span class="ico">⚙️</span>设置
  </button>
</nav>

<style>
  .tabbar button {
    cursor: pointer;
  }
</style>