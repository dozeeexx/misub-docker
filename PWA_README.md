# MiSub PWA 功能说明

## 🚀 PWA (Progressive Web App) 特性

MiSub 现已支持 PWA 功能，为用户提供类原生应用的体验！

### ✨ 主要功能

#### 📱 可安装性
- **桌面安装**: 可以将 MiSub 安装到电脑桌面，像本地应用一样运行
- **移动端添加**: 在手机浏览器中可以"添加到主屏幕"
- **独立窗口**: 安装后以独立窗口运行，没有浏览器地址栏干扰

#### 🔄 离线支持
- **智能缓存**: 自动缓存应用资源和已访问的内容
- **离线访问**: 网络断开时仍可查看已缓存的订阅信息
- **优雅降级**: 离线时显示专门的离线页面，提供最佳用户体验

#### 🎯 自动更新
- **后台更新**: Service Worker 在后台自动检查并下载新版本
- **更新提示**: 有新版本时会显示底部通知条，用户可选择立即更新
- **无缝升级**: 点击更新后自动重载，获取最新功能

#### ⚡ 性能优化
- **快速启动**: 预缓存关键资源，启动速度大幅提升
- **智能缓存策略**: API 请求采用网络优先策略，静态资源使用缓存优先
- **渐进式加载**: 支持分块加载，减少初始加载时间

### 🛠️ 技术实现

#### 核心技术栈
- **Vite PWA Plugin**: 自动生成 Service Worker 和 Manifest
- **Workbox**: 提供强大的缓存策略和离线支持
- **Vue 3**: 响应式更新提示组件

#### 缓存策略
```javascript
// API 请求 - 网络优先
{
  urlPattern: /^https:\/\/api\..*/i,
  handler: 'NetworkFirst',
  options: {
    cacheName: 'api-cache',
    networkTimeoutSeconds: 10
  }
}

// 静态资源 - 缓存优先
{
  urlPattern: /.*\.(js|css|html)$/,
  handler: 'StaleWhileRevalidate',
  options: {
    cacheName: 'static-cache'
  }
}
```

### 📲 如何使用

#### 在桌面端安装
1. 使用 Chrome、Edge 或 Safari 访问 MiSub
2. 查看地址栏右侧的"安装"图标
3. 点击安装，选择"安装"确认
4. 应用将出现在桌面和开始菜单中

#### 在移动端安装
1. 使用手机浏览器（Chrome、Safari 等）访问 MiSub
2. 点击浏览器菜单中的"添加到主屏幕"
3. 确认添加，应用图标将出现在主屏幕
4. 点击图标即可像原生应用一样使用

#### 更新应用
- 应用会自动检查更新
- 有新版本时底部会显示更新通知
- 点击"更新"按钮即可获取最新功能
- 也可以关闭通知，下次启动时再更新

### 🔧 开发和部署

#### 本地开发
```bash
# 启动开发服务器（包含 PWA 功能）
npm run dev

# 检查 PWA 配置
npm run check-pwa

# 构建 PWA 版本
npm run build-pwa
```

#### PWA 功能验证
1. 打开浏览器开发者工具
2. 切换到 "Application" 标签页
3. 检查左侧 "Service Workers" 和 "Manifest" 部分
4. 确保 Service Worker 状态为 "activated"
5. 验证 Manifest 信息正确显示

#### 部署注意事项
- 确保 HTTPS 部署（PWA 要求）
- 所有图标文件应为真实的 PNG 格式
- 检查 manifest.json 路径正确
- 验证 Service Worker 能够正常注册

### 🎨 自定义配置

#### 修改应用信息
编辑 `vite.config.js` 中的 manifest 配置：
```javascript
manifest: {
  name: '你的应用名称',
  short_name: '简短名称',
  description: '应用描述',
  theme_color: '#你的主题色',
  background_color: '#背景色'
}
```

#### 调整缓存策略
在 `vite.config.js` 的 workbox 配置中修改：
```javascript
workbox: {
  globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
  runtimeCaching: [
    // 添加自定义缓存规则
  ]
}
```

### 📊 PWA 评分

使用 Chrome DevTools 的 Lighthouse 可以检查 PWA 质量评分：
- 性能（Performance）
- 可访问性（Accessibility）  
- 最佳实践（Best Practices）
- SEO
- PWA

### 🤝 浏览器支持

| 浏览器 | 桌面安装 | 移动端安装 | Service Worker |
|--------|----------|------------|----------------|
| Chrome | ✅ | ✅ | ✅ |
| Edge | ✅ | ✅ | ✅ |
| Safari | ❌ | ✅ | ✅ |
| Firefox | ❌ | ❌ | ✅ |

### 🔗 相关资源

- [PWA 官方文档](https://web.dev/progressive-web-apps/)
- [Vite PWA Plugin](https://vite-plugin-pwa.netlify.app/)
- [Workbox 指南](https://workbox.js.org/)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)

---

享受 MiSub 的 PWA 体验吧！🎉