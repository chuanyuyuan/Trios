const { test, expect } = require('@playwright/test');

test.describe('电影清单 - Movies Module', () => {
  test.describe.configure({ mode: 'parallel' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('#tab-tasks.active');
    await page.click('button[data-tab="movies"]');
    await page.waitForSelector('#tab-movies.active');
  });

  // ===== Tab State =====
  test('电影Tab为空状态', async ({ page }) => {
    await expect(page.locator('#tab-movies')).toBeVisible();
    await expect(page.locator('#movies-list .empty-state')).toBeVisible();
    await expect(page.locator('#movies-list .empty-state')).toContainText('还没有电影，添加第一部吧');
  });

  // ===== Add Movie Dialog =====
  test('添加电影弹窗 — 打开/关闭', async ({ page }) => {
    await page.click('#add-movie-btn');
    await expect(page.locator('#add-movie-overlay')).toBeVisible();
    await page.click('#add-movie-cancel');
    await expect(page.locator('#add-movie-overlay')).not.toBeVisible();
  });

  test('添加电影弹窗 — 确认添加', async ({ page }) => {
    await page.click('#add-movie-btn');
    await page.fill('#add-movie-input', '盗梦空间');
    await page.click('#add-movie-confirm');
    await expect(page.locator('#add-movie-overlay')).not.toBeVisible();
    await expect(page.locator('#movies-list .item-card')).toHaveCount(1);
    await expect(page.locator('#movies-list .item-text')).toContainText('盗梦空间');
  });

  test('添加电影弹窗 — 空输入不添加', async ({ page }) => {
    await page.click('#add-movie-btn');
    await page.fill('#add-movie-input', '  ');
    await page.click('#add-movie-confirm');
    await expect(page.locator('#add-movie-overlay')).toBeVisible();
    await page.click('#add-movie-cancel');
    await expect(page.locator('#movies-list .item-card')).toHaveCount(0);
  });

  test('添加电影弹窗 — 回车确认', async ({ page }) => {
    await page.click('#add-movie-btn');
    await page.fill('#add-movie-input', '星际穿越');
    await page.keyboard.press('Enter');
    await expect(page.locator('#add-movie-overlay')).not.toBeVisible();
    await expect(page.locator('#movies-list .item-card')).toHaveCount(1);
  });

  test('添加电影弹窗 — Escape取消', async ({ page }) => {
    await page.click('#add-movie-btn');
    await page.fill('#add-movie-input', '星际穿越');
    await page.keyboard.press('Escape');
    await expect(page.locator('#add-movie-overlay')).not.toBeVisible();
    await expect(page.locator('#movies-list .item-card')).toHaveCount(0);
  });

  test('添加电影弹窗 — 点击背景关闭', async ({ page }) => {
    await page.click('#add-movie-btn');
    await expect(page.locator('#add-movie-overlay')).toBeVisible();
    await page.click('#add-movie-overlay', { position: { x: 10, y: 10 } });
    await expect(page.locator('#add-movie-overlay')).not.toBeVisible();
  });

  test('添加多条电影,按时间倒序排列', async ({ page }) => {
    await page.click('#add-movie-btn');
    await page.fill('#add-movie-input', '电影A');
    await page.click('#add-movie-confirm');
    await page.waitForTimeout(50);

    await page.click('#add-movie-btn');
    await page.fill('#add-movie-input', '电影B');
    await page.click('#add-movie-confirm');
    await page.waitForTimeout(50);

    await page.click('#add-movie-btn');
    await page.fill('#add-movie-input', '电影C');
    await page.click('#add-movie-confirm');

    const items = page.locator('#movies-list .item-text');
    await expect(items).toHaveCount(3);
    await expect(items.nth(0)).toContainText('电影C');
    await expect(items.nth(1)).toContainText('电影B');
    await expect(items.nth(2)).toContainText('电影A');
  });

  // ===== Edit Movie Name =====
  test('编辑 — 点击文字编辑,失焦保存', async ({ page }) => {
    await page.click('#add-movie-btn');
    await page.fill('#add-movie-input', '原片名');
    await page.click('#add-movie-confirm');

    const textEl = page.locator('#movies-list .item-text');
    await expect(textEl).toContainText('原片名');
    await textEl.click();
    await textEl.fill('');
    await textEl.fill('新片名');
    await page.locator('.app-title').click();

    await expect(textEl).toContainText('新片名');
  });

  test('编辑 — 回车保存', async ({ page }) => {
    await page.click('#add-movie-btn');
    await page.fill('#add-movie-input', '原片名');
    await page.click('#add-movie-confirm');

    const textEl = page.locator('#movies-list .item-text');
    await textEl.click();
    await textEl.fill('回车保存');
    await page.keyboard.press('Enter');

    await expect(textEl).toContainText('回车保存');
  });

  test('编辑 — Escape取消', async ({ page }) => {
    await page.click('#add-movie-btn');
    await page.fill('#add-movie-input', '原片名');
    await page.click('#add-movie-confirm');

    const textEl = page.locator('#movies-list .item-text');
    await textEl.click();
    await textEl.fill('新名字');
    await page.keyboard.press('Escape');

    await expect(textEl).toContainText('原片名');
  });

  test('编辑 — 清空后失焦恢复原内容', async ({ page }) => {
    await page.click('#add-movie-btn');
    await page.fill('#add-movie-input', '不能被清空');
    await page.click('#add-movie-confirm');

    const textEl = page.locator('#movies-list .item-text');
    await textEl.click();
    await textEl.fill('');
    await page.locator('.app-title').click();

    await expect(textEl).toContainText('不能被清空');
  });

  // ===== Watched Toggle =====
  test('标记看过 — 切换状态', async ({ page }) => {
    await page.click('#add-movie-btn');
    await page.fill('#add-movie-input', '盗梦空间');
    await page.click('#add-movie-confirm');

    const btn = page.locator('#movies-list .btn-watched');
    await expect(btn).toContainText('看过');

    await btn.click();
    await expect(btn).toContainText('已看');
    await expect(btn).toHaveClass(/active/);

    await btn.click();
    await expect(btn).toContainText('看过');
  });

  // ===== Comments =====
  test('评论 — 看过后方可评论', async ({ page }) => {
    await page.click('#add-movie-btn');
    await page.fill('#add-movie-input', '盗梦空间');
    await page.click('#add-movie-confirm');

    // 先标记看过
    await page.locator('#movies-list .btn-watched').click();
    await page.locator('#movies-list .btn-watched.active').waitFor();

    // 点击评论按钮
    await page.locator('#movies-list button[title="评论"]').click();
    await expect(page.locator('#comment-overlay')).toBeVisible();
    await expect(page.locator('#comment-dialog-title')).toContainText('盗梦空间');

    // 填写评论
    await page.fill('#comment-input', '非常好看！');
    await page.click('#comment-submit');
    await expect(page.locator('#comment-overlay')).not.toBeVisible();

    // 验证评论展示
    await expect(page.locator('.movie-comment-item')).toHaveCount(1);
    await expect(page.locator('.mc-text')).toContainText('非常好看！');
  });

  test('评论 — 修改评论文字', async ({ page }) => {
    await page.click('#add-movie-btn');
    await page.fill('#add-movie-input', '盗梦空间');
    await page.click('#add-movie-confirm');
    await page.locator('#movies-list .btn-watched').click();
    await page.locator('#movies-list .btn-watched.active').waitFor();

    // 添加评论
    await page.locator('#movies-list button[title="评论"]').click();
    await page.fill('#comment-input', '原评论');
    await page.click('#comment-submit');

    // 点击评论文字编辑
    const mcText = page.locator('.mc-text');
    await mcText.click();
    await mcText.fill('修改后的评论');
    await page.locator('.app-title').click();

    await expect(mcText).toContainText('修改后的评论');
  });

  test('评论 — 删除评论', async ({ page }) => {
    await page.click('#add-movie-btn');
    await page.fill('#add-movie-input', '盗梦空间');
    await page.click('#add-movie-confirm');
    await page.locator('#movies-list .btn-watched').click();
    await page.locator('#movies-list .btn-watched.active').waitFor();

    // 添加评论
    await page.locator('#movies-list button[title="评论"]').click();
    await page.fill('#comment-input', '待删除评论');
    await page.click('#comment-submit');

    await expect(page.locator('.movie-comment-item')).toHaveCount(1);

    // 删除评论
    await page.locator('.mc-delete').click();
    await expect(page.locator('#confirm-overlay')).toBeVisible();
    await expect(page.locator('#confirm-message')).toContainText('确定要删除这条评论吗？');
    await page.click('#confirm-ok');
    await expect(page.locator('.movie-comment-item')).toHaveCount(0);
  });

  test('评论 — 取消删除评论', async ({ page }) => {
    await page.click('#add-movie-btn');
    await page.fill('#add-movie-input', '盗梦空间');
    await page.click('#add-movie-confirm');
    await page.locator('#movies-list .btn-watched').click();
    await page.locator('#movies-list .btn-watched.active').waitFor();

    await page.locator('#movies-list button[title="评论"]').click();
    await page.fill('#comment-input', '保留的评论');
    await page.click('#comment-submit');

    await page.locator('.mc-delete').click();
    await page.click('#confirm-cancel');
    await expect(page.locator('.movie-comment-item')).toHaveCount(1);
  });

  // ===== Delete Movie =====
  test('删除电影 — 确认后删除', async ({ page }) => {
    await page.click('#add-movie-btn');
    await page.fill('#add-movie-input', '待删除电影');
    await page.click('#add-movie-confirm');
    await expect(page.locator('#movies-list .item-card')).toHaveCount(1);

    await page.locator('#movies-list .btn-danger').click();
    await expect(page.locator('#confirm-overlay')).toBeVisible();
    await expect(page.locator('#confirm-message')).toContainText('确定要删除这部电影吗？');
    await page.click('#confirm-ok');

    await expect(page.locator('#movies-list .item-card')).toHaveCount(0);
    await expect(page.locator('#movies-list .empty-state')).toBeVisible();
  });

  test('删除电影 — 取消不删', async ({ page }) => {
    await page.click('#add-movie-btn');
    await page.fill('#add-movie-input', '不被删除');
    await page.click('#add-movie-confirm');

    await page.locator('#movies-list .btn-danger').click();
    await page.click('#confirm-cancel');
    await expect(page.locator('#movies-list .item-card')).toHaveCount(1);
    await expect(page.locator('#movies-list .item-text')).toContainText('不被删除');
  });

  // ===== Search =====
  test('搜索 — 按电影名过滤', async ({ page }) => {
    await page.click('#add-movie-btn');
    await page.fill('#add-movie-input', '盗梦空间');
    await page.click('#add-movie-confirm');
    await page.click('#add-movie-btn');
    await page.fill('#add-movie-input', '星际穿越');
    await page.click('#add-movie-confirm');
    await page.click('#add-movie-btn');
    await page.fill('#add-movie-input', '你的名字');
    await page.click('#add-movie-confirm');

    await page.fill('#header-search', '星际');
    await expect(page.locator('#movies-list .item-card')).toHaveCount(1);
    await expect(page.locator('#movies-list .item-text')).toContainText('星际穿越');
  });

  test('搜索 — 无匹配提示', async ({ page }) => {
    await page.click('#add-movie-btn');
    await page.fill('#add-movie-input', '盗梦空间');
    await page.click('#add-movie-confirm');

    await page.fill('#header-search', '不存在的电影');
    await expect(page.locator('#movies-list .no-results')).toBeVisible();
    await expect(page.locator('#movies-list .no-results')).toContainText('未找到相关电影');
  });

  test('搜索 — 清空恢复列表', async ({ page }) => {
    await page.click('#add-movie-btn');
    await page.fill('#add-movie-input', '电影甲');
    await page.click('#add-movie-confirm');
    await page.click('#add-movie-btn');
    await page.fill('#add-movie-input', '电影乙');
    await page.click('#add-movie-confirm');

    await page.fill('#header-search', '电影甲');
    await expect(page.locator('#movies-list .item-card')).toHaveCount(1);
    await page.fill('#header-search', '');
    await expect(page.locator('#movies-list .item-card')).toHaveCount(2);
  });

  // ===== Tab Switching =====
  test('切换Tab再切回,数据不丢失', async ({ page }) => {
    await page.click('#add-movie-btn');
    await page.fill('#add-movie-input', '跨Tab测试');
    await page.click('#add-movie-confirm');

    await page.click('button[data-tab="ideas"]');
    await expect(page.locator('#tab-ideas')).toBeVisible();
    await page.click('button[data-tab="movies"]');
    await expect(page.locator('#movies-list .item-card')).toHaveCount(1);
    await expect(page.locator('#movies-list .item-text')).toContainText('跨Tab测试');
  });

  // ===== localStorage =====
  test('localStorage 数据持久化', async ({ page }) => {
    await page.click('#add-movie-btn');
    await page.fill('#add-movie-input', '持久化测试');
    await page.click('#add-movie-confirm');

    const data = await page.evaluate(() => localStorage.getItem('trios_movies'));
    const parsed = JSON.parse(data);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe('持久化测试');
    expect(parsed[0].id).toBeTruthy();
    expect(parsed[0].addedAt).toBeTruthy();
  });

  test('刷新页面后数据仍然存在', async ({ page }) => {
    await page.click('#add-movie-btn');
    await page.fill('#add-movie-input', '刷新保留测试');
    await page.click('#add-movie-confirm');
    await expect(page.locator('#movies-list .item-card')).toHaveCount(1);

    await page.reload();
    await page.waitForSelector('#tab-tasks.active');
    await page.click('button[data-tab="movies"]');
    await page.waitForSelector('#tab-movies.active');
    await expect(page.locator('#movies-list .item-card')).toHaveCount(1);
    await expect(page.locator('#movies-list .item-text')).toContainText('刷新保留测试');
  });

  // ===== Rating Slider =====
  test('评论 — 评分滑块可调节', async ({ page }) => {
    await page.click('#add-movie-btn');
    await page.fill('#add-movie-input', '盗梦空间');
    await page.click('#add-movie-confirm');
    await page.locator('#movies-list .btn-watched').click();

    await page.locator('#movies-list button[title="评论"]').click();
    // 验证滑块默认值
    await expect(page.locator('#comment-rating-value')).toContainText('7.0');

    // 调整滑块到8.5
    await page.locator('#comment-rating-slider').fill('8.5');
    await expect(page.locator('#comment-rating-value')).toContainText('8.5');

    await page.fill('#comment-input', '评分测试');
    await page.click('#comment-submit');

    // 验证评分展示
    await expect(page.locator('.mc-rating')).toContainText('8.5');
  });

  test('评论弹窗 — 关闭按钮', async ({ page }) => {
    await page.click('#add-movie-btn');
    await page.fill('#add-movie-input', '盗梦空间');
    await page.click('#add-movie-confirm');
    await page.locator('#movies-list .btn-watched').click();

    await page.locator('#movies-list button[title="评论"]').click();
    await expect(page.locator('#comment-overlay')).toBeVisible();
    await page.click('#comment-dialog-close');
    await expect(page.locator('#comment-overlay')).not.toBeVisible();
  });
});
