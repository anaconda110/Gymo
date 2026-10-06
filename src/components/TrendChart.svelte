<script lang="ts">
  // 内联 SVG 双趋势线图：纯本地绘制，无任何图表库依赖。
  // props: points [{date, top1RM, volume}]，两条线可切换显示。
  // P2：点数过多时降采样（默认上限 60，保留首末与极值）；支持相对强度模式与体重叠加曲线。
  import type { TrendPoint } from '../lib/history';
  import { fmt } from '../lib/stats';
  import { downsampleTrend, downsamplePoints } from '../lib/p2';

  export let points: TrendPoint[] = [];
  export let unitLabel = 'kg';
  // 相对强度模式：1RM 线显示为「1RM/体重」比值（无量纲）
  export let relative = false;
  // 体重叠加曲线（次轴，独立缩放，仅当有数据时绘制）
  export let bodyweights: { date: number; bodyweight: number }[] = [];
  // 降采样上限
  export let maxPoints = 60;

  let show1RM = true;
  let showVol = true;
  let showBW = true;

  // 视图尺寸
  const W = 320;
  const H = 160;
  const PAD_L = 38;
  const PAD_R = 8;
  const PAD_T = 14;
  const PAD_B = 22;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  function xScale(i: number, n: number): number {
    if (n <= 1) return PAD_L + plotW / 2;
    return PAD_L + (plotW * i) / (n - 1);
  }

  function yScale(v: number, max: number): number {
    if (max <= 0) return PAD_T + plotH;
    return PAD_T + plotH - (plotH * v) / max;
  }

  function linePath(values: number[], max: number): string {
    return values
      .map((v, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i, values.length).toFixed(1)} ${yScale(v, max).toFixed(1)}`)
      .join(' ');
  }

  function maxOf(values: number[]): number {
    return Math.max(1, ...values);
  }

  function dateLabel(ts: number): string {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }

  // 降采样（保留首末与极值）
  $: sampled = downsampleTrend(points, maxPoints);
  $: bwPoints = downsamplePoints(
    bodyweights.map((b) => ({ x: b.date, y: b.bodyweight })),
    maxPoints
  );

  $: dates = sampled.map((p) => p.date);
  $: rmValues = sampled.map((p) => p.top1RM);
  $: volValues = sampled.map((p) => p.volume);
  $: rmMax = maxOf(rmValues);
  $: volMax = maxOf(volValues);
  // 体重独立缩放（次轴）
  $: bwValues = bwPoints.map((p) => p.y);
  $: bwMax = maxOf(bwValues);
  $: bwMin = Math.min(...bwValues, Infinity);
  $: bwSpan = Math.max(1, bwMax - (isFinite(bwMin) ? bwMin : 0));
  function bwY(v: number): number {
    const lo = isFinite(bwMin) ? bwMin : 0;
    return PAD_T + plotH - (plotH * (v - lo)) / bwSpan;
  }
  $: bwPath = bwValues.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i, bwValues.length).toFixed(1)} ${bwY(v).toFixed(1)}`).join(' ');

  $: hasBW = bodyweights.length > 0;
  $: rmLabel = relative ? '相对强度' : '估计1RM';
</script>

<div class="chart-wrap">
  <div class="toggles">
    <label class="tog" class:active={show1RM}>
      <input type="checkbox" bind:checked={show1RM} />
      <span class="dot rm"></span>{rmLabel}
    </label>
    <label class="tog" class:active={showVol}>
      <input type="checkbox" bind:checked={showVol} />
      <span class="dot vol"></span>训练容量
    </label>
    {#if hasBW}
      <label class="tog" class:active={showBW}>
        <input type="checkbox" bind:checked={showBW} />
        <span class="dot bw"></span>体重
      </label>
    {/if}
  </div>
  <div class="dim count" data-testid="trend-point-count">{sampled.length} 点</div>

  {#if sampled.length === 0}
    <div class="empty">暂无趋势数据</div>
  {:else}
    <svg class="chart" viewBox="0 0 {W} {H}" role="img" aria-label="容量与1RM趋势图">
      <!-- 坐标轴 -->
      <line class="axis" x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + plotH} />
      <line class="axis" x1={PAD_L} y1={PAD_T + plotH} x2={W - PAD_R} y2={PAD_T + plotH} />

      <!-- 左轴刻度（1RM / 相对强度） -->
      {#if show1RM && rmMax > 0}
        {#each [0, 0.5, 1] as t}
          <g>
            <line class="grid" x1={PAD_L} y1={yScale(rmMax * t, rmMax)} x2={W - PAD_R} y2={yScale(rmMax * t, rmMax)} />
            <text class="tick-l" x={PAD_L - 4} y={yScale(rmMax * t, rmMax) + 3} text-anchor="end">
              {fmt(rmMax * t, relative ? 2 : 0)}
            </text>
          </g>
        {/each}
      {/if}
      <!-- 右轴刻度（容量） -->
      {#if showVol && volMax > 0}
        {#each [0, 0.5, 1] as t}
          <text class="tick-r" x={W - PAD_R} y={yScale(volMax * t, volMax) + 3} text-anchor="start">
            {fmt(volMax * t, 0)}
          </text>
        {/each}
      {/if}

      <!-- 容量线（绿） -->
      {#if showVol && volValues.length}
        <path class="line vol" d={linePath(volValues, volMax)} />
        {#each volValues as v, i}
          <circle class="pt vol" cx={xScale(i, volValues.length)} cy={yScale(v, volMax)} r="2.5">
            <title>{dateLabel(dates[i])} · 容量 {fmt(v, 0)}</title>
          </circle>
        {/each}
      {/if}

      <!-- 1RM / 相对强度线（橙） -->
      {#if show1RM && rmValues.length}
        <path class="line rm" d={linePath(rmValues, rmMax)} />
        {#each rmValues as v, i}
          <circle class="pt rm" cx={xScale(i, rmValues.length)} cy={yScale(v, rmMax)} r="2.5">
            <title>{dateLabel(dates[i])} · {rmLabel} {fmt(v, relative ? 2 : 1)}{relative ? '' : ` ${unitLabel}`}</title>
          </circle>
        {/each}
      {/if}

      <!-- 体重叠加线（蓝，次轴独立缩放，虚线） -->
      {#if hasBW && showBW && bwValues.length}
        <path class="line bw" d={bwPath} />
        {#each bwValues as v, i}
          <circle class="pt bw" cx={xScale(i, bwValues.length)} cy={bwY(v)} r="2.2">
            <title>{dateLabel(bwPoints[i].x)} · 体重 {fmt(v, 1)}</title>
          </circle>
        {/each}
      {/if}

      <!-- X 轴日期：首/中/末三点 -->
      {#if dates.length}
        {#each [0, Math.floor((dates.length - 1) / 2), dates.length - 1] as i}
          {#if i >= 0 && i < dates.length}
            <text class="tick-x" x={xScale(i, dates.length)} y={H - 6} text-anchor="middle">
              {dateLabel(dates[i])}
            </text>
          {/if}
        {/each}
      {/if}
    </svg>
  {/if}
</div>

<style>
  .chart-wrap {
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 8px;
    margin-bottom: 10px;
  }
  .toggles {
    display: flex;
    gap: 14px;
    margin-bottom: 4px;
    flex-wrap: wrap;
  }
  .tog {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--fg-dim);
    cursor: pointer;
  }
  .tog.active {
    color: var(--fg);
  }
  .tog input {
    width: auto;
    accent-color: var(--accent);
  }
  .dot {
    width: 10px;
    height: 3px;
    border-radius: 2px;
    display: inline-block;
  }
  .dot.rm {
    background: var(--accent);
  }
  .dot.vol {
    background: var(--green);
  }
  .dot.bw {
    background: #4d8fd6;
  }
  .count {
    font-size: 10px;
    margin-bottom: 4px;
  }
  .chart {
    width: 100%;
    height: auto;
    display: block;
  }
  .axis {
    stroke: var(--border);
    stroke-width: 1;
  }
  .grid {
    stroke: var(--border);
    stroke-width: 1;
    stroke-dasharray: 2 3;
    opacity: 0.6;
  }
  .line {
    fill: none;
    stroke-width: 2;
  }
  .line.rm {
    stroke: var(--accent);
  }
  .line.vol {
    stroke: var(--green);
  }
  .line.bw {
    stroke: #4d8fd6;
    stroke-width: 1.5;
    stroke-dasharray: 4 3;
    opacity: 0.8;
  }
  .pt {
    stroke: var(--bg-elev);
    stroke-width: 1;
  }
  .pt.rm {
    fill: var(--accent);
  }
  .pt.vol {
    fill: var(--green);
  }
  .pt.bw {
    fill: #4d8fd6;
  }
  .tick-l,
  .tick-r,
  .tick-x {
    fill: var(--fg-dim);
    font-size: 9px;
    font-variant-numeric: tabular-nums;
  }
  .empty {
    text-align: center;
    color: var(--fg-dim);
    padding: 30px 0;
    font-size: 13px;
  }
</style>