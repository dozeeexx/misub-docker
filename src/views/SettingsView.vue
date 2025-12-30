<script setup>
import { ref, computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useDataStore } from '../stores/useDataStore.js';
import { useToastStore } from '../stores/toast.js';
import { fetchSettings, saveSettings } from '../lib/api.js';
import { useManualNodes } from '../composables/useManualNodes.js';
import MigrationModal from '../components/modals/MigrationModal.vue';

import SettingsSidebar from '../components/settings/SettingsSidebar.vue';
import BasicSettings from '../components/settings/sections/BasicSettings.vue';
import ServiceSettings from '../components/settings/sections/ServiceSettings.vue';
import ProcessingSettings from '../components/settings/sections/ProcessingSettings.vue';
import WebSettings from '../components/settings/sections/WebSettings.vue';
import SystemSettings from '../components/settings/sections/SystemSettings.vue';
import ClientSettings from '../components/settings/sections/ClientSettings.vue';

const dataStore = useDataStore();
const { showToast } = useToastStore();
const { subscriptions, profiles } = storeToRefs(dataStore);
const { manualNodes } = useManualNodes(() => {});

const activeTab = ref('basic');
const isLoading = ref(false);
const isSaving = ref(false);
const showMigrationModal = ref(false);
const settings = ref({});

// Nested configuration objects
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

const currentTabLabel = computed(() => {
    switch(activeTab.value) {
        case 'basic': return '基础设置';
        case 'service': return '服务集成';
        case 'pipeline': return '节点处理';
        case 'web': return 'Web访问';
        case 'client': return '客户端管理';
        case 'system': return '系统设置';
        default: return '设置';
    }
});

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

const handleOpenMigrationModal = () => {
    showMigrationModal.value = true;
};

const handleMigrationSuccess = () => {
    settings.value.storageType = 'd1';
    showToast('数据迁移成功！系统已切换为 D1 存储', 'success');
};

// Backup Logic
const exportBackup = () => {
  try {
    const backupData = {
      subscriptions: (subscriptions.value || []).filter(item => item.url && /^https?:\/\//.test(item.url)),
      manualNodes: (manualNodes.value || []),
      profiles: profiles.value || [],
    };
    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-');
    a.download = `misub-backup-${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('备份已成功导出', 'success');
  } catch (error) {
    console.error('Backup export failed:', error);
    showToast('备份导出失败', 'error');
  }
};

const importBackup = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (!data || !Array.isArray(data.subscriptions)) {
                     throw new Error('无效的备份文件格式');
                }
                if (confirm('确定要从备份中恢复吗？所有当前数据将被覆盖。')) {
                    const merged = [...(data.subscriptions||[]), ...(data.manualNodes||[])];
                    dataStore.overwriteSubscriptions(merged);
                    dataStore.overwriteProfiles(data.profiles || []);
                    dataStore.markDirty();
                    showToast('数据已恢复，请保存', 'success');
                }
            } catch (err) {
                 showToast('导入失败: ' + err.message, 'error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
};

onMounted(() => {
  loadSettings();
});
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-0 pb-8">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-1 mt-2">设置</h1>
    <div class="md:grid md:grid-cols-12 md:gap-6">
      
      <!-- Sidebar -->
      <aside class="md:col-span-3 mb-4 md:mb-0">
        <div class="sticky top-0 z-20">
            <div class="bg-transparent md:bg-white md:dark:bg-gray-800 md:shadow-xs md:rounded-lg md:overflow-hidden md:border md:border-gray-100 md:dark:border-gray-700">
               <div class="md:p-2 md:space-y-1">
                 <SettingsSidebar v-model:activeTab="activeTab" />
               </div>
            </div>
        </div>
      </aside>

      <!-- Content -->
      <main class="md:col-span-9">
        <div v-if="isLoading" class="text-center p-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <svg class="animate-spin h-8 w-8 text-indigo-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p class="text-gray-500">正在加载设置...</p>
        </div>
        
        <div v-else class="bg-white dark:bg-gray-800 shadow-xs rounded-lg border border-gray-100 dark:border-gray-700 min-h-[500px] flex flex-col">
            <!-- Header for Mobile (Removed as tabs are now visible) -->

            <!-- Scrollable Content -->
            <div class="flex-1 p-6">
                <BasicSettings v-show="activeTab === 'basic'" :settings="settings" />
                <ServiceSettings v-show="activeTab === 'service'" :settings="settings" />
                <ProcessingSettings v-show="activeTab === 'pipeline'" :settings="settings" :prefixConfig="prefixConfig" v-model:nodeTransform="nodeTransform" />
                <WebSettings v-show="activeTab === 'web'" :disguiseConfig="disguiseConfig" />
                <ClientSettings v-show="activeTab === 'client'" />
                <SystemSettings v-show="activeTab === 'system'" :settings="settings" :exportBackup="exportBackup" :importBackup="importBackup" @migrate="handleOpenMigrationModal" />
            </div>

            <!-- Footer Actions -->
            <div class="px-6 py-4 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700 flex justify-end sticky bottom-0 z-10 backdrop-blur-sm rounded-b-lg">
                <button 
                    @click="handleSave" 
                    :disabled="isSaving || hasWhitespace || !isStorageTypeValid"
                    class="px-6 py-2 rounded-lg text-white font-medium shadow-sm transition-all flex items-center gap-2"
                    :class="isSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-md active:scale-95'"
                >
                    <svg v-if="isSaving" class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{{ isSaving ? '保存中...' : '保存修改' }}</span>
                </button>
            </div>
        </div>
      </main>
    </div>

    <!-- Modals -->
    <MigrationModal v-model:show="showMigrationModal" @success="handleMigrationSuccess" />
  </div>
</template>
