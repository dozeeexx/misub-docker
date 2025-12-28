<script setup>
import { ref, computed, onMounted } from 'vue';
import NodeTransformSettings from '../settings/NodeTransformSettings.vue';
import MigrationModal from './MigrationModal.vue';
import { useToastStore } from '../../stores/toast.js';
import { fetchSettings, saveSettings } from '../../lib/api.js';
import SubConverterSelector from '../forms/SubConverterSelector.vue';

const props = defineProps({
  exportBackup: Function,
  importBackup: Function,
});

const { showToast } = useToastStore();
const isLoading = ref(false);
const isSaving = ref(false);
const isMigrating = ref(false);
const settings = ref({});

const prefixConfig = ref({
  enableManualNodes: true,
  enableSubscriptions: true,
  manualNodePrefix: '手动节点',
  enableNodeEmoji: true
});

const disguiseConfig = ref({
  enabled: false,
  pageType: 'default',
  redirectUrl: ''
});

const nodeTransform = ref({
  enabled: false,
  rename: { regex: { enabled: false, rules: [] }, template: { enabled: false, template: '{emoji}{region}-{protocol}-{index}' } },
  dedup: { enabled: false, mode: 'serverPort', includeProtocol: false },
  sort: { enabled: false, nameIgnoreEmoji: true, keys: [] }
});

const hasWhitespace = computed(() => {
  const fieldsCheck = ['FileName', 'mytoken', 'profileToken', 'subConverter', 'subConfig', 'BotToken', 'ChatID'];
  for (const key of fieldsCheck) {
    if (settings.value[key] && /\s/.test(settings.value[key])) return true;
  }
  return false;
});

const isStorageTypeValid = computed(() => ['kv', 'd1'].includes(settings.value.storageType));

const loadSettings = async () => {
  isLoading.value = true;
  try {
    settings.value = await fetchSettings();
    if (settings.value.prefixConfig) {
      prefixConfig.value = {
        enableManualNodes: settings.value.prefixConfig.enableManualNodes ?? true,
        enableSubscriptions: settings.value.prefixConfig.enableSubscriptions ?? true,
        manualNodePrefix: settings.value.prefixConfig.manualNodePrefix ?? '手动节点',
        enableNodeEmoji: settings.value.prefixConfig.enableNodeEmoji ?? true
      };
    } else {
      const fallback = settings.value.prependSubName ?? true;
      prefixConfig.value = {
        enableManualNodes: fallback,
        enableSubscriptions: fallback,
        manualNodePrefix: '手动节点',
        enableNodeEmoji: true
      };
    }
    if (settings.value.nodeTransform) {
      nodeTransform.value = settings.value.nodeTransform;
    }
    // 初始化伪装配置
    if (settings.value.disguise) {
      disguiseConfig.value = {
        enabled: settings.value.disguise.enabled ?? false,
        pageType: settings.value.disguise.pageType ?? 'default',
        redirectUrl: settings.value.disguise.redirectUrl ?? ''
      };
    }
    // Ensure storageType has a default
    if (!settings.value.storageType) {
        settings.value.storageType = 'kv';
    }
  } catch (error) {
    showToast('加载设置失败', 'error');
  } finally {
    isLoading.value = false;
  }
};

const handleSave = async () => {
  if (hasWhitespace.value) { showToast('输入项中不能包含空格', 'error'); return; }
  if (!isStorageTypeValid.value) { showToast('存储类型设置无效', 'error'); return; }

  isSaving.value = true;
  try {
    if (!settings.value.storageType) settings.value.storageType = 'kv';
    const settingsToSave = {
      ...settings.value,
      prefixConfig: prefixConfig.value,
      nodeTransform: nodeTransform.value,
      disguise: disguiseConfig.value
    };
    const result = await saveSettings(settingsToSave);
    if (result.success) {
      showToast('设置已保存，页面将自动刷新...', 'success');
      setTimeout(() => window.location.reload(), 1500);
    } else {
      throw new Error(result.message || '保存失败');
    }
  } catch (error) {
    showToast(error.message, 'error');
    isSaving.value = false;
  }
};

const showMigrationModal = ref(false);

const handleMigrationSuccess = () => {
    showMigrationModal.value = false;
    settings.value.storageType = 'd1';
    showToast('数据迁移成功！已切换到 D1 模式', 'success');
};

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

onMounted(() => {
  loadSettings();
});

defineExpose({ handleSave });
</script>

<template>
  <div class="p-4 sm:p-6 w-full max-w-full overflow-x-hidden">
      <div v-if="isLoading" class="text-center p-8">
        <p class="text-gray-500">正在加载设置...</p>
      </div>
      <div v-else class="space-y-6">
        <!-- Basic Settings -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
             <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">自定义订阅文件名</label>
                <input type="text" v-model="settings.FileName" class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white">
             </div>
             <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">自定义订阅Token</label>
                <input type="text" v-model="settings.mytoken" class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white">
             </div>
             <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">订阅组分享Token</label>
                <input type="text" v-model="settings.profileToken" placeholder="用于生成订阅组链接专用Token" class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white">
             </div>
             <div class="flex items-center justify-between">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">开启访问日志 & 计数</label>
                <label class="toggle-switch">
                  <input type="checkbox" v-model="settings.enableAccessLog">
                  <span class="slider"></span>
                </label>
             </div>
        </div>

        <!-- External Services -->
        <h3 class="text-lg font-medium text-gray-900 dark:text-white border-b pb-2 dark:border-gray-700">外部服务</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SubConverter后端地址</label>
                <SubConverterSelector 
                    v-model="settings.subConverter" 
                    type="backend" 
                    placeholder="选择后端地址" 
                    :allowEmpty="false"
                />
             </div>
             <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SubConverter配置文件</label>
                <SubConverterSelector 
                    v-model="settings.subConfig" 
                    type="config" 
                    placeholder="选择配置" 
                    :allowEmpty="false"
                />
             </div>
             <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Telegram Bot Token</label>
                <input type="text" v-model="settings.BotToken" class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white">
             </div>
             <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Telegram Chat ID</label>
                <input type="text" v-model="settings.ChatID" class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white">
             </div>
        </div>

        <!-- Advanced Configs -->
        <h3 class="text-lg font-medium text-gray-900 dark:text-white border-b pb-2 dark:border-gray-700">节点处理配置</h3>
        
        <!-- Prefixes -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">节点前缀设置</label>
          <div class="space-y-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
             <div class="flex items-center justify-between">
                <div><p class="text-sm font-medium text-gray-700 dark:text-gray-300">全局前缀开关</p></div>
                <label class="toggle-switch"><input type="checkbox" v-model="settings.prependSubName"><span class="slider"></span></label>
             </div>
             <div v-if="settings.prependSubName" class="mt-4 space-y-3 border-t border-gray-200 dark:border-gray-600 pt-3">
                 <div class="flex items-center justify-between">
                    <div><p class="text-sm font-medium text-gray-700 dark:text-gray-300">手动节点前缀</p></div>
                    <label class="toggle-switch"><input type="checkbox" v-model="prefixConfig.enableManualNodes"><span class="slider"></span></label>
                 </div>
                 <div v-if="prefixConfig.enableManualNodes" class="ml-4">
                    <input type="text" v-model="prefixConfig.manualNodePrefix" class="block w-full text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 dark:text-white px-2 py-1" placeholder="手动节点">
                 </div>
                 <div class="flex items-center justify-between">
                    <div><p class="text-sm font-medium text-gray-700 dark:text-gray-300">机场订阅前缀</p></div>
                    <label class="toggle-switch"><input type="checkbox" v-model="prefixConfig.enableSubscriptions"><span class="slider"></span></label>
                 </div>
                  <div class="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-600">
                    <div><p class="text-sm font-medium text-gray-700 dark:text-gray-300">节点国旗 Emoji</p></div>
                    <label class="toggle-switch"><input type="checkbox" v-model="prefixConfig.enableNodeEmoji"><span class="slider"></span></label>
                 </div>
             </div>
          </div>
        </div>

        <!-- Transforms -->
        <div>
           <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">节点转换管道</label>
           <div class="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
               <NodeTransformSettings v-model="nodeTransform" />
           </div>
        </div>

        <!-- 伪装功能 -->
        <div>
          <h3 class="text-lg font-medium text-gray-900 dark:text-white border-b pb-2 dark:border-gray-700 mb-3">伪装页面</h3>
          <div class="space-y-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-700 dark:text-gray-300">启用伪装功能</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">浏览器访问订阅链接时显示伪装页面</p>
              </div>
              <label class="toggle-switch"><input type="checkbox" v-model="disguiseConfig.enabled"><span class="slider"></span></label>
            </div>
            
            <div v-if="disguiseConfig.enabled" class="space-y-3 border-t border-gray-200 dark:border-gray-600 pt-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">伪装类型</label>
                <div class="space-y-2">
                  <div class="flex items-center">
                    <input type="radio" value="default" v-model="disguiseConfig.pageType" class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 dark:bg-gray-800">
                    <span class="ml-3 text-sm dark:text-gray-300">显示默认404页面</span>
                  </div>
                  <div class="flex items-center">
                    <input type="radio" value="redirect" v-model="disguiseConfig.pageType" class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 dark:bg-gray-800">
                    <span class="ml-3 text-sm dark:text-gray-300">跳转到自定义链接</span>
                  </div>
                </div>
              </div>
              
              <div v-if="disguiseConfig.pageType === 'redirect'">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">跳转链接</label>
                <input 
                  type="url" 
                  v-model="disguiseConfig.redirectUrl" 
                  placeholder="https://example.com"
                  class="block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white"
                >
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">浏览器访问订阅链接时将自动跳转到此地址</p>
              </div>
              
              <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p class="text-xs text-blue-800 dark:text-blue-300">
                  <strong>提示:</strong> 伪装功能仅对浏览器访问生效,不影响 Clash/V2rayN 等客户端的正常使用。
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Labs -->
        <div>
            <div class="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                <div>
                   <p class="text-sm font-medium text-gray-700 dark:text-gray-300">显示流量统计节点</p>
                   <p class="text-xs text-gray-500 dark:text-gray-400">虚拟节点显示剩余流量</p>
                </div>
                <label class="toggle-switch"><input type="checkbox" v-model="settings.enableTrafficNode"><span class="slider"></span></label>
            </div>
        </div>

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
                       <button @click="showMigrationModal = true" class="px-4 py-2 text-sm font-medium text-white rounded-md transition-colors duration-200 bg-blue-600 hover:bg-blue-700 flex items-center justify-center min-w-[120px] shadow-sm">
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

        <!-- Save Button (Fixed at bottom or inline?) -->
        <div class="pt-6 border-t border-gray-200 dark:border-gray-700 flex justify-end sticky bottom-0 bg-white dark:bg-gray-800 pb-4 z-30">
            <button 
                @click="handleSave" 
                :disabled="isSaving || hasWhitespace || !isStorageTypeValid"
                class="px-6 py-2 rounded-lg text-white font-medium shadow-md transition-all"
                :class="isSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg'"
            >
                {{ isSaving ? '保存中...' : '保存设置' }}
            </button>
        </div>
      </div>

      
      <MigrationModal v-model:show="showMigrationModal" @success="handleMigrationSuccess" />
  </div>
</template>

<style scoped>
/* Toggle Switch CSS */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.slider {
  position: absolute;
  cursor: pointer;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: #ccc;
  transition: .4s;
  border-radius: 34px;
}
.dark .slider { background-color: #4b5563; }
.slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}
input:checked + .slider { background-color: #4f46e5; }
.dark input:checked + .slider { background-color: #16a34a; }
input:checked + .slider:before { transform: translateX(20px); }
</style>
