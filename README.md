# Trios — 个人生活管理中心

灵感笔记 / 电影清单 / 任务清单，三者合一的轻量 PWA。

## 技术栈

- **纯前端** — 原生 JS（ES6），无框架依赖
- **UI 框架** — [Pico CSS v2](https://picocss.com/)（CDN）
- **数据存储** — localStorage 持久化
- **PWA** — Service Worker 离线缓存 + manifest.json
- **测试** — Playwright（77 条用例，4 核并行 ~30s）

## 模块

### 任务清单（默认 Tab）

- 弹窗添加任务（输入框 + 字节计数器 50B + 优先级选择）
- 优先级：紧急(1) / 重要(2) / 普通(3)，点击标签循环切换
- 任务列表按优先级排序（紧急 > 重要 > 普通）
- 内联编辑：点击文字进入编辑，Enter 保存 / Escape 还原 / 失焦保存
- 勾选完成：在已完成列表中新增一条记录，不改变任务本身
- 已完成列表按日期折叠，默认展开最新日期
- 支持删除单条完成记录（确认弹窗）
- 归档：软删除，支持恢复 / 永久删除（确认弹窗）

**localStorage 键**：`trios_tasks`、`trios_completed_log`

### 灵感笔记

- 顶部表单直接添加（textarea，支持多行）
- 按时间倒序排列
- 内联编辑（同任务）
- 删除带确认弹窗

**localStorage 键**：`trios_ideas`

### 电影清单

- 弹窗添加电影
- 按时间倒序排列
- 内联编辑（同任务）
- 看过/未看切换
- 看过后方可评论：评分滑块（0-10）+ 文字评论（500B 限制）
- 评论支持修改、删除（确认弹窗）
- 删除电影带确认弹窗

**localStorage 键**：`trios_movies`

### 全局功能

- 顶部搜索栏，根据当前 Tab 自动路由到对应模块
- Tab 切换保留各自搜索状态
- 数据跨 Tab 不丢失
- 刷新后数据持久化

## 项目结构

```
Trios/
├── index.html            # 主页面（含所有弹窗）
├── manifest.json         # PWA 配置
├── sw.js                 # Service Worker（缓存所有静态资源）
├── package.json
├── playwright.config.js
├── css/
│   └── style.css         # 全局样式 + iOS safe area 适配
├── js/
│   ├── utils.js          # Storage / ID / Time / Priority 工具
│   ├── confirm.js        # Promise 化确认弹窗
│   ├── tasks.js          # 任务模块
│   ├── ideas.js          # 灵感模块
│   ├── movies.js         # 电影模块
│   └── app.js            # 入口：Tab 切换、搜索路由、SW 注册
└── tests/
    ├── tasks.spec.js     # 任务模块 30 条测试
    ├── ideas.spec.js     # 灵感模块 20 条测试
    └── movies.spec.js    # 电影模块 27 条测试
```

## iOS / PWA 适配

- `viewport-fit=cover` + `env(safe-area-inset-top)` 处理刘海/灵动岛
- `apple-mobile-web-app-capable` 支持添加到主屏幕
- `display: standalone` + `orientation: portrait`
- 触控目标 ≥44pt（action buttons、tab nav、checkbox）
- 字体使用 SF Pro Text、PingFang SC

## 本地运行

```bash
# 启动静态服务器
npx http-server . -p 8080

# 运行测试
npx playwright test

# 有界面调试
npx playwright test --headed
```

## 开发

纯静态页面，无需构建。修改后刷新浏览器即可。

测试在 4 个 worker 上并行执行，单次运行约 30s。`test.beforeEach` 会清除 localStorage 保证隔离，每个测试独立。
