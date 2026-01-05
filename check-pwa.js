#!/usr/bin/env node
/**
 * 简单的 PWA 体检脚本：
 * - 校验 manifest.json 是否存在且可解析
 * - 检查关键图标、离线页是否存在
 * - 确认 Vite 配置引用了 manifest.json
 */

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const cwd = process.cwd();
const log = (label, ok, detail = '') => {
  const icon = ok ? '✅' : '❌';
  const text = detail ? `${label} - ${detail}` : label;
  console.log(`${icon} ${text}`);
};

const hasFile = (relative) => fs.existsSync(path.join(cwd, relative));

try {
  const manifestPath = path.join(cwd, 'public', 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error('缺少 public/manifest.json');
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  log('manifest.json 可解析', true);

  const iconChecks = [
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    '/icons/icon-maskable-512.png',
  ];

  iconChecks.forEach((icon) => {
    log(`图标 ${icon}`, hasFile(path.join('public', icon)), hasFile(path.join('public', icon)) ? '' : '缺失');
  });

  log('离线页面 public/offline.html', hasFile('public/offline.html'), hasFile('public/offline.html') ? '' : '缺失');

  // 检查 Vite 配置是否引用 manifest.json
  const viteConfigPath = path.join(cwd, 'vite.config.js');
  const viteContent = fs.readFileSync(viteConfigPath, 'utf-8');
  const manifestUsed = viteContent.includes("import manifest from './public/manifest.json'") && viteContent.includes('manifest,');
  log('Vite 配置复用 manifest.json', manifestUsed, manifestUsed ? '' : '未发现 manifest 引用');

  // 提示 start_url 和 scope 是否存在
  log(`start_url = ${manifest.start_url || '未设置'}`, Boolean(manifest.start_url));
  log(`scope = ${manifest.scope || '未设置'}`, Boolean(manifest.scope));

  console.log('\n检查完成。如有 ❌ 项，请补齐后重新运行。');
} catch (error) {
  log('检查失败', false, error.message);
  process.exit(1);
}
