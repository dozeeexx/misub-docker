<script setup>
defineProps({
  settings: {
    type: Object,
    required: true
  },
  exportBackup: Function,
  importBackup: Function
});

import { useToastStore } from '../../../stores/toast.js';
const { showToast } = useToastStore();

const SCHEMA_SQL = `CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_updated_at ON subscriptions(updated_at);
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON profiles(updated_at);
CREATE INDEX IF NOT EXISTS idx_settings_updated_at ON settings(updated_at);`;

const copySchema = async () => {
    try {
        await navigator.clipboard.writeText(SCHEMA_SQL);
        showToast('SQL 脚本已复制到剪贴板', 'success');
    } catch (err) {
        showToast('复制失败，请手动复制文件内容', 'error');
    }
};

const emit = defineEmits(['migrate']);
</script>

<template>
  <div class="space-y-8">
    <!-- Storage -->
    <div>
       <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">数据存储类型</label>
       <div class="space-y-3">
           <div class="flex items-center"><input type="radio" value="kv" v-model="settings.storageType" class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 dark:bg-gray-800"><span class="ml-3 text-sm dark:text-gray-300">KV 存储</span></div>
           <div class="flex items-center"><input type="radio" value="d1" v-model="settings.storageType" class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 dark:bg-gray-800"><span class="ml-3 text-sm dark:text-gray-300">D1 数据库 (推荐)</span></div>
           
           <!-- D1 Migration Section -->
           <div v-if="settings.storageType === 'kv'" class="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
               <h4 class="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">迁移到 D1 数据库</h4>
               <p class="text-xs text-blue-600 dark:text-blue-400 mb-3">
                   D1 数据库提供更好的性能和无限的写入能力。迁移前请确保已完成以下步骤：
               </p>
               <ol class="list-decimal list-inside text-xs text-blue-600 dark:text-blue-400 mb-3 space-y-1">
                   <li>在 Cloudflare 后台创建 D1 数据库，并在 Pages 设置中绑定为 <code>MISUB_DB</code></li>
                   <li>在 D1 控制台的 "Console" 标签页中粘贴并执行 <code>fix_d1_schema.sql</code> 的内容</li>
                   <li>确保表结构创建成功后，在此处点击迁移按钮</li>
               </ol>
               <div class="flex flex-col sm:flex-row gap-3">
                   <button @click="emit('migrate')" class="px-4 py-2 text-sm font-medium text-white rounded-md transition-colors duration-200 bg-blue-600 hover:bg-blue-700 flex items-center justify-center min-w-[120px] shadow-sm">
                        开始迁移...
                   </button>
                   <button @click="copySchema" class="px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-700 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-colors flex items-center justify-center gap-2 shadow-sm">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
                        复制建表 SQL
                   </button>
               </div>
           </div>
       </div>
    </div>

    <!-- Backup -->
    <div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-white border-b pb-2 dark:border-gray-700 mb-4">备份与恢复</h3>
        <div class="flex gap-4">
            <button @click="exportBackup" class="px-4 py-2 text-sm font-medium text-white rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-green-600 hover:bg-green-700">导出备份</button>
            <button @click="importBackup" class="px-4 py-2 text-sm font-medium text-white rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-orange-500 hover:bg-orange-600">导入备份</button>
        </div>
    </div>
  </div>
</template>
