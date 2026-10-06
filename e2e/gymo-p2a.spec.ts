import { test, expect } from '@playwright/test';

// Gymo P2「记录+统计增强」验收 e2e（纯本地、无头、无网络）。
// 覆盖：超级组一键配对 / 单组备注 / 下次目标建议 / PR 时间线 / 年视图 /
//      趋势降采样不超节点上限 / 平均休息显示 / 相对强度开关。

const tab = (page: import('@playwright/test').Page, name: RegExp) =>
  page.locator('nav.tabbar').getByRole('button', { name });

// 确保进入一个新训练日并添加「卧推 Bench Press」（种子库第一个）
async function newWorkoutWithBench(page: import('@playwright/test').Page) {
  await page.goto('/#/workout');
  await expect(page).toHaveURL(/#\/workout\?id=\d+/, { timeout: 15_000 });
  await page.getByRole('button', { name: '＋ 添加动作' }).click();
  await page.locator('.ex-item').first().click();
}

// 添加一组并完成（含跳过计时器）
async function addSetAndComplete(
  page: import('@playwright/test').Page,
  weight: string,
  reps: string,
  rowIdx = 0
) {
  await page.getByRole('button', { name: /＋ 下一组/ }).click();
  const row = page.locator('.set-row').nth(rowIdx);
  await row.locator('input').nth(0).fill(weight);
  await row.locator('input').nth(1).fill(reps);
  await row.locator('input[type="checkbox"]').check();
  await page.getByRole('button', { name: '跳过' }).click();
}

async function finishWorkout(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: /完成训练/ }).click();
  await expect(page).toHaveURL(/#\/home/);
}

test.describe('Gymo P2 记录+统计增强', () => {
  test('超级组一键配对：与下一动作配对并互为伙伴', async ({ page }) => {
    await page.goto('/#/workout');
    await expect(page).toHaveURL(/#\/workout\?id=\d+/, { timeout: 15_000 });
    await page.getByRole('button', { name: '＋ 添加动作' }).click();
    await page.locator('.ex-item').nth(0).click();
    await page.getByRole('button', { name: '＋ 添加动作' }).click();
    await page.locator('.ex-item').nth(1).click();

    const cards = page.locator('.card.ex');
    await expect(cards).toHaveCount(2);

    // 第一个卡片应出现「与下一动作配对为超级组」按钮
    await expect(cards.nth(0).getByRole('button', { name: /与下一动作配对为超级组/ })).toBeVisible();
    await cards.nth(0).getByRole('button', { name: /与下一动作配对为超级组/ }).click();

    // 两张卡片都应标注超级组 #1，且第一张关联第二张动作
    await expect(cards.nth(0).locator('.ss-tag')).toContainText('超级组 #1');
    await expect(cards.nth(0).locator('.ss-tag')).toContainText('关联：');
    await expect(cards.nth(1).locator('.ss-tag')).toContainText('超级组 #1');
  });

  test('单组备注即时保存并持久化', async ({ page }) => {
    await newWorkoutWithBench(page);
    await page.getByRole('button', { name: /＋ 下一组/ }).click();
    const noteInput = page.locator('.set-note').first();
    await noteInput.fill('力竭，最后一组');
    await noteInput.press('Tab'); // 失焦即时保存
    // 等待异步 DB 写入提交后再刷新，避免 reload 与未提交写入竞态
    await page.waitForTimeout(800);

    // 刷新页面后备注仍在
    await page.reload();
    await expect(page.locator('.set-note').first()).toHaveValue('力竭，最后一组');
  });

  test('下次目标建议在记录流与动作详情出现', async ({ page }) => {
    // 先记录一次 100×8（达标，应建议 102.5×8）
    await newWorkoutWithBench(page);
    await addSetAndComplete(page, '100', '8', 0);
    await finishWorkout(page);

    // 新训练中添加同一动作：ExerciseCard 应出现「下次建议」
    await page.goto('/#/workout');
    await expect(page).toHaveURL(/#\/workout\?id=\d+/, { timeout: 15_000 });
    await page.getByRole('button', { name: '＋ 添加动作' }).click();
    await page.locator('.ex-item').first().click();
    await expect(page.locator('[data-testid="next-goal"]')).toContainText('下次建议');
    await expect(page.locator('[data-testid="next-goal"]')).toContainText('102.5');

    // 动作详情也应出现下次建议
    await tab(page, /动作库/).click();
    await page.locator('.ex-row').filter({ hasText: '卧推 Bench Press' }).click();
    await expect(page.locator('[data-testid="detail-next-goal"]')).toContainText('下次建议');
    await expect(page.locator('[data-testid="detail-next-goal"]')).toContainText('102.5');
  });

  test('PR 时间线在重量递增时产生里程碑节点', async ({ page }) => {
    // 连续三次训练，顶重递增 80 / 90 / 100
    for (const w of ['80', '90', '100']) {
      await newWorkoutWithBench(page);
      await addSetAndComplete(page, w, '5', 0);
      await finishWorkout(page);
    }

    await tab(page, /动作库/).click();
    await page.locator('.ex-row').filter({ hasText: '卧推 Bench Press' }).click();
    const timeline = page.locator('[data-testid="pr-timeline"]');
    await expect(timeline).toBeVisible();
    // 至少 3 个里程碑节点（每次破纪录会按维度产生多条）
    await expect
      .poll(async () => timeline.locator('.pr-item').count(), { timeout: 8_000 })
      .toBeGreaterThanOrEqual(3);
    // 含「最大重量」标签
    await expect(timeline).toContainText('最大重量');
  });

  test('历史日历年视图渲染 12 个月缩略', async ({ page }) => {
    // 先记录一次训练，保证有数据
    await newWorkoutWithBench(page);
    await addSetAndComplete(page, '70', '8', 0);
    await finishWorkout(page);

    await tab(page, /历史/).click();
    await page.getByRole('button', { name: '日历' }).click();
    await page.getByRole('button', { name: '年视图' }).click();
    const yv = page.locator('[data-testid="year-view"]');
    await expect(yv).toBeVisible();
    await expect(yv.locator('.ym')).toHaveCount(12);
  });

  test('趋势降采样：渲染点数不超上限(60)', async ({ page }) => {
    await newWorkoutWithBench(page);
    await addSetAndComplete(page, '70', '8', 0);
    await finishWorkout(page);

    await tab(page, /动作库/).click();
    await page.locator('.ex-row').filter({ hasText: '卧推 Bench Press' }).click();
    // 等待趋势图渲染（保证 sampled>0，避免读到 refresh 前的 0 点）
    await expect(page.locator('.chart-wrap svg.chart')).toBeVisible({ timeout: 8_000 });
    const countEl = page.locator('[data-testid="trend-point-count"]');
    await expect(countEl).toBeVisible();
    const text = (await countEl.textContent()) ?? '';
    const n = Number(text.replace(/[^\d]/g, ''));
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThanOrEqual(60);
  });

  test('平均组间休息在动作详情显示', async ({ page }) => {
    await newWorkoutWithBench(page);
    // 完成两组，中间等待以确保 completedAt 差值 > 0
    await addSetAndComplete(page, '80', '5', 0);
    await page.waitForTimeout(1100);
    await addSetAndComplete(page, '80', '5', 1);
    await finishWorkout(page);

    await tab(page, /动作库/).click();
    await page.locator('.ex-row').filter({ hasText: '卧推 Bench Press' }).click();
    // 平均组间休息 stat 存在且显示数值+s
    const restStat = page.locator('.stats-grid .stat').filter({ hasText: '平均组间休息' });
    await expect(restStat).toBeVisible();
    await expect(restStat.locator('.v')).toContainText(/s$/);
  });

  test('相对强度开关：有体重数据时可切换且趋势仍渲染', async ({ page }) => {
    // 记录一次训练
    await newWorkoutWithBench(page);
    await addSetAndComplete(page, '80', '5', 0);
    await finishWorkout(page);

    // 记录体重
    await tab(page, /身体/).click();
    await page.getByRole('button', { name: '＋ 记录' }).click();
    await page.locator('input[id="bm-bodyweight"]').fill('75');
    await page.getByRole('button', { name: '保存' }).click();

    // 动作详情：相对强度开关出现，勾选后趋势图仍渲染
    await tab(page, /动作库/).click();
    await page.locator('.ex-row').filter({ hasText: '卧推 Bench Press' }).click();
    const tog = page.locator('[data-testid="relative-toggle"] input[type="checkbox"]');
    await expect(tog).toBeVisible();
    await tog.check();
    await expect(tog).toBeChecked();
    await expect(page.locator('.chart-wrap svg.chart')).toBeVisible();
  });
});