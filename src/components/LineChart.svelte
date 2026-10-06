<script lang="ts">
  // 内联 SVG 单值折线图，纯本地绘制。用于身体测量（体重等）。
  // P2：点数过多时降采样（默认上限 60，保留首末与极值）。
  import { downsamplePoints } from '../lib/p2';

  export let points: { x: number; y: number; label?: string }[] = [];
  export let yLabel = '';
  export let color = 'var(--accent)';
  export let maxPoints = 60;

  const W = 320;
  const H = 140;
  const PAD_L = 34;
  const PAD_R = 8;
  const PAD_T = 12;
  const PAD_B = 20;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  function xScale(i: number, n: number): number {
    if (n <= 1) return PAD_L + plotW / 2;
    return PAD_L + (plotW * i) / (n - 1);
  }

  $: sampled = downsamplePoints(points, maxPoints);
  $: ys = sampled.map((p) => p.y);
  $: yMax = Math.max(1, ...ys);
  $: yMin = Math.min(0, ...ys);
  $: span = Math.max(1, yMax - yMin);

  function yScale(v: number): number {
    return PAD_T + plotH - (plotH * (v - yMin)) / span;
  }

  $: path = sampled
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i, sampled.length).toFixed(1)} ${yScale(p.y).toFixed(1)}`)
    .join(' ');

  function fmt(n: number): string {
    return Number.isInteger(n) ? String(n) : n.toFixed(1);
  }

  function dateLabel(ts: number): string {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }
</script>

<div class="wrap">
  {#if points.length === 0}
    <div class="empty">暂无数据</div>
  {:else}
    <svg class="chart" viewBox="0 0 {W} {H}" role="img" aria-label={yLabel + '趋势图'}>
      <line class="axis" x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + plotH} />
      <line class="axis" x1={PAD_L} y1={PAD_T + plotH} x2={W - PAD_R} y2={PAD_T + plotH} />

      {#each [0, 0.5, 1] as t}
        <g>
          <line class="grid" x1={PAD_L} y1={PAD_T + plotH * (1 - t)} x2={W - PAD_R} y2={PAD_T + plotH * (1 - t)} />
          <text class="tick" x={PAD_L - 4} y={PAD_T + plotH * (1 - t) + 3} text-anchor="end">
            {fmt(yMin + span * t)}
          </text>
        </g>
      {/each}

      <path class="line" d={path} style="stroke:{color}" />

      {#each sampled as p, i}
        <circle class="pt" cx={xScale(i, sampled.length)} cy={yScale(p.y)} r="2.6" style="fill:{color}">
          <title>{dateLabel(p.x)} · {fmt(p.y)}</title>
        </circle>
      {/each}

      {#if sampled.length}
        {#each [0, Math.floor((sampled.length - 1) / 2), sampled.length - 1] as i}
          {#if i >= 0 && i < sampled.length}
            <text class="tick" x={xScale(i, sampled.length)} y={H - 6} text-anchor="middle">
              {dateLabel(sampled[i].x)}
            </text>
          {/if}
        {/each}
      {/if}
    </svg>
  {/if}
</div>

<style>
  .wrap {
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 8px;
    margin-bottom: 10px;
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
  .pt {
    stroke: var(--bg-elev);
    stroke-width: 1;
  }
  .tick {
    fill: var(--fg-dim);
    font-size: 9px;
    font-variant-numeric: tabular-nums;
  }
  .empty {
    text-align: center;
    color: var(--fg-dim);
    padding: 24px 0;
    font-size: 13px;
  }
</style>