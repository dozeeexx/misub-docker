#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

console.log('🔍 检查 PWA 配置...\n');

const checks = [
  {
    name: '检查 manifest.json',
    check: () => fs.existsSync('public/manifest.json'),
    message: 'manifest.json 文件存在'
  },
  {
    name: '检查图标文件',
    check: () => {
      const requiredIcons = [
        'public/icons/icon-192x192.png',
        'public/icons/icon-512x512.png'
      ];
      return requiredIcons.every(icon => fs.existsSync(icon));
    },
    message: '关键图标文件存在'
  },
  {
    name: '检查 PWA 更新组件',
    check: () => fs.existsSync('src/components/PWAUpdatePrompt.vue'),
    message: 'PWA 更新提示组件存在'
  },
  {
    name: '检查 vite.config.js PWA 配置',
    check: () => {
      const config = fs.readFileSync('vite.config.js', 'utf8');
      return config.includes('VitePWA') && config.includes('registerType');
    },
    message: 'Vite PWA 插件配置正确'
  },
  {
    name: '检查 Service Worker 注册',
    check: () => {
      const main = fs.readFileSync('src/main.js', 'utf8');
      return main.includes('serviceWorker') && main.includes('register');
    },
    message: 'Service Worker 注册代码存在'
  },
  {
    name: '检查离线页面',
    check: () => fs.existsSync('public/offline.html'),
    message: '离线页面存在'
  }
];

let passed = 0;
let total = checks.length;

checks.forEach(({ name, check, message }) => {
  const result = check();
  const status = result ? '✅' : '❌';
  console.log(`${status} ${name}: ${result ? message : '未找到或配置错误'}`);
  if (result) passed++;
});

console.log(`\n📊 检查结果: ${passed}/${total} 项通过\n`);

if (passed === total) {
  console.log('🎉 恭喜！PWA 配置已完成！');
  console.log('\n📱 PWA 功能特性:');
  console.log('   • 可安装到桌面/主屏幕');
  console.log('   • 离线缓存支持');
  console.log('   • 自动更新提示');
  console.log('   • 类原生应用体验');
  console.log('\n🚀 下一步:');
  console.log('   1. 运行 npm run dev 启动开发服务器');
  console.log('   2. 在浏览器中访问应用');
  console.log('   3. 检查浏览器开发者工具的 Application 标签页');
  console.log('   4. 查看 Service Worker 和 Manifest 是否正确加载');
  console.log('   5. 尝试"添加到主屏幕"功能');
} else {
  console.log('⚠️  还有一些配置需要完善，请检查上述失败项。');
}

console.log('\n💡 提示: 在部署到 Cloudflare Pages 之前，确保所有图标都是真实的 PNG 文件。');
console.log('   可以使用在线工具将 SVG 转换为 PNG: https://svgtopng.com/');