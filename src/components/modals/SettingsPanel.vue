<script setup>
import { onMounted } from 'vue';
import MigrationModal from './MigrationModal.vue';
import { useSettingsLogic } from '../../composables/useSettingsLogic.js';

// 导入新布局的设置组件
import BasicSettings from '../settings/sections/BasicSettings.vue';
import ServiceSettings from '../settings/sections/ServiceSettings.vue';
import ProcessingSettings from '../settings/sections/ProcessingSettings.vue';
import WebSettings from '../settings/sections/WebSettings.vue';
import ClientSettings from '../settings/sections/ClientSettings.vue';
import SystemSettings from '../settings/sections/SystemSettings.vue';

// 使用 composable 获取所有设置相关的状态和函数
const {
  settings,
  prefixConfig,
  disguiseConfig,
  nodeTransform,
  isLoading,
  isSaving,
  showMigrationModal,
  hasWhitespace,
  isStorageTypeValid,
  loadSettings,
  handleSave,
  handleMigrationSuccess,
  exportBackup,
  importBackup,
} = useSettingsLogic();

// 组件挂载时加载设置
onMounted(() => {
  loadSettings();
});

// 暴露 handleSave 给父组件
defineExpose({ handleSave });
</script>

<template>
  <div class="p-4 sm:p-6 w-full max-w-full overflow-x-hidden">
      <div v-if="isLoading" class="text-center p-8">
        <p class="text-gray-500">正在加载设置...</p>
      </div>
      <div v-else class="space-y-6">
        <!-- 使用共享组件 -->
        <BasicSettings :settings="settings" />
        
        <ServiceSettings :settings="settings" />
        
        <ProcessingSettings 
          :settings="settings" 
          :prefixConfig="prefixConfig" 
          v-model:nodeTransform="nodeTransform" 
        />
        
        <WebSettings :disguiseConfig="disguiseConfig" />
        
        <!-- 新增客户端管理功能 -->
        <ClientSettings />
        
        <!-- 流量统计节点开关 -->
        <div>
            <div class="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                <div>
                   <p class="text-sm font-medium text-gray-700 dark:text-gray-300">显示流量统计节点</p>
                   <p class="text-xs text-gray-500 dark:text-gray-400">虚拟节点显示剩余流量</p>
                </div>
                <label class="toggle-switch"><input type="checkbox" v-model="settings.enableTrafficNode"><span class="slider"></span></label>
            </div>
        </div>
        
        <SystemSettings 
          :settings="settings" 
          :exportBackup="exportBackup" 
          :importBackup="importBackup" 
          @migrate="showMigrationModal = true" 
        />

        <!-- Save Button -->
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
/* Toggle Switch CSS - 仅用于流量统计节点开关 */
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
