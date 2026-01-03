# MiSub 项目结构

本文档描述当前仓库的目录布局与模块边界，方便后继开发保持统一架构。

## 总体架构

- 前端：Vue 3 SPA，使用 Vite 构建，代码位于 `src/`。
- 后端：Cloudflare Pages Functions，代码位于 `functions/`。
- 存储：KV 与 D1 双存储，通过 `functions/storage-adapter.js` 统一抽象。
- 构建产物：`dist/`（生产）与 `dev-dist/`（开发）。

## 仓库布局（顶层）

```
.
├─ src/                     # 前端 SPA 源码
├─ functions/               # Cloudflare Pages Functions 后端
├─ public/                  # 静态资源与 PWA 文件
├─ tests/                   # 单元测试
├─ docs/                    # 项目文档
├─ dist/                    # 构建产物（自动生成）
├─ dev-dist/                # 开发构建产物（自动生成）
├─ node_modules/            # 依赖（自动生成）
├─ schema.sql               # D1 表结构
├─ fix_d1_schema.sql        # D1 表结构修复脚本
├─ wrangler.toml            # Cloudflare 配置
├─ package.json             # 脚本与依赖
├─ vite.config.js           # Vite 配置
└─ vitest.config.js         # Vitest 配置
```

## 前端 (`src/`)

```
src/
├─ App.vue                  # 应用根组件
├─ main.js                  # 应用启动入口
├─ router/                  # Vue Router 配置
├─ views/                   # 路由级页面
├─ components/              # UI 组件、布局、弹窗
├─ composables/             # 复用逻辑（hooks）
├─ stores/                  # Pinia 状态
├─ utils/                   # 前端工具与协议处理
├─ lib/                     # API 封装与共享逻辑
├─ constants/               # 常量与默认配置
├─ assets/                  # 本地资源（图标/图片）
└─ shared/                  # 小型共享工具
```

关键区域：
- `src/views/`：页面级视图（仪表盘、设置、订阅等）。
- `src/components/settings/sections/`：设置面板分区，新设置 UI 建议放这里。
- `src/composables/`：跨组件复用的业务逻辑。
- `src/stores/`：全局状态（会话、UI、数据）。
- `src/utils/protocols/`：协议转换、解析与校验工具。

### 前端关键目录（二级/三级）

```
src/components/
├─ ui/                      # 基础 UI 组件（按钮、提示、加载等）
├─ layout/                  # 布局与导航（导航栏、侧边栏等）
├─ settings/
│  ├─ sections/             # 设置页各功能分区（基础/服务/公告/留言等）
│  └─ NodeTransformSettings/ # 节点转换/重命名相关配置 UI
├─ modals/
│  ├─ SubscriptionImport/   # 订阅导入流程相关弹窗
│  ├─ SubscriptionEditModal/ # 订阅编辑弹窗
│  ├─ NodePreview/          # 节点预览相关弹窗
│  └─ ProfileModal/         # 订阅组/配置文件编辑弹窗
├─ nodes/
│  └─ ManualNodePanel/      # 手动节点管理面板
├─ features/
│  └─ Dashboard/            # 仪表盘模块
├─ charts/                  # 图表组件
├─ subscriptions/           # 订阅源/订阅组相关组件
├─ profiles/                # 订阅组管理组件
├─ public/                  # 公开页面组件（访客视图）
├─ shared/                  # 跨模块共享组件
├─ common/                  # 通用组件集合
└─ forms/                   # 表单控件与表单布局
```

```
src/composables/
├─ manual-nodes/            # 手动节点逻辑拆分
└─ *.js                     # 订阅/设置/导入/预览等复用逻辑
```

```
src/utils/
├─ protocols/               # 协议解析与转换
│  ├─ converters/           # 各协议转换器（ss/vmess/trojan 等）
│  ├─ common/               # 协议公共工具（base64 等）
│  ├─ *-parser.js           # Clash/Surge/QuanX 等解析器
│  └─ index.js              # 统一出口
└─ data-gateway/            # 预留的数据接入层目录
```

## 后端 (`functions/`)

```
functions/
├─ [[path]].js              # Pages Functions 入口与路由
├─ storage-adapter.js       # KV/D1 抽象与迁移
├─ middleware/              # CORS 与安全头
├─ modules/                 # API 与订阅核心逻辑
├─ services/                # 后端服务（缓存、订阅、日志）
└─ utils/                   # 后端工具函数
```

### 核心模块说明

- `functions/[[path]].js`：后端入口，分发 `/api/*`、`/sub/*`、`/cron`，并处理静态/SPA 回退。
- `functions/modules/api-router.js`：API 路由与鉴权分发。
- `functions/modules/api-handler.js`：设置与数据读写、保存流程。
- `functions/modules/subscription/*`：订阅请求主流程、缓存、预览与 Subconverter 集成。
- `functions/modules/handlers/*`：按功能拆分的处理器（留言板、客户端列表、调试、节点统计、错误上报、Telegram Webhook）。
- `functions/modules/notifications.js`：Telegram 通知与定时任务处理。
- `functions/modules/config.js`：后端常量、默认配置、KV Key 定义。

### 后端关键目录（二级/三级）

```
functions/modules/
├─ handlers/                # 按功能拆分的 API 处理器
├─ subscription/            # 订阅请求处理流水线
└─ utils/                   # 后端专用工具（地理识别/解析/校验等）
```

```
functions/modules/handlers/
├─ guestbook-handler.js     # 留言板：公开/管理接口
├─ client-handler.js        # 客户端推荐数据接口
├─ node-handler.js          # 节点统计、健康检查、批量更新
├─ debug-handler.js         # 调试与系统信息接口
├─ error-report-handler.js  # 前端错误上报
└─ telegram-webhook-handler.js # Telegram 推送回调
```

```
functions/modules/subscription/
├─ main-handler.js          # 主订阅请求处理
├─ preview-handler.js       # 预览与节点列表接口
├─ cache-manager.js         # 订阅缓存协调
├─ node-fetcher.js          # 节点获取与解析
├─ profile-handler.js       # 订阅组/配置文件处理
├─ access-logger.js         # 访问日志
└─ subconverter-client.js   # Subconverter 适配与候选策略
```

```
functions/services/
├─ subscription-service.js  # 订阅聚合与解析服务
├─ node-cache-service.js    # 节点缓存服务
├─ log-service.js           # 日志读写
└─ notification-service.js  # Telegram 通知（旧版封装）
```

### 存储

- `functions/storage-adapter.js`：运行时选择 KV 或 D1，统一读写/list，并支持 KV → D1 迁移。
- `schema.sql`、`fix_d1_schema.sql`：D1 表结构与修复脚本。

## 公共资源 (`public/`)

PWA 资源与离线支持：
- `public/manifest.json`
- `public/offline.html`
- `public/icons/*`

## 测试 (`tests/`)

协议与缓存相关单测：
- `tests/unit/*`

## 新功能开发约定

- 新的 UI 分区放在 `src/components/`，页面保持在 `src/views/`。
- 新 API 路由在 `functions/modules/api-router.js` 注册，再在 `functions/modules/handlers/` 中实现。
- 所有数据访问统一通过 `functions/storage-adapter.js`。
- 共享逻辑放到 `functions/services/` 或 `functions/utils/`，避免塞在路由文件里。
