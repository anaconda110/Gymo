import { test, expect } from '@playwright/test';
import fs from 'node:fs';

// Gymo 核心交互闭环 e2e 验证：
// 无 id 自动创建训练 → 添加动作 → 逐组记录 weight×reps(含RPE) → 下一组/复制组/删除组
// → 组间计时器 → 完成训练 → 历史页 PR(估计1RM)与容量 → 设置页 JSON 导出 → 清空 → JSON 导入恢复
//
// 仅以无头浏览器对 `npm run preview`(构建产物)运行，不依赖任何后端/网络。

test.describe('Gymo 核心闭环', () => {
  // 仅限底部 tabbar 内的导航按钮，避免与页面内同名按钮冲突
  const tab = (page: import('@playwright/test').Page, name: RegExp) =>
    page.locator('nav.tabbar').getByRole('button', { name });

  test('完整训练记录 → 历史 → 导出 → 清空 → 导入恢复', async ({ page }) => {
    // 1) 直达 #/workout 不带 id：应自动创建新训练并跳转，不卡在“加载中…”
    await page.goto('/#/workout');
    await expect(page).toHaveURL(/#\/workout\?id=\d+/, { timeout: 15_000 });
    await expect(page.getByText('＋ 添加动作')).toBeVisible();
    await expect(page.getByText('加载中…')).toHaveCount(0);

    // 2) 添加动作
    await page.getByRole('button', { name: '＋ 添加动作' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.locator('.ex-item').first().click();
    await expect(page.getByText('卧推 Bench Press')).toBeVisible();

    // 3) 逐组记录 weight×reps(含 RPE)
    await page.getByRole('button', { name: /＋ 下一组/ }).click();
    const row1 = page.locator('.set-row').first();
    await row1.locator('input').nth(0).fill('100'); // 重量
    await row1.locator('input').nth(1).fill('8'); // 次数
    await row1.locator('input').nth(2).fill('8'); // RPE

    // 完成该组 → 组间计时器弹出
    await row1.locator('input[type="checkbox"]').check();
    await expect(page.locator('.timer-bar')).toBeVisible();
    await page.getByRole('button', { name: '跳过' }).click();
    await expect(page.locator('.timer-bar')).toHaveCount(0);

    // 4) 智能下一组（预填上一组）并修改次数
    await page.getByRole('button', { name: /＋ 下一组/ }).click();
    const row2 = page.locator('.set-row').nth(1);
    await expect(row2.locator('input').nth(0)).toHaveValue('100'); // 预填重量
    await row2.locator('input').nth(1).fill('6'); // 改次数
    await row2.locator('input[type="checkbox"]').check();
    await page.getByRole('button', { name: '跳过' }).click();

    // 5) 复制组 → 删除组
    await page.locator('.set-row').first().locator('button[title="复制组"]').click();
    await expect(page.locator('.set-row')).toHaveCount(3);
    await page.locator('.set-row').last().locator('button[title="删除组"]').click();
    await expect(page.locator('.set-row')).toHaveCount(2);

    // 训练备注
    await page.getByPlaceholder('训练备注…').fill('e2e test workout');

    // 6) 完成训练 → 回首页
    await page.getByRole('button', { name: /完成训练/ }).click();
    await expect(page).toHaveURL(/#\/home/);

    // 7) 历史页能看到该动作 PR(估计1RM) > 0
    await tab(page, /历史/).click();
    await expect(page).toHaveURL(/#\/history/);
    const exRow = page.locator('.ex-row').filter({ hasText: '卧推 Bench Press' });
    await expect(exRow).toBeVisible();
    const prText = (await exRow.locator('.big').textContent()) ?? '0';
    expect(Number(prText)).toBeGreaterThan(0);

    // 8) 设置页 JSON 导出（捕获下载，断言非空且含训练与组）
    await tab(page, /设置/).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: '导出 JSON 备份（全量）' }).click();
    const download = await downloadPromise;
    const exportPath = '/tmp/gymo-export.json';
    await download.saveAs(exportPath);
    const text = fs.readFileSync(exportPath, 'utf8');
    expect(text.length).toBeGreaterThan(0);
    const json = JSON.parse(text);
    expect(json.app).toBe('Gymo');
    expect(json.data.workouts.length).toBeGreaterThan(0);
    expect(json.data.sets.length).toBeGreaterThan(0);

    // 9) 清空所有本地数据（二次确认：先 confirm，再输入"清空"二字）
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: '清空所有本地数据' }).click();
    await expect(page.getByPlaceholder('清空')).toBeVisible();
    await page.getByPlaceholder('清空').fill('清空');
    await page.getByRole('button', { name: '确认清空' }).click();
    await page.waitForLoadState('networkidle');
    // 验证历史已被清空（按日期视图显示“暂无训练”）
    await tab(page, /历史/).click();
    await page.getByRole('button', { name: '按日期' }).click();
    await expect(page.getByText('暂无训练')).toBeVisible();

    // 10) JSON 导入恢复
    await tab(page, /设置/).click();
    await page.locator('input[type="file"]').setInputFiles(exportPath);
    await expect(page.getByText('导入成功')).toBeVisible();

    // 验证历史已恢复：按日期有训练，按动作 PR>0
    await tab(page, /历史/).click();
    await page.getByRole('button', { name: '按日期' }).click();
    await expect(page.locator('.card')).toHaveCount(1);
    await page.getByRole('button', { name: '按动作' }).click();
    const restoredRow = page.locator('.ex-row').filter({ hasText: '卧推 Bench Press' });
    await expect(restoredRow).toBeVisible();
    const restoredPR = Number((await restoredRow.locator('.big').textContent()) ?? '0');
    expect(restoredPR).toBeGreaterThan(0);
  });

  test('增强：趋势图 / 日历 / 身体测量 / 模板导入导出 / 组类型', async ({ page }) => {
    // ---- 准备：先记录一次训练（含一组），保证趋势图与日历有数据 ----
    await page.goto('/#/workout');
    await expect(page).toHaveURL(/#\/workout\?id=\d+/, { timeout: 15_000 });
    await page.getByRole('button', { name: '＋ 添加动作' }).click();
    await page.locator('.ex-item').first().click();
    await page.getByRole('button', { name: /＋ 下一组/ }).click();
    const row = page.locator('.set-row').first();
    await row.locator('input').nth(0).fill('80');
    await row.locator('input').nth(1).fill('5');

    // 设置该组的组类型为“超级组”
    const typeSelect = row.locator('select[aria-label="组类型"]');
    await typeSelect.selectOption('superset');
    await row.locator('input[type="checkbox"]').check();
    await page.getByRole('button', { name: '跳过' }).click();

    // 给动作设置超级组编号（在动作菜单中）
    await page.locator('.card.ex .menu').first().click();
    // 超级组编号输入（id 以 ss- 开头）
    const ssField = page.locator('.card.ex input[id^="ss-"]').first();
    await ssField.fill('1');
    await page.locator('.card.ex .rest-edit').first().getByRole('button', { name: '设置' }).click();

    await page.getByPlaceholder('训练备注…').fill('enhance workout');
    await page.getByRole('button', { name: /完成训练/ }).click();
    await expect(page).toHaveURL(/#\/home/);

    // ---- 趋势图 SVG 节点存在（动作详情页） ----
    await tab(page, /动作库/).click();
    await page.locator('.ex-row').filter({ hasText: '卧推 Bench Press' }).click();
    await expect(page).toHaveURL(/#\/exercise\?id=\d+/);
    const trendSvg = page.locator('.chart-wrap svg.chart');
    await expect(trendSvg).toBeVisible();
    await expect(trendSvg.locator('path')).toHaveCount(2); // 两条趋势线（1RM + 容量）
    // 组类型统计显示超级组
    await expect(page.locator('.type-row')).toContainText('超级组');

    // ---- 日历视图渲染且当天有训练 ----
    await tab(page, /历史/).click();
    await page.getByRole('button', { name: '日历' }).click();
    await expect(page.locator('.calendar')).toBeVisible();
    // 今天应有训练且可点击
    const todayCell = page.locator('.calendar .cell.today');
    await expect(todayCell).toBeVisible();
    await expect(todayCell.locator('.d-dot')).toBeVisible();
    await expect(todayCell).not.toBeDisabled();

    // 按动作视图显示组类型统计
    await page.getByRole('button', { name: '按动作' }).click();
    await expect(page.locator('.type-row')).toContainText('超级组');

    // ---- 身体测量：新增后折线有节点 ----
    await tab(page, /身体/).click();
    await expect(page).toHaveURL(/#\/body/);
    await page.getByRole('button', { name: '＋ 记录' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.locator('input[id="bm-bodyweight"]').fill('75');
    await page.getByRole('button', { name: '保存' }).click();
    // 折线图渲染且至少有一个 circle 节点
    const bodySvg = page.locator('.wrap svg.chart');
    await expect(bodySvg).toBeVisible();
    await expect(bodySvg.locator('circle')).toHaveCount(1);

    // ---- 模板导出/导入 ----
    await tab(page, /计划/).click();
    // 新建一个模板并添加动作
    await page.getByRole('button', { name: '＋ 新建' }).click();
    await expect(page).toHaveURL(/#\/template-edit\?id=\d+/);
    await page.locator('input[id="tmpl-name"]').fill('e2e-template');
    await page.getByRole('button', { name: '＋ 添加动作' }).click();
    await page.locator('select').first().selectOption({ index: 1 });
    await page.getByRole('button', { name: '添加', exact: true }).click();
    // 回到模板列表
    await page.locator('.topbar .back').click();
    await expect(page).toHaveURL(/#\/templates/);

    // 导出模板（捕获下载，断言非空且为 Gymo-Template）
    const tmplCard = page.locator('.tcard').filter({ hasText: 'e2e-template' });
    const dlPromise = page.waitForEvent('download');
    await tmplCard.getByRole('button', { name: '导出' }).click();
    const dl = await dlPromise;
    const tmplPath = '/tmp/gymo-template.json';
    await dl.saveAs(tmplPath);
    const tmplText = fs.readFileSync(tmplPath, 'utf8');
    expect(tmplText.length).toBeGreaterThan(0);
    const tmplJson = JSON.parse(tmplText);
    expect(tmplJson.app).toBe('Gymo-Template');
    expect(tmplJson.exercises.length).toBeGreaterThan(0);

    // 删除该模板，再导入恢复
    page.once('dialog', (d) => d.accept());
    await tmplCard.getByRole('button', { name: '删除' }).click();
    await expect(page.locator('.tcard').filter({ hasText: 'e2e-template' })).toHaveCount(0);

    await page.locator('input[type="file"]').setInputFiles(tmplPath);
    await expect(page.getByText(/导入成功/)).toBeVisible();
    await expect(page.locator('.tcard').filter({ hasText: 'e2e-template' })).toHaveCount(1);

    // ---- 全量备份应包含身体测量 ----
    await tab(page, /设置/).click();
    const backupPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: '导出 JSON 备份（全量）' }).click();
    const backup = await backupPromise;
    const backupPath = '/tmp/gymo-backup-enhance.json';
    await backup.saveAs(backupPath);
    const backupJson = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    expect(backupJson.data.bodyMeasurements.length).toBeGreaterThan(0);
  });
});