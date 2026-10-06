import { test, expect } from '@playwright/test';
import fs from 'node:fs';

// Gymo 增强 e2e：覆盖 P0/P1 修复项的验收点（纯本地、无头、无网络）。
// 各用例独立上下文，从种子库起始。

const tab = (page: import('@playwright/test').Page, name: RegExp) =>
  page.locator('nav.tabbar').getByRole('button', { name });

// 辅助：完成一组（填重量/次数、勾选完成、跳过计时器）
async function doSet(page: import('@playwright/test').Page, weight: string, reps: string, rowIdx = 0) {
  const row = page.locator('.set-row').nth(rowIdx);
  await row.locator('input').nth(0).fill(weight);
  await row.locator('input').nth(1).fill(reps);
  await row.locator('input[type="checkbox"]').check();
  await page.getByRole('button', { name: '跳过' }).click();
}

test.describe('Gymo P0/P1 修复验收', () => {
  test('单位换算往返：100kg -> lb ~220 -> 还原 100', async ({ page }) => {
    await page.goto('/#/workout');
    await expect(page).toHaveURL(/#\/workout\?id=\d+/, { timeout: 15_000 });
    await page.getByRole('button', { name: '＋ 添加动作' }).click();
    await page.locator('.ex-item').first().click();
    await page.getByRole('button', { name: /＋ 下一组/ }).click();
    await doSet(page, '100', '5');
    await page.getByPlaceholder('训练备注…').fill('unit test');
    await page.getByRole('button', { name: /完成训练/ }).click();
    await expect(page).toHaveURL(/#\/home/);

    // 动作详情：顶重 = 100
    await tab(page, /动作库/).click();
    await page.locator('.ex-row').filter({ hasText: '卧推 Bench Press' }).click();
    const topWeight = page.locator('.stats-grid .stat').nth(0).locator('.v');
    await expect(topWeight).toHaveText('100');

    // 切到 lb：历史重量批量换算
    await tab(page, /设置/).click();
    await page.locator('select').first().selectOption('lb');
    await expect(page.getByText(/已切换单位为 lb/)).toBeVisible();

    // 顶重变为 ~220（refresh 异步，轮询等待避免读到旧值/0）
    await tab(page, /动作库/).click();
    await page.locator('.ex-row').filter({ hasText: '卧推 Bench Press' }).click();
    await expect
      .poll(async () => Number((await topWeight.textContent()) ?? '0'), { timeout: 8_000 })
      .toBeGreaterThan(220);
    const lbText = (await topWeight.textContent()) ?? '0';
    expect(Number(lbText)).toBeGreaterThan(220);
    expect(Number(lbText)).toBeLessThan(221);

    // 切回 kg：还原 100
    await tab(page, /设置/).click();
    await page.locator('select').first().selectOption('kg');
    await expect(page.getByText(/已切换单位为 kg/)).toBeVisible();
    await tab(page, /动作库/).click();
    await page.locator('.ex-row').filter({ hasText: '卧推 Bench Press' }).click();
    await expect(topWeight).toHaveText('100');
  });

  test('负数/非法输入被拒，RPE 越界被拒', async ({ page }) => {
    await page.goto('/#/workout');
    await expect(page).toHaveURL(/#\/workout\?id=\d+/, { timeout: 15_000 });
    await page.getByRole('button', { name: '＋ 添加动作' }).click();
    await page.locator('.ex-item').first().click();
    await page.getByRole('button', { name: /＋ 下一组/ }).click();

    const row = page.locator('.set-row').first();
    // 重量填 -5，触发 change -> 被拒，提示
    await row.locator('input').nth(0).fill('-5');
    await row.locator('input').nth(0).press('Tab');
    await expect(page.getByText('重量不能为负')).toBeVisible();
    // 回退旧值（0）
    await expect(row.locator('input').nth(0)).toHaveValue('0');

    // 次数填 -1 被拒
    await row.locator('input').nth(1).fill('-1');
    await row.locator('input').nth(1).press('Tab');
    await expect(page.getByText('次数不能为负')).toBeVisible();

    // RPE 填 15 越界被拒
    await row.locator('input').nth(2).fill('15');
    await row.locator('input').nth(2).press('Tab');
    await expect(page.getByText('RPE 需在 1-10 之间')).toBeVisible();
  });

  test('合并导入两份备份不覆盖且外键完整', async ({ page }) => {
    // 准备一份备份：1 个训练 + 1 组
    await page.goto('/#/workout');
    await expect(page).toHaveURL(/#\/workout\?id=\d+/, { timeout: 15_000 });
    await page.getByRole('button', { name: '＋ 添加动作' }).click();
    await page.locator('.ex-item').first().click();
    await page.getByRole('button', { name: /＋ 下一组/ }).click();
    await doSet(page, '90', '5');
    await page.getByRole('button', { name: /完成训练/ }).click();
    await expect(page).toHaveURL(/#\/home/);

    await tab(page, /设置/).click();
    const dl = page.waitForEvent('download');
    await page.getByRole('button', { name: '导出 JSON 备份（全量）' }).click();
    const file = await dl;
    const p = '/tmp/gymo-merge-backup.json';
    await file.saveAs(p);

    // 切到合并模式，连续导入两次
    await page.getByLabel('合并（重映射id，不覆盖）').check();
    await page.locator('input[type="file"]').setInputFiles(p);
    await expect(page.getByText('合并导入成功')).toBeVisible();
    await page.locator('input[type="file"]').setInputFiles(p);
    await expect(page.getByText('合并导入成功')).toBeVisible();

    // 导出最终结果，校验外键完整性
    const dl2 = page.waitForEvent('download');
    await page.getByRole('button', { name: '导出 JSON 备份（全量）' }).click();
    const file2 = await dl2;
    const p2 = '/tmp/gymo-merge-after.json';
    await file2.saveAs(p2);
    const json = JSON.parse(fs.readFileSync(p2, 'utf8'));
    const workouts = json.data.workouts;
    const wex = json.data.workoutExercises;
    const sets = json.data.sets;
    const ex = json.data.exercises;
    // 原始 1 + 合并 2 = 3 个训练
    expect(workouts.length).toBe(3);
    const wIds = new Set(workouts.map((w: any) => w.id));
    const weIds = new Set(wex.map((w: any) => w.id));
    const exIds = new Set(ex.map((e: any) => e.id));
    for (const w of wex) {
      expect(wIds.has(w.workoutId)).toBeTruthy();
      expect(exIds.has(w.exerciseId)).toBeTruthy();
    }
    for (const s of sets) {
      expect(weIds.has(s.workoutExerciseId)).toBeTruthy();
    }
    // 每个训练至少有一组
    for (const w of workouts) {
      const we = wex.filter((x: any) => x.workoutId === w.id);
      expect(we.length).toBeGreaterThanOrEqual(1);
    }
  });

  test('CSV 导出内容含表头与行', async ({ page }) => {
    await page.goto('/#/workout');
    await expect(page).toHaveURL(/#\/workout\?id=\d+/, { timeout: 15_000 });
    await page.getByRole('button', { name: '＋ 添加动作' }).click();
    await page.locator('.ex-item').first().click();
    await page.getByRole('button', { name: /＋ 下一组/ }).click();
    await doSet(page, '70', '8');
    await page.getByRole('button', { name: /完成训练/ }).click();
    await expect(page).toHaveURL(/#\/home/);

    await tab(page, /设置/).click();
    const dl = page.waitForEvent('download');
    await page.getByRole('button', { name: '导出 CSV（动作历史）' }).click();
    const file = await dl;
    const p = '/tmp/gymo-history.csv';
    await file.saveAs(p);
    const text = fs.readFileSync(p, 'utf8');
    const lines = text.split('\n').filter(Boolean);
    expect(lines[0]).toBe('date,workout,exercise,order,weight,reps,rpe,setType,completed,note');
    expect(lines.length).toBeGreaterThan(1);
    // 数据行含重量 70 与次数 8
    expect(text).toContain('70');
    expect(text).toContain(',8,');
  });

  test('不存在 id 有返回引导（动作/模板/未知路由）', async ({ page }) => {
    await page.goto('/#/exercise?id=999999');
    await expect(page.getByText('动作不存在')).toBeVisible();
    await expect(page.getByRole('button', { name: '返回动作库' })).toBeVisible();

    await page.goto('/#/template-edit?id=999999');
    await expect(page.getByText('模板不存在')).toBeVisible();
    await expect(page.getByRole('button', { name: '返回计划列表' })).toBeVisible();

    await page.goto('/#/no-such-page');
    await expect(page.getByText(/404/)).toBeVisible();
    await expect(page.getByRole('button', { name: '返回首页' })).toBeVisible();
  });

  test('身体测量编辑/删除', async ({ page }) => {
    await page.goto('/#/body');
    await tab(page, /身体/).click();
    await expect(page).toHaveURL(/#\/body/);
    await page.getByRole('button', { name: '＋ 记录' }).click();
    await page.locator('input[id="bm-bodyweight"]').fill('75');
    await page.getByRole('button', { name: '保存' }).click();
    await expect(page.getByText(/体重: 75/)).toBeVisible();

    // 编辑：改为 80
    await page.locator('.m-row .mini').first().click(); // ✎ 编辑
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.locator('input[id="bm-bodyweight"]').fill('80');
    await page.getByRole('button', { name: '保存' }).click();
    await expect(page.getByText(/体重: 80/)).toBeVisible();
    await expect(page.getByText(/体重: 75/)).toHaveCount(0);

    // 删除
    page.once('dialog', (d) => d.accept());
    await page.locator('.m-row .mini.danger').first().click();
    await expect(page.getByText('暂无身体测量记录')).toBeVisible();
  });

  test('超级组伙伴展示', async ({ page }) => {
    await page.goto('/#/workout');
    await expect(page).toHaveURL(/#\/workout\?id=\d+/, { timeout: 15_000 });
    // 添加两个动作
    await page.getByRole('button', { name: '＋ 添加动作' }).click();
    await page.locator('.ex-item').nth(0).click();
    await page.getByRole('button', { name: '＋ 添加动作' }).click();
    await page.locator('.ex-item').nth(1).click();

    const cards = page.locator('.card.ex');
    await expect(cards).toHaveCount(2);

    // 给第一个动作设超级组编号 1
    await cards.nth(0).locator('.menu').click();
    await cards.nth(0).locator('input[id^="ss-"]').fill('1');
    await cards.nth(0).locator('.rest-edit').getByRole('button', { name: '设置' }).click();
    // 给第二个动作设超级组编号 1
    await cards.nth(1).locator('.menu').click();
    await cards.nth(1).locator('input[id^="ss-"]').fill('1');
    await cards.nth(1).locator('.rest-edit').getByRole('button', { name: '设置' }).click();

    // 第一个卡片应展示"超级组 #1"及关联第二个动作
    await expect(cards.nth(0).locator('.ss-tag')).toContainText('超级组 #1');
    await expect(cards.nth(0).locator('.ss-tag')).toContainText('关联：');
  });

  test('多 1RM 公式切换 PR 随之变化', async ({ page }) => {
    // 记录 100x5 一组
    await page.goto('/#/workout');
    await expect(page).toHaveURL(/#\/workout\?id=\d+/, { timeout: 15_000 });
    await page.getByRole('button', { name: '＋ 添加动作' }).click();
    await page.locator('.ex-item').first().click();
    await page.getByRole('button', { name: /＋ 下一组/ }).click();
    await doSet(page, '100', '5');
    await page.getByRole('button', { name: /完成训练/ }).click();
    await expect(page).toHaveURL(/#\/home/);

    await tab(page, /动作库/).click();
    await page.locator('.ex-row').filter({ hasText: '卧推 Bench Press' }).click();
    const pr = page.locator('.stats-grid .stat').nth(1).locator('.v'); // 估计1RM(PR)
    // 等待初始 PR（异步 refresh）渲染出来，避免读到 0
    await expect
      .poll(async () => Number((await pr.textContent()) ?? '0'), { timeout: 8_000 })
      .toBeGreaterThan(100);
    const epleyVal = Number((await pr.textContent()) ?? '0');

    // 切换到 Brzycki（refresh 为异步，轮询等待 PR 值变化，避免读过早拿到旧公式值）
    await page.locator('.formula-bar select').selectOption('brzycki');
    await expect
      .poll(async () => Number((await pr.textContent()) ?? '0'), { timeout: 8_000 })
      .not.toBe(epleyVal);
    const brzyckiVal = Number((await pr.textContent()) ?? '0');
    // Epley(100,5)=116.67; Brzycki(100,5)=112.5 -> 不同
    expect(brzyckiVal).not.toBe(epleyVal);
    expect(Math.abs(brzyckiVal - 112.5)).toBeLessThan(1);
  });

  test('清空数据二次确认：需输入"清空"二字', async ({ page }) => {
    // 先建一条数据
    await page.goto('/#/workout');
    await expect(page).toHaveURL(/#\/workout\?id=\d+/, { timeout: 15_000 });
    await page.getByRole('button', { name: '＋ 添加动作' }).click();
    await page.locator('.ex-item').first().click();

    await tab(page, /设置/).click();
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: '清空所有本地数据' }).click();
    // 进入二次输入阶段
    await expect(page.getByPlaceholder('清空')).toBeVisible();

    // 不输入直接点确认清空 -> 提示需输入
    await page.getByRole('button', { name: '确认清空' }).click();
    await expect(page.getByText('请输入"清空"二字以二次确认')).toBeVisible();

    // 输入正确后清空生效
    await page.getByPlaceholder('清空').fill('清空');
    await page.getByRole('button', { name: '确认清空' }).click();
    await page.waitForLoadState('networkidle');
    await tab(page, /历史/).click();
    await page.getByRole('button', { name: '按日期' }).click();
    await expect(page.getByText('暂无训练')).toBeVisible();
  });
});