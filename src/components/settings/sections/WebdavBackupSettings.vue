<script setup>
import { ref } from 'vue';
import { api } from '../../../lib/http.js';
import { useToastStore } from '../../../stores/toast.js';
import Input from '../../ui/Input.vue';

const props = defineProps({
  settings: {
    type: Object,
    required: true
  }
});

const { showToast } = useToastStore();
const isTesting = ref(false);
const isBackingUp = ref(false);
const isRestoring = ref(false);
const isLoadingRemoteFiles = ref(false);
const remoteFiles = ref([]);

const ensureConfig = () => {
  if (!props.settings.webdavBackup) {
    props.settings.webdavBackup = {
      enabled: false,
      endpoint: '',
      username: '',
      password: '',
      remotePath: '/MiSub',
      filenameTemplate: 'misub-backup-{datetime}.json',
      backupScope: 'dataOnly',
      autoBackup: false,
      interval: 'daily',
      retentionCount: 7,
      lastCheckedAt: null,
      lastBackupAt: null,
      lastBackupStatus: null,
      lastBackupMessage: '',
      lastBackupFile: ''
    };
  }
  return props.settings.webdavBackup;
};

const testConnection = async () => {
  const config = ensureConfig();
  isTesting.value = true;
  try {
    const result = await api.post('/api/backup/webdav/test', { webdavBackup: config });
    if (!result.success) throw new Error(result.message || '测试失败');
    showToast(result.message || 'WebDAV 连接测试成功', 'success');
  } catch (error) {
    showToast('WebDAV 测试失败: ' + error.message, 'error');
  } finally {
    isTesting.value = false;
  }
};

const runBackup = async () => {
  const config = ensureConfig();
  if (!confirm('确定立即执行 WebDAV 备份吗？请先确认已保存当前 WebDAV 配置。')) return;
  isBackingUp.value = true;
  try {
    const result = await api.post('/api/backup/webdav/run', { scope: config.backupScope });
    if (!result.success) throw new Error(result.message || '备份失败');
    config.lastBackupAt = result.timestamp;
    config.lastBackupStatus = 'success';
    config.lastBackupMessage = result.message;
    config.lastBackupFile = result.file;
    showToast('WebDAV 备份成功', 'success');
  } catch (error) {
    showToast('WebDAV 备份失败: ' + error.message, 'error');
  } finally {
    isBackingUp.value = false;
  }
};

const restoreFromLocalFile = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.onchange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      isRestoring.value = true;
      try {
        const payload = JSON.parse(e.target.result);
        const scope = payload?.scope || 'dataOnly';
        const label = scope === 'dataAndSettings' ? '数据 + 设置' : '仅数据';
        if (!confirm(`确定从该备份恢复吗？\n\n备份范围：${label}\n恢复会按 MiSub 数据域覆盖，不会清空整个 KV/D1，WebDAV 配置会保留当前值。`)) return;
        const result = await api.post('/api/backup/restore', { payload, scope });
        if (!result.success) throw new Error(result.message || '恢复失败');
        showToast('备份已恢复，页面即将刷新', 'success');
        setTimeout(() => window.location.reload(), 800);
      } catch (error) {
        showToast('恢复失败: ' + error.message, 'error');
      } finally {
        isRestoring.value = false;
      }
    };
    reader.readAsText(file);
  };
  input.click();
};

const loadRemoteFiles = async () => {
  isLoadingRemoteFiles.value = true;
  try {
    const result = await api.get('/api/backup/webdav/list');
    if (!result.success) throw new Error(result.message || '获取远端备份失败');
    remoteFiles.value = Array.isArray(result.data) ? result.data : [];
    showToast(`已获取 ${remoteFiles.value.length} 个远端备份`, 'success');
  } catch (error) {
    showToast('获取远端备份失败: ' + error.message, 'error');
  } finally {
    isLoadingRemoteFiles.value = false;
  }
};

const restoreRemoteFile = async (file) => {
  if (!file?.path) return;
  if (!confirm(`确定从远端备份恢复吗？\n\n${file.name}\n\n恢复会按 MiSub 数据域覆盖，不会清空整个 KV/D1，WebDAV 配置会保留当前值。`)) return;
  isRestoring.value = true;
  try {
    const result = await api.post('/api/backup/webdav/restore', { file: file.path });
    if (!result.success) throw new Error(result.message || '恢复失败');
    showToast('远端备份已恢复，页面即将刷新', 'success');
    setTimeout(() => window.location.reload(), 800);
  } catch (error) {
    showToast('远端恢复失败: ' + error.message, 'error');
  } finally {
    isRestoring.value = false;
  }
};

const copyCronHint = async () => {
  try {
    const text = `${window.location.origin}/cron`;
    await navigator.clipboard.writeText(text);
    showToast('Cron 地址已复制，请按服务集成设置中的密钥方式配置外部定时服务', 'success');
  } catch {
    showToast('复制失败，请手动复制当前站点 /cron 地址', 'error');
  }
};

ensureConfig();
</script>

<template>
  <div class="rounded-xl border border-gray-100/80 bg-white/90 p-6 shadow-sm dark:border-white/10 dark:bg-gray-900/70">
    <div class="mb-5 flex items-start gap-3">
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-300">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M12 12v9m0 0l-3-3m3 3l3-3" />
        </svg>
      </div>
      <div class="space-y-1">
        <h3 class="text-base font-semibold text-gray-900 dark:text-white">WebDAV 备份与恢复</h3>
        <p class="text-sm text-gray-500 dark:text-gray-400">支持手动备份、请求触发自动备份和统一格式恢复。Cloudflare Pages 不支持原生 Cron。</p>
      </div>
    </div>

    <div class="space-y-5">
      <label class="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200">
        <input type="checkbox" v-model="settings.webdavBackup.enabled" class="h-4 w-4 text-sky-600 rounded border-gray-300">
        启用 WebDAV 备份
      </label>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="WebDAV 地址" v-model="settings.webdavBackup.endpoint" placeholder="https://dav.example.com/remote.php/dav/files/user" />
        <Input label="远端目录" v-model="settings.webdavBackup.remotePath" placeholder="/MiSub" />
        <Input label="用户名" v-model="settings.webdavBackup.username" placeholder="WebDAV 用户名" />
        <Input label="密码 / 应用密码" v-model="settings.webdavBackup.password" type="password" placeholder="WebDAV 密码" />
        <Input label="文件名模板" v-model="settings.webdavBackup.filenameTemplate" placeholder="misub-backup-{datetime}.json" />
        <Input label="保留份数" v-model.number="settings.webdavBackup.retentionCount" type="number" min="1" max="100" />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="rounded-lg border border-gray-200/70 dark:border-white/10 p-4 bg-white/60 dark:bg-white/5">
          <p class="text-sm font-medium text-gray-900 dark:text-white mb-3">备份范围</p>
          <label class="flex items-start gap-3 mb-3 text-sm text-gray-700 dark:text-gray-200">
            <input type="radio" value="dataOnly" v-model="settings.webdavBackup.backupScope" class="mt-0.5">
            <span><strong>仅数据</strong><br><span class="text-xs text-gray-500">机场订阅、手动节点、自定义订阅组、自定义规则模板。</span></span>
          </label>
          <label class="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-200">
            <input type="radio" value="dataAndSettings" v-model="settings.webdavBackup.backupScope" class="mt-0.5">
            <span><strong>数据 + 设置</strong><br><span class="text-xs text-gray-500">包含设置页配置；WebDAV 配置本身不会被备份。</span></span>
          </label>
        </div>

        <div class="rounded-lg border border-gray-200/70 dark:border-white/10 p-4 bg-white/60 dark:bg-white/5">
          <p class="text-sm font-medium text-gray-900 dark:text-white mb-3">请求触发自动备份</p>
          <label class="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200 mb-3">
            <input type="checkbox" v-model="settings.webdavBackup.autoBackup" class="h-4 w-4 text-sky-600 rounded border-gray-300">
            启用自动备份检查
          </label>
          <select v-model="settings.webdavBackup.interval" class="w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 text-sm">
            <option value="hourly">每小时</option>
            <option value="daily">每日</option>
            <option value="weekly">每周</option>
            <option value="monthly">每月</option>
          </select>
          <p class="mt-3 text-xs text-gray-500 dark:text-gray-400">当订阅链接、后台或外部 /cron 被访问时，系统会检查是否到期；如需严格定时，请配置外部 Cron。</p>
        </div>
      </div>

      <div class="rounded-lg bg-amber-50/80 dark:bg-amber-900/20 border border-amber-200/70 dark:border-amber-800/60 p-4 text-xs text-amber-800 dark:text-amber-200 leading-6">
        安全提示：备份文件可能包含订阅链接、节点信息、分享 Token、Cron 密钥等敏感内容。WebDAV 配置本身不会写入备份文件，请确保远端目录权限安全。
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div class="rounded-lg border border-gray-200/70 dark:border-white/10 p-4 bg-white/60 dark:bg-white/5">
          <p class="font-medium text-gray-900 dark:text-white mb-2">最近状态</p>
          <p class="text-gray-500 dark:text-gray-400">最近检查：{{ settings.webdavBackup.lastCheckedAt || '未检查' }}</p>
          <p class="text-gray-500 dark:text-gray-400">最近备份：{{ settings.webdavBackup.lastBackupAt || '未备份' }}</p>
          <p class="text-gray-500 dark:text-gray-400">最近结果：{{ settings.webdavBackup.lastBackupStatus || '无' }}</p>
          <p class="text-gray-500 dark:text-gray-400 break-all">最近文件：{{ settings.webdavBackup.lastBackupFile || '无' }}</p>
        </div>
        <div class="flex flex-wrap items-end gap-3">
          <button @click="testConnection" :disabled="isTesting" class="px-4 py-2 text-sm font-medium text-white rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-50">{{ isTesting ? '测试中...' : '测试连接' }}</button>
          <button @click="runBackup" :disabled="isBackingUp" class="px-4 py-2 text-sm font-medium text-white rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50">{{ isBackingUp ? '备份中...' : '立即备份' }}</button>
          <button @click="restoreFromLocalFile" :disabled="isRestoring" class="px-4 py-2 text-sm font-medium text-white rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50">{{ isRestoring ? '恢复中...' : '从文件恢复' }}</button>
          <button @click="loadRemoteFiles" :disabled="isLoadingRemoteFiles" class="px-4 py-2 text-sm font-medium text-white rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">{{ isLoadingRemoteFiles ? '获取中...' : '获取远端备份' }}</button>
          <button @click="copyCronHint" class="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/10">复制 /cron 地址</button>
        </div>
      </div>

      <div v-if="remoteFiles.length" class="rounded-lg border border-gray-200/70 dark:border-white/10 bg-white/60 dark:bg-white/5 p-4">
        <p class="text-sm font-medium text-gray-900 dark:text-white mb-3">远端备份文件</p>
        <div class="space-y-2 max-h-56 overflow-y-auto">
          <div v-for="file in remoteFiles" :key="file.path" class="flex items-center justify-between gap-3 rounded-lg border border-gray-100 dark:border-white/10 px-3 py-2">
            <span class="text-xs text-gray-600 dark:text-gray-300 break-all">{{ file.name }}</span>
            <button @click="restoreRemoteFile(file)" :disabled="isRestoring" class="shrink-0 px-3 py-1.5 text-xs font-medium text-white rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50">恢复</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
