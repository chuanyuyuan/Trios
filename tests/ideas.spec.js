const { test, expect } = require('@playwright/test');

test.describe('灵感笔记 - Ideas Module', () => {
  test.describe.configure({ mode: 'parallel' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('#tab-tasks.active');
    await page.click('button[data-tab="ideas"]');
    await page.waitForSelector('#tab-ideas.active');
  });

  // ===== Tab State =====
  test('灵感Tab为空状态', async ({ page }) => {
    await expect(page.locator('#tab-ideas')).toBeVisible();
    await expect(page.locator('#tab-ideas .empty-state')).toBeVisible();
    await expect(page.locator('#tab-ideas .empty-state')).toContainText('还没有灵感，开始记录吧');
  });

  // ===== Add (记录按钮) =====
  test('记录按钮 — 添加一条灵感', async ({ page }) => {
    await page.fill('#idea-input', '这是我的第一条灵感');
    await page.click('#ideas-form button[type="submit"]');
    await expect(page.locator('#ideas-list .item-card')).toHaveCount(1);
    await expect(page.locator('#ideas-list .item-text')).toContainText('这是我的第一条灵感');
  });

  test('记录按钮 — 多行文本', async ({ page }) => {
    await page.fill('#idea-input', '第一行\n第二行\n第三行');
    await page.click('#ideas-form button[type="submit"]');
    await expect(page.locator('#ideas-list .item-card')).toHaveCount(1);
    await expect(page.locator('#ideas-list .item-text')).toContainText('第一行');
  });

  test('记录按钮 — 添加多条灵感,按时间倒序排列', async ({ page }) => {
    await page.fill('#idea-input', '灵感A');
    await page.click('#ideas-form button[type="submit"]');
    await page.waitForTimeout(50);

    await page.fill('#idea-input', '灵感B');
    await page.click('#ideas-form button[type="submit"]');
    await page.waitForTimeout(50);

    await page.fill('#idea-input', '灵感C');
    await page.click('#ideas-form button[type="submit"]');

    const items = page.locator('#ideas-list .item-text');
    await expect(items).toHaveCount(3);
    // 最新的在最上面
    await expect(items.nth(0)).toContainText('灵感C');
    await expect(items.nth(1)).toContainText('灵感B');
    await expect(items.nth(2)).toContainText('灵感A');
  });

  test('记录按钮 — 空白输入不添加', async ({ page }) => {
    await page.fill('#idea-input', '  ');
    await page.click('#ideas-form button[type="submit"]');
    await expect(page.locator('#ideas-list .item-card')).toHaveCount(0);
    await expect(page.locator('#ideas-list .empty-state')).toBeVisible();
  });

  test('记录后输入框自动清空', async ({ page }) => {
    await page.fill('#idea-input', '自动清空测试');
    await page.click('#ideas-form button[type="submit"]');
    await expect(page.locator('#idea-input')).toHaveValue('');
  });

  // ===== Delete (删除按钮) =====
  test('删除按钮 — 确认后删除', async ({ page }) => {
    await page.fill('#idea-input', '将被删除');
    await page.click('#ideas-form button[type="submit"]');
    await expect(page.locator('#ideas-list .item-card')).toHaveCount(1);

    // 点击删除 -> 弹出确认弹窗
    await page.click('#ideas-list .btn-danger');
    await expect(page.locator('#confirm-overlay')).toBeVisible();
    // 校验弹窗文案
    await expect(page.locator('#confirm-message')).toContainText('确定要删除这条灵感吗？');

    // 点击"确定"
    await page.click('#confirm-ok');
    await expect(page.locator('#confirm-overlay')).not.toBeVisible();

    await expect(page.locator('#ideas-list .item-card')).toHaveCount(0);
    await expect(page.locator('#ideas-list .empty-state')).toBeVisible();
  });

  test('删除按钮 — 取消弹窗则不删', async ({ page }) => {
    await page.fill('#idea-input', '不会被删');
    await page.click('#ideas-form button[type="submit"]');
    await expect(page.locator('#ideas-list .item-card')).toHaveCount(1);

    // 点击删除 -> 弹出确认弹窗
    await page.click('#ideas-list .btn-danger');
    await expect(page.locator('#confirm-overlay')).toBeVisible();

    // 点击"取消"
    await page.click('#confirm-cancel');
    await expect(page.locator('#confirm-overlay')).not.toBeVisible();

    await expect(page.locator('#ideas-list .item-card')).toHaveCount(1);
    await expect(page.locator('#ideas-list .item-text')).toContainText('不会被删');
  });

  // ===== Search (搜索 + 清除) =====
  test('搜索 — 按关键字过滤灵感', async ({ page }) => {
    await page.fill('#idea-input', 'JavaScript 学习笔记');
    await page.click('#ideas-form button[type="submit"]');
    await page.fill('#idea-input', 'Python 数据分析');
    await page.click('#ideas-form button[type="submit"]');
    await page.fill('#idea-input', '今日心情记录');
    await page.click('#ideas-form button[type="submit"]');

    await page.fill('#header-search', 'Python');
    await expect(page.locator('#ideas-list .item-card')).toHaveCount(1);
    await expect(page.locator('#ideas-list .item-text')).toContainText('Python 数据分析');
  });

  test('搜索 — 不区分大小写', async ({ page }) => {
    await page.fill('#idea-input', 'Hello World');
    await page.click('#ideas-form button[type="submit"]');
    await page.fill('#idea-input', 'hello world');
    await page.click('#ideas-form button[type="submit"]');

    // 搜索 "hello"
    await page.fill('#header-search', 'HELLO');
    await expect(page.locator('#ideas-list .item-card')).toHaveCount(2);
  });

  test('搜索 — 无匹配时显示无结果提示', async ({ page }) => {
    await page.fill('#idea-input', '普通灵感');
    await page.click('#ideas-form button[type="submit"]');

    await page.fill('#header-search', '不存在的关键字');
    await expect(page.locator('#ideas-list .no-results')).toBeVisible();
    await expect(page.locator('#ideas-list .no-results')).toContainText('未找到相关灵感');
  });

  test('搜索清除 — 清空搜索框恢复列表', async ({ page }) => {
    await page.fill('#idea-input', '第一个灵感');
    await page.click('#ideas-form button[type="submit"]');
    await page.fill('#idea-input', '第二个灵感');
    await page.click('#ideas-form button[type="submit"]');

    await page.fill('#header-search', '第一个');
    await expect(page.locator('#ideas-list .item-card')).toHaveCount(1);

    // 浏览器原生 search 的 X 按钮会触发 search 事件
    // 用 fill('') 模拟清除
    await page.fill('#header-search', '');
    await expect(page.locator('#ideas-list .item-card')).toHaveCount(2);
  });

  test('搜索框为空时显示全部', async ({ page }) => {
    await page.fill('#idea-input', '灵感A');
    await page.click('#ideas-form button[type="submit"]');
    await page.fill('#idea-input', '灵感B');
    await page.click('#ideas-form button[type="submit"]');

    // 空字符串搜索（模糊匹配）
    await page.fill('#header-search', '');
    await expect(page.locator('#ideas-list .item-card')).toHaveCount(2);
  });

  // ===== Edit (点击编辑) =====
  test('编辑 — 点击文字进入编辑,失焦保存', async ({ page }) => {
    await page.fill('#idea-input', '原始内容');
    await page.click('#ideas-form button[type="submit"]');

    const textEl = page.locator('#ideas-list .item-text');
    await expect(textEl).toContainText('原始内容');

    // 点击进入编辑模式
    await textEl.click();
    // 清空后输入新内容
    await textEl.fill('');
    await textEl.fill('修改后的内容');
    // 点击其他地方失焦
    await page.locator('.app-title').click();

    await expect(textEl).toContainText('修改后的内容');
  });

  test('编辑 — 按 Escape 取消编辑', async ({ page }) => {
    await page.fill('#idea-input', '原始内容');
    await page.click('#ideas-form button[type="submit"]');

    const textEl = page.locator('#ideas-list .item-text');
    await textEl.click();

    // 输入新内容但按 Escape
    await textEl.fill('');
    await textEl.fill('应该被还原的内容');
    await page.keyboard.press('Escape');

    await expect(textEl).toContainText('原始内容');
  });

  test('编辑 — 清空内容后失焦恢复原内容', async ({ page }) => {
    await page.fill('#idea-input', '不能被清空');
    await page.click('#ideas-form button[type="submit"]');

    const textEl = page.locator('#ideas-list .item-text');
    await textEl.click();

    await textEl.fill('');
    // 失焦
    await page.locator('.app-title').click();

    // 被还原
    await expect(textEl).toContainText('不能被清空');
  });

  // ===== Timestamp =====
  test('时间戳显示', async ({ page }) => {
    await page.fill('#idea-input', '查看时间戳');
    await page.click('#ideas-form button[type="submit"]');

    const meta = page.locator('#ideas-list .item-meta');
    // 格式应为 "YYYY-MM-DD HH:MM"
    await expect(meta).toContainText(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/);
  });

  // ===== Tab 切换不影响数据 =====
  test('切换到其他Tab再切回,数据不丢失', async ({ page }) => {
    await page.fill('#idea-input', '跨Tab测试');
    await page.click('#ideas-form button[type="submit"]');

    // 切到电影Tab
    await page.click('button[data-tab="movies"]');
    await expect(page.locator('#tab-movies')).toBeVisible();
    await expect(page.locator('#tab-ideas')).not.toBeVisible();

    // 切回灵感Tab
    await page.click('button[data-tab="ideas"]');
    await expect(page.locator('#tab-ideas')).toBeVisible();
    await expect(page.locator('#ideas-list .item-card')).toHaveCount(1);
    await expect(page.locator('#ideas-list .item-text')).toContainText('跨Tab测试');
  });

  // ===== localStorage 持久化 =====
  test('localStorage 数据持久化', async ({ page }) => {
    await page.fill('#idea-input', '持久化测试数据');
    await page.click('#ideas-form button[type="submit"]');

    // 检查 localStorage
    const data = await page.evaluate(() => localStorage.getItem('trios_ideas'));
    const parsed = JSON.parse(data);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].content).toBe('持久化测试数据');
    expect(parsed[0].id).toBeTruthy();
    expect(parsed[0].createdAt).toBeTruthy();
    expect(parsed[0].updatedAt).toBeTruthy();
  });

  test('刷新页面后数据仍然存在', async ({ page }) => {
    await page.fill('#idea-input', '刷新保留测试');
    await page.click('#ideas-form button[type="submit"]');
    await expect(page.locator('#ideas-list .item-card')).toHaveCount(1);

    await page.reload();
    await expect(page.locator('#ideas-list .item-card')).toHaveCount(1);
    await expect(page.locator('#ideas-list .item-text')).toContainText('刷新保留测试');
  });

});
