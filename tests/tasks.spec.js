const { test, expect } = require('@playwright/test');

test.describe('任务清单 - Tasks Module', () => {
  test.describe.configure({ mode: 'parallel' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('#tab-tasks.active');
  });

  // ===== Tab State =====
  test('任务Tab默认显示且为空状态', async ({ page }) => {
    await expect(page.locator('#tab-tasks')).toBeVisible();
    await expect(page.locator('#tasks-list .empty-state')).toBeVisible();
    await expect(page.locator('#tasks-list .empty-state')).toContainText('还没有任务，添加第一个吧');
  });

  // ===== Add Task Dialog =====
  test('添加任务弹窗 — 打开/关闭', async ({ page }) => {
    await page.click('#add-task-btn');
    await expect(page.locator('#add-task-overlay')).toBeVisible();
    await page.click('#add-task-cancel');
    await expect(page.locator('#add-task-overlay')).not.toBeVisible();
  });

  test('添加任务弹窗 — 确认添加', async ({ page }) => {
    await page.click('#add-task-btn');
    await page.fill('#add-task-input', '完成项目报告');
    await page.click('#add-task-confirm');
    await expect(page.locator('#add-task-overlay')).not.toBeVisible();
    await expect(page.locator('#tasks-list .item-card')).toHaveCount(1);
    await expect(page.locator('#tasks-list .item-text')).toContainText('完成项目报告');
  });

  test('添加任务 — 重复调用init不会产生重复任务', async ({ page }) => {
    // 模拟 Settings.importData 重复调用 init 的场景
    await page.evaluate(() => {
      Tasks.init();
      Tasks.init();
      Tasks.init();
    });
    await page.click('#add-task-btn');
    await page.fill('#add-task-input', '防重复测试');
    await page.click('#add-task-confirm');
    // 确认按钮只触发一次，应只生成一个任务
    await expect(page.locator('#tasks-list .item-card')).toHaveCount(1);
    await expect(page.locator('#tasks-list .item-text')).toContainText('防重复测试');
  });

  test('添加任务弹窗 — 空输入不添加', async ({ page }) => {
    await page.click('#add-task-btn');
    await page.fill('#add-task-input', '  ');
    await page.click('#add-task-confirm');
    await expect(page.locator('#tasks-list > .item-card')).toHaveCount(0);
    // 聚焦输入框后再按 Escape 关闭弹窗
    await page.locator('#add-task-input').click();
    await page.keyboard.press('Escape');
    await expect(page.locator('#add-task-overlay')).not.toBeVisible();
  });

  test('添加任务弹窗 — Escape取消', async ({ page }) => {
    await page.click('#add-task-btn');
    await page.fill('#add-task-input', '测试任务');
    await page.keyboard.press('Escape');
    await expect(page.locator('#add-task-overlay')).not.toBeVisible();
    await expect(page.locator('#tasks-list .item-card')).toHaveCount(0);
  });

  test('添加任务弹窗 — Ctrl+Enter提交', async ({ page }) => {
    await page.click('#add-task-btn');
    await page.fill('#add-task-input', 'Ctrl+Enter测试');
    await page.keyboard.press('Control+Enter');
    await expect(page.locator('#add-task-overlay')).not.toBeVisible();
    await expect(page.locator('#tasks-list .item-card')).toHaveCount(1);
  });

  test('添加任务 — 字节数限制50', async ({ page }) => {
    await page.click('#add-task-btn');
    // 输入超过50字节的中文（一个中文字符3字节）
    const longText = '中'.repeat(17); // 51 bytes
    await page.fill('#add-task-input', longText);
    // 字节计数器文字上限50，但颜色变红表示超限
    await expect(page.locator('#add-task-char-count')).toContainText('50');
    // 点击确定不应添加
    await page.click('#add-task-confirm');
    await expect(page.locator('#add-task-overlay')).toBeVisible();
    await page.locator('#add-task-input').click();
    await page.keyboard.press('Escape');
  });

  test('添加任务 — 选择优先级', async ({ page }) => {
    await page.click('#add-task-btn');
    await page.fill('#add-task-input', '紧急任务');
    await page.selectOption('#add-task-priority', '1');
    await page.click('#add-task-confirm');

    // 验证优先级标签显示为"紧急"
    await expect(page.locator('#tasks-list .priority-badge')).toContainText('紧急');
  });

  // ===== Priority Sorting =====
  test('任务按优先级排序', async ({ page }) => {
    // 添加普通任务(3)
    await page.click('#add-task-btn');
    await page.fill('#add-task-input', '普通任务');
    await page.selectOption('#add-task-priority', '3');
    await page.click('#add-task-confirm');
    await page.waitForTimeout(30);

    // 添加紧急任务(1)
    await page.click('#add-task-btn');
    await page.fill('#add-task-input', '紧急任务');
    await page.selectOption('#add-task-priority', '1');
    await page.click('#add-task-confirm');
    await page.waitForTimeout(30);

    // 添加重要任务(2)
    await page.click('#add-task-btn');
    await page.fill('#add-task-input', '重要任务');
    await page.selectOption('#add-task-priority', '2');
    await page.click('#add-task-confirm');

    // 验证排序: 紧急 > 重要 > 普通
    const badges = page.locator('#tasks-list .priority-badge');
    await expect(badges.nth(0)).toContainText('紧急');
    await expect(badges.nth(1)).toContainText('重要');
    await expect(badges.nth(2)).toContainText('普通');
  });

  // ===== Priority Cycling =====
  test('优先级 — 点击循环切换', async ({ page }) => {
    await page.click('#add-task-btn');
    await page.fill('#add-task-input', '可切换优先级的任务');
    await page.selectOption('#add-task-priority', '2');
    await page.click('#add-task-confirm');

    const badge = page.locator('#tasks-list .priority-badge');
    await expect(badge).toContainText('重要');

    // 点击循环: 重要 → 普通
    await badge.click();
    await expect(badge).toContainText('普通');

    // 普通 → 紧急
    await badge.click();
    await expect(badge).toContainText('紧急');

    // 紧急 → 重要
    await badge.click();
    await expect(badge).toContainText('重要');
  });

  // ===== Edit Task Text =====
  test('编辑 — 点击文字编辑,失焦保存', async ({ page }) => {
    await page.click('#add-task-btn');
    await page.fill('#add-task-input', '原始内容');
    await page.click('#add-task-confirm');

    const textEl = page.locator('#tasks-list .item-text');
    await textEl.click();
    await textEl.fill('');
    await textEl.fill('修改后的内容');
    await page.locator('.app-title').click();

    await expect(textEl).toContainText('修改后的内容');
  });

  test('编辑 — 回车保存', async ({ page }) => {
    await page.click('#add-task-btn');
    await page.fill('#add-task-input', '原始内容');
    await page.click('#add-task-confirm');

    const textEl = page.locator('#tasks-list .item-text');
    await textEl.click();
    await textEl.fill('回车保存');
    await page.keyboard.press('Enter');

    await expect(textEl).toContainText('回车保存');
  });

  test('编辑 — Escape取消', async ({ page }) => {
    await page.click('#add-task-btn');
    await page.fill('#add-task-input', '原始内容');
    await page.click('#add-task-confirm');

    const textEl = page.locator('#tasks-list .item-text');
    await textEl.click();
    await textEl.fill('修改内容');
    await page.keyboard.press('Escape');

    await expect(textEl).toContainText('原始内容');
  });

  test('编辑 — 清空后失焦恢复', async ({ page }) => {
    await page.click('#add-task-btn');
    await page.fill('#add-task-input', '不能为空');
    await page.click('#add-task-confirm');

    const textEl = page.locator('#tasks-list .item-text');
    await textEl.click();
    await textEl.fill('');
    await page.locator('.app-title').click();

    await expect(textEl).toContainText('不能为空');
  });

  test('编辑 — 超过50字节自动还原', async ({ page }) => {
    await page.click('#add-task-btn');
    await page.fill('#add-task-input', '原始简短内容');
    await page.click('#add-task-confirm');

    const textEl = page.locator('#tasks-list .item-text');
    await expect(textEl).toContainText('原始简短内容');

    // 尝试编辑为超长内容
    await textEl.click();
    await textEl.fill('');
    await textEl.fill('中'.repeat(17)); // 51字节
    await page.locator('.app-title').click();

    // 应自动还原
    await expect(textEl).toContainText('原始简短内容');
  });

  // ===== Complete Task =====
  test('完成任务 — 勾选新增完成记录', async ({ page }) => {
    await page.click('#add-task-btn');
    await page.fill('#add-task-input', '待完成任务');
    await page.click('#add-task-confirm');

    // 任务仍在列表中，没有状态变化
    await expect(page.locator('#tasks-list .item-card')).toHaveCount(1);

    // 勾选
    await page.locator('#tasks-list .task-checkbox').click();

    // 任务依然在列表中（状态不变）
    await expect(page.locator('#tasks-list > .item-card')).toHaveCount(1);

    // 展开已完成任务区
    await page.click('#toggle-completed-btn');
    await expect(page.locator('#completed-tasks-list')).toBeVisible();
    await expect(page.locator('#completed-tasks-list .item-card')).toHaveCount(1);
    await expect(page.locator('#completed-tasks-list .item-text')).toContainText('待完成任务');
  });

  test('完成任务 — 等待toast消失后可再次勾选', async ({ page }) => {
    await page.click('#add-task-btn');
    await page.fill('#add-task-input', '重复完成');
    await page.click('#add-task-confirm');

    const checkbox = page.locator('#tasks-list .task-checkbox');
    await checkbox.click();
    // 等待 toast 消失后 checkbox 恢复
    await page.waitForTimeout(2500);
    await checkbox.click();
    await page.waitForTimeout(2500);

    await page.click('#toggle-completed-btn');
    await expect(page.locator('#completed-tasks-list .item-card')).toHaveCount(2);
  });

  // ===== Completed Section =====
  test('已完成 — 删除完成记录', async ({ page }) => {
    await page.click('#add-task-btn');
    await page.fill('#add-task-input', '将被记录');
    await page.click('#add-task-confirm');

    await page.locator('#tasks-list .task-checkbox').click();
    await page.click('#toggle-completed-btn');
    await expect(page.locator('#completed-tasks-list .item-card')).toHaveCount(1);

    // 删除记录
    await page.locator('#completed-tasks-list .btn-danger').click();
    await expect(page.locator('#confirm-overlay')).toBeVisible();
    await expect(page.locator('#confirm-message')).toContainText('确定要删除此完成记录吗？');
    await page.click('#confirm-ok');
    await expect(page.locator('#completed-tasks-list .item-card')).toHaveCount(0);
  });

  test('已完成 — 取消删除记录', async ({ page }) => {
    await page.click('#add-task-btn');
    await page.fill('#add-task-input', '保留记录');
    await page.click('#add-task-confirm');

    await page.locator('#tasks-list .task-checkbox').click();
    await page.click('#toggle-completed-btn');
    await expect(page.locator('#completed-tasks-list .item-card')).toHaveCount(1);

    await page.locator('#completed-tasks-list .btn-danger').click();
    await page.click('#confirm-cancel');
    await expect(page.locator('#completed-tasks-list .item-card')).toHaveCount(1);
  });

  test('已完成 — 按日期折叠,默认展开最新日期', async ({ page }) => {
    await page.click('#add-task-btn');
    await page.fill('#add-task-input', '完成记录');
    await page.click('#add-task-confirm');

    await page.locator('#tasks-list .task-checkbox').click();
    await page.click('#toggle-completed-btn');

    // 验证日期标题可点击
    const dateHeader = page.locator('#completed-tasks-list div[onclick*="toggleCompletedDate"]').first();
    await expect(dateHeader).toBeVisible();

    // 点击收起
    await dateHeader.click();
    // 记录应被隐藏
    await expect(page.locator('#completed-tasks-list .item-card')).not.toBeVisible();
  });

  // ===== Archive (Delete) =====
  test('归档 — 删除任务移到归档区', async ({ page }) => {
    await page.click('#add-task-btn');
    await page.fill('#add-task-input', '待归档任务');
    await page.click('#add-task-confirm');
    await expect(page.locator('#tasks-list .item-card')).toHaveCount(1);

    // 删除任务
    await page.locator('#tasks-list .btn-danger').click();
    await expect(page.locator('#tasks-list > .item-card')).toHaveCount(0);

    // 展开归档区
    await page.click('#toggle-deleted-btn');
    await expect(page.locator('#deleted-tasks-list .item-card')).toHaveCount(1);
    await expect(page.locator('#deleted-tasks-list .item-text')).toContainText('待归档任务');
  });

  test('归档 — 恢复任务', async ({ page }) => {
    await page.click('#add-task-btn');
    await page.fill('#add-task-input', '恢复测试');
    await page.click('#add-task-confirm');

    await page.locator('#tasks-list .btn-danger').click();
    await page.click('#toggle-deleted-btn');
    await expect(page.locator('#deleted-tasks-list .item-card')).toHaveCount(1);

    // 恢复
    await page.locator('#deleted-tasks-list button').filter({ hasText: '恢复' }).click();
    await expect(page.locator('#deleted-tasks-list .item-card')).toHaveCount(0);
    await expect(page.locator('#tasks-list .item-card')).toHaveCount(1);
    await expect(page.locator('#tasks-list .item-text')).toContainText('恢复测试');
  });

  test('归档 — 永久删除带确认', async ({ page }) => {
    await page.click('#add-task-btn');
    await page.fill('#add-task-input', '永久删除');
    await page.click('#add-task-confirm');

    await page.locator('#tasks-list .btn-danger').click();
    await page.click('#toggle-deleted-btn');
    await expect(page.locator('#deleted-tasks-list .item-card')).toHaveCount(1);

    // 永久删除
    await page.locator('#deleted-tasks-list .btn-danger').click();
    await expect(page.locator('#confirm-overlay')).toBeVisible();
    await expect(page.locator('#confirm-message')).toContainText('确定要永久删除这条任务吗？');
    await page.click('#confirm-ok');

    await expect(page.locator('#deleted-tasks-list .item-card')).toHaveCount(0);
  });

  test('归档 — 取消永久删除', async ({ page }) => {
    await page.click('#add-task-btn');
    await page.fill('#add-task-input', '保留任务');
    await page.click('#add-task-confirm');

    await page.locator('#tasks-list .btn-danger').click();
    await page.click('#toggle-deleted-btn');

    await page.locator('#deleted-tasks-list .btn-danger').click();
    await page.click('#confirm-cancel');
    await expect(page.locator('#deleted-tasks-list .item-card')).toHaveCount(1);
  });

  // ===== Search =====
  test('搜索 — 按任务名过滤', async ({ page }) => {
    await page.click('#add-task-btn');
    await page.fill('#add-task-input', '买 groceries');
    await page.click('#add-task-confirm');
    await page.click('#add-task-btn');
    await page.fill('#add-task-input', '写周报');
    await page.click('#add-task-confirm');
    await page.click('#add-task-btn');
    await page.fill('#add-task-input', '健身');
    await page.click('#add-task-confirm');

    await page.fill('#header-search', '周报');
    await expect(page.locator('#tasks-list .item-card')).toHaveCount(1);
    await expect(page.locator('#tasks-list .item-text')).toContainText('写周报');
  });

  test('搜索 — 无匹配提示', async ({ page }) => {
    await page.click('#add-task-btn');
    await page.fill('#add-task-input', '普通任务');
    await page.click('#add-task-confirm');

    await page.fill('#header-search', '不存在的任务');
    await expect(page.locator('#tasks-list .no-results')).toBeVisible();
    await expect(page.locator('#tasks-list .no-results')).toContainText('未找到相关任务');
  });

  test('搜索 — 清空恢复列表', async ({ page }) => {
    await page.click('#add-task-btn');
    await page.fill('#add-task-input', '任务甲');
    await page.click('#add-task-confirm');
    await page.click('#add-task-btn');
    await page.fill('#add-task-input', '任务乙');
    await page.click('#add-task-confirm');

    await page.fill('#header-search', '任务甲');
    await expect(page.locator('#tasks-list .item-card')).toHaveCount(1);
    await page.fill('#header-search', '');
    await expect(page.locator('#tasks-list .item-card')).toHaveCount(2);
  });

  // ===== Tab Switching =====
  test('切换Tab再切回,数据不丢失', async ({ page }) => {
    await page.click('#add-task-btn');
    await page.fill('#add-task-input', '跨Tab测试');
    await page.click('#add-task-confirm');

    await page.click('button[data-tab="ideas"]');
    await expect(page.locator('#tab-ideas')).toBeVisible();
    await page.click('button[data-tab="tasks"]');
    await expect(page.locator('#tasks-list .item-card')).toHaveCount(1);
    await expect(page.locator('#tasks-list .item-text')).toContainText('跨Tab测试');
  });

  // ===== localStorage =====
  test('localStorage 数据持久化', async ({ page }) => {
    await page.click('#add-task-btn');
    await page.fill('#add-task-input', '持久化任务');
    await page.click('#add-task-confirm');

    const data = await page.evaluate(() => localStorage.getItem('trios_tasks'));
    const parsed = JSON.parse(data);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].text).toBe('持久化任务');
    expect(parsed[0].id).toBeTruthy();
    expect(parsed[0].createdAt).toBeTruthy();
  });

  test('刷新页面后数据仍然存在', async ({ page }) => {
    await page.click('#add-task-btn');
    await page.fill('#add-task-input', '刷新保留测试');
    await page.click('#add-task-confirm');
    await expect(page.locator('#tasks-list .item-card')).toHaveCount(1);

    await page.reload();
    await page.waitForSelector('#tab-tasks.active');
    await expect(page.locator('#tasks-list .item-card')).toHaveCount(1);
    await expect(page.locator('#tasks-list .item-text')).toContainText('刷新保留测试');
  });
});
