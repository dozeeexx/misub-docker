# 📝 Wrangler.toml 配置管理指南

## 📋 目录

1. [概述](#概述)
2. [为什么要忽略 wrangler.toml](#为什么要忽略-wranglertoml)
3. [文件说明](#文件说明)
4. [本地开发配置](#本地开发配置)
5. [Cloudflare Pages 部署](#cloudflare-pages-部署)
6. [常见问题](#常见问题)
7. [最佳实践](#最佳实践)

---

## 概述

MiSub 项目中 `wrangler.toml` 被添加到 `.gitignore`，这是为了：

✅ **避免配置冲突** - 开发环境和生产环境有不同的需求  
✅ **保护敏感信息** - 不会意外提交 API 密钥或账户信息  
✅ **灵活部署** - 不同开发者可以有不同的本地配置  
✅ **避免部署失败** - 不会因为配置错误导致 Cloudflare Pages 部署失败  

---

## 为什么要忽略 wrangler.toml

### 问题场景

```
❌ 情况1：本地配置包含 account_id，导致部署失败
❌ 情况2：不同开发者有不同的配置，造成冲突
❌ 情况3：配置中包含 API 密钥被意外提交
❌ 情况4：Cloudflare Pages 不支持某些配置选项
```

### 解决方案

```
✅ 使用多个配置文件模板（*.example, *.local）
✅ 开发者各自创建本地配置文件
✅ 部署时使用特定的部署配置
✅ 敏感信息通过环境变量管理
```

---

## 文件说明

### 📄 wrangler.toml.example
**用途**: 配置文件模板（参考）  
**位置**: 提交到 Git  
**用途**: 展示所有可用的配置选项和注释

```bash
# 查看示例
cat wrangler.toml.example
```

### 📄 wrangler.local.toml
**用途**: 本地开发的基础配置  
**位置**: 提交到 Git  
**用途**: 开发者初始化本地环境时的模板

```bash
# 复制到本地
cp wrangler.local.toml wrangler.toml
```

### 📄 wrangler-cf-pages.toml
**用途**: Cloudflare Pages 部署参考配置  
**位置**: 提交到 Git  
**用途**: 说明部署时应该如何配置（在 Cloudflare UI 中）

```bash
# 不直接使用，仅作参考
cat wrangler-cf-pages.toml
```

### 📄 wrangler.toml
**用途**: 本地开发的实际配置文件  
**位置**: 在 .gitignore 中，不提交  
**用途**: 本地开发和调试

```bash
# 初次创建
cp wrangler.local.toml wrangler.toml

# 编辑根据需要修改
nano wrangler.toml
```

---

## 本地开发配置

### 初始化本地环境

```bash
# 方法1：使用初始化脚本（推荐）
bash init-wrangler.sh

# 方法2：手动创建
cp wrangler.local.toml wrangler.toml
```

### 常见的本地配置需求

#### 场景1：使用本地 KV 存储

```toml
# wrangler.toml
[[kv_namespaces]]
binding = "KV_STORAGE"
id = "misub_kv_local"
preview_id = "misub_kv_preview"
```

#### 场景2：使用本地 D1 数据库

```toml
# wrangler.toml
[[d1_databases]]
binding = "DB"
database_name = "misub"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

#### 场景3：设置开发环境变量

```toml
# wrangler.toml
[env.development.vars]
ENVIRONMENT = "development"
LOG_LEVEL = "debug"
ENABLE_CRON = "false"
```

### 启动本地开发服务器

```bash
# 使用默认配置
wrangler dev

# 指定特定环境
wrangler dev --env development

# 指定端口
wrangler dev --port 8787
```

---

## Cloudflare Pages 部署

### 为什么部署时不需要 wrangler.toml

Cloudflare Pages 是托管平台，其配置通过：

1. **Cloudflare Pages UI** - 连接 Git 仓库和设置构建
2. **环境变量** - 通过 Pages 设置管理
3. **KV 和 D1 绑定** - 通过 Pages 函数设置配置
4. **Cron Triggers** - 通过 Pages 函数设置配置

### 部署流程

```
Git 提交 → Cloudflare Pages 自动检测
         → 构建项目
         → 应用 Pages UI 中的配置
         → 部署到 CDN
```

### 所需的配置步骤

#### 步骤1：连接 Git 仓库

在 Cloudflare Pages 仪表板：
- Pages → Connect to Git → 选择仓库

#### 步骤2：设置构建配置

```
Build command: npm run build (如果需要)
Build output directory: functions/
Root directory: /
```

#### 步骤3：添加环境变量

Pages → 设置 → 环境变量

```
ENVIRONMENT=production
LOG_LEVEL=info
```

#### 步骤4：配置 KV 命名空间

Pages → 函数 → KV 命名空间

```
绑定 KV_STORAGE 到你的 KV 命名空间
```

#### 步骤5：配置 D1 数据库（可选）

Pages → 函数 → D1 数据库

```
绑定 DB 到你的 D1 数据库
```

#### 步骤6：配置 Cron Triggers

Pages → 函数 → Cron Triggers

```
0 * * * *      # 每小时
0 8 * * *      # 每日8点
*/30 * * * *   # 每30分钟
```

---

## 常见问题

### Q1: 我应该为 wrangler.toml 和 .gitignore 做什么？

**A**: 
```
✅ wrangler.toml 已在 .gitignore 中（不上传）
✅ 使用 wrangler.local.toml 作为模板（会上传）
✅ 本地运行时：cp wrangler.local.toml wrangler.toml
✅ 部署时：在 Cloudflare Pages UI 中配置
```

### Q2: 本地调试时，如何创建 wrangler.toml？

**A**:
```bash
# 方式1（推荐）：使用初始化脚本
bash init-wrangler.sh

# 方式2：手动复制
cp wrangler.local.toml wrangler.toml

# 方式3：从示例修改
cp wrangler.toml.example wrangler.toml
nano wrangler.toml  # 然后编辑
```

### Q3: 为什么先前因为 wrangler.toml 导致部署失败？

**A**: 常见原因：

```toml
❌ account_id 和 zone_id 设置错误
❌ 使用了 Cloudflare Pages 不支持的选项
❌ KV/D1 绑定的 ID 不存在
❌ Cron Triggers 配置冲突
```

**解决方案**：
```bash
# 不要在 wrangler.toml 中设置这些
# 改为在 Cloudflare Pages UI 中配置

# 对于部署，使用最小化配置：
cat wrangler-cf-pages.toml
```

### Q4: 如何在本地测试 Cron Triggers？

**A**: 
```bash
# 方法1：运行 _schedule.js
curl -X POST http://localhost:8787/_schedule.js \
  -H "CF-Cron: true"

# 方法2：运行 _cron.js
curl -X POST http://localhost:8787/_cron.js \
  -H "CF-Cron: true"

# 方法3：直接在浏览器中打开
http://localhost:8787/_cron.js
```

### Q5: 我改了 wrangler.toml，是否需要重新提交？

**A**: 
```
❌ 不需要，wrangler.toml 在 .gitignore 中
✅ Git 会自动忽略该文件
✅ 其他开发者可以有不同的本地配置
⚠️  千万不要用 git add -f 强制添加
```

---

## 最佳实践

### 1️⃣ 本地开发

```bash
# 初始化
bash init-wrangler.sh

# 编辑本地配置
nano wrangler.toml

# 启动开发服务器
wrangler dev

# 测试 API
curl http://localhost:8787/api/cron/status
```

### 2️⃣ 版本控制

```bash
# 跟踪模板文件
git add wrangler.toml.example
git add wrangler.local.toml
git add wrangler-cf-pages.toml
git add init-wrangler.sh

# 不跟踪本地文件
# wrangler.toml 已自动在 .gitignore 中
git status  # 确认 wrangler.toml 不在跟踪中
```

### 3️⃣ 提交代码

```bash
# 只提交模板和文档，不提交个人配置
git commit -m "Update wrangler configuration templates"
git push origin main
```

### 4️⃣ 其他开发者

```bash
# 拉取代码后
git pull

# 初始化本地环境
bash init-wrangler.sh

# 根据需要编辑
nano wrangler.toml
```

### 5️⃣ CI/CD 部署

```bash
# 不需要 wrangler.toml
# Cloudflare Pages 会自动检测 git 变更并部署
# 配置完全在 Cloudflare UI 中管理
```

---

## 总结

| 文件 | 提交 | 用途 |
|------|------|------|
| `wrangler.toml` | ❌ | 本地配置（gitignore） |
| `wrangler.local.toml` | ✅ | 本地开发模板 |
| `wrangler.toml.example` | ✅ | 完整说明和示例 |
| `wrangler-cf-pages.toml` | ✅ | 部署参考配置 |
| `init-wrangler.sh` | ✅ | 初始化脚本 |

---

## 🚀 快速开始

```bash
# 1. 初始化本地环境
bash init-wrangler.sh

# 2. 安装依赖
npm install

# 3. 启动开发服务器
wrangler dev

# 4. 在浏览器中打开
# http://localhost:8787/cron-dashboard

# 5. 测试 API
# http://localhost:8787/api/cron/status
```

---

**最后更新**: 2026-04-01  
**版本**: 1.0.0