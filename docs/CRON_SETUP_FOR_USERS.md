# 🚀 Cron Triggers 配置指南（无需修改代码）

## 概述

MiSub 的 Cron Triggers 功能现在支持通过环境变量完全配置，无需修改任何代码文件。这意味着 fork 用户可以：

✅ **自动接收上游更新** - 不会因为修改文件而导致冲突  
✅ **零配置启动** - 默认启用合理的 Cron 配置  
✅ **灵活自定义** - 通过 Cloudflare Pages 环境变量调整行为  
✅ **安全可选** - 可以完全禁用 Cron 功能  

---

## 默认配置

部署后，Cron 功能会自动启用，默认配置如下：

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `ENABLE_CRON` | `true` | 是否启用 Cron 功能 |
| `CRON_TYPE` | `hourly-subscription-sync` | 任务类型（每小时同步订阅） |
| `CRON_MAX_SYNC_COUNT` | `50` | 每次最多同步 50 个订阅 |
| `CRON_SYNC_TIMEOUT` | `30000` | 单个订阅同步超时 30 秒 |
| `CRON_ENABLE_PARALLEL` | `true` | 启用并行同步以提高效率 |

**Cron 时间表**：每小时执行一次（`0 * * * *`）

---

## 配置步骤

### 步骤1：部署到 Cloudflare Pages

1. Fork 本仓库
2. 连接到 Cloudflare Pages
3. 部署完成

此时 Cron 功能已自动启用，默认每小时同步一次订阅。

### 步骤2：自定义配置（可选）

如果需要修改默认行为：

1. 进入 Cloudflare Dashboard
2. 选择你的 Pages 项目
3. 进入 **设置** → **环境变量**
4. 添加或修改以下变量：

```
# Cron 功能开关
ENABLE_CRON = true  # 或 false 完全禁用

# 同步行为配置
CRON_MAX_SYNC_COUNT = 100    # 每次最多同步数量
CRON_SYNC_TIMEOUT = 60000    # 超时时间（毫秒）
CRON_ENABLE_PARALLEL = false # 是否并行同步

# Cron 时间表（在 Functions 设置中配置）
# Settings → Functions → Cron Triggers
# 添加时间表如：0 */2 * * * （每2小时）
```

### 步骤3：配置 Cron 时间表

1. 在 Pages 项目中进入 **设置** → **函数**
2. 点击 **Cron Triggers**
3. 添加时间表：

| 频率 | Cron 表达式 | 说明 |
|------|-------------|------|
| 每小时 | `0 * * * *` | 推荐，默认 |
| 每2小时 | `0 */2 * * *` | 减少频率 |
| 每30分钟 | `*/30 * * * *` | 提高频率 |
| 每日8点 | `0 8 * * *` | 固定时间 |

---

## 高级配置选项

### 任务类型

通过 `CRON_TYPE` 环境变量选择不同的任务：

```
CRON_TYPE = hourly-subscription-sync  # 每小时同步订阅（默认）
CRON_TYPE = daily-full-sync           # 每日完整同步（清理缓存）
CRON_TYPE = traffic-check             # 仅检查流量（不更新订阅）
```

### 性能调优

对于大量订阅的用户：

```bash
# 增加同步数量和超时时间
CRON_MAX_SYNC_COUNT = 200
CRON_SYNC_TIMEOUT = 120000  # 2分钟

# 启用并行同步提高速度
CRON_ENABLE_PARALLEL = true
```

### 低频使用

对于订阅较少或更新不频繁的用户：

```bash
# 减少同步频率
CRON_MAX_SYNC_COUNT = 20

# 禁用并行同步减少资源使用
CRON_ENABLE_PARALLEL = false
```

---

## 验证配置

### 方法1：查看 Cron 日志

1. 进入 Cloudflare Dashboard
2. 选择 Pages 项目
3. 进入 **实时日志** 或 **函数** → **日志**
4. 观察 Cron 执行日志

### 方法2：使用管理面板

访问你的部署域名：
```
https://your-domain.pages.dev/cron
```

查看同步状态和历史记录。

### 方法3：手动触发

在管理面板中点击"手动同步"按钮测试配置。

---

## 故障排除

### Cron 没有执行

1. 检查环境变量 `ENABLE_CRON = true`
2. 确认 Cron Triggers 已正确配置时间表
3. 查看函数日志是否有错误信息

### 同步失败

1. 检查 `CRON_MAX_SYNC_COUNT` 是否过大
2. 增加 `CRON_SYNC_TIMEOUT` 值
3. 查看具体错误日志

### 性能问题

1. 减少 `CRON_MAX_SYNC_COUNT`
2. 设置 `CRON_ENABLE_PARALLEL = false`
3. 调整 Cron 时间表为较低频率

---

## 安全注意事项

- ✅ 所有配置通过环境变量，无需修改代码
- ✅ 敏感信息不会暴露在代码中
- ✅ 可以完全禁用 Cron 功能
- ✅ 支持不同用户的个性化配置

---

## 总结

现在用户可以：

1. **零配置使用** - 部署后自动启用默认 Cron
2. **灵活调整** - 通过环境变量自定义行为
3. **保持同步** - 无需修改文件，自动接收上游更新
4. **安全控制** - 可以随时启用/禁用功能

这样既保证了功能的易用性，又维护了仓库的可维护性。