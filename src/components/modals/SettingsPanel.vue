<script setup>
import { ref, onMounted } from 'vue';
import MigrationModal from './MigrationModal.vue';
import { useSettingsLogic } from '../../composables/useSettingsLogic.js';

// 导入侧边栏和设置组件
import SettingsSidebar from '../settings/SettingsSidebar.vue';
import BasicSettings from '../settings/sections/BasicSettings.vue';
import ServiceSettings from '../settings/sections/ServiceSettings.vue';
import AnnouncementSettings from '../settings/sections/AnnouncementSettings.vue';
import GuestbookManagement from '../settings/sections/GuestbookManagement.vue';
import GlobalSettings from '../settings/sections/GlobalSettings.vue';


import ClientSettings from '../settings/sections/ClientSettings.vue';
import SystemSettings from '../settings/sections/SystemSettings.vue';

const {
  settings,
  disguiseConfig,
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

// 添加标签页状态 (与新布局一致)
const activeTab = ref('basic');

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
    <div v-else class="flex flex-col md:flex-row gap-6">
      <!-- 侧边栏导航 -->
      <aside class="md:w-48 flex-shrink-0">
        <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-2">
          <SettingsSidebar v-model:activeTab="activeTab" />
        </div>
      </aside>

      <!-- 设置内容区域 -->
      <main class="flex-1 min-w-0">
        <div class="space-y-6">
          <!-- 基础设置 -->
          <BasicSettings v-show="activeTab === 'basic'" :settings="settings" :disguiseConfig="disguiseConfig" />

          <!-- 全局设置 -->
          <GlobalSettings v-show="activeTab === 'global'" :settings="settings" />
          
          <!-- 服务集成 -->
          <ServiceSettings v-show="activeTab === 'service'" :settings="settings" />

          <!-- 公告管理 -->
          <AnnouncementSettings v-show="activeTab === 'announcement'" :settings="settings" />

          <!-- 留言管理 -->
          <GuestbookManagement v-show="activeTab === 'guestbook'" :settings="settings" />

          <!-- 客户端管理 -->
          <ClientSettings v-show="activeTab === 'client'" />
          
          <!-- 系统设置 -->
          <div v-show="activeTab === 'system'" class="space-y-6">

            
            <SystemSettings 
              :settings="settings" 
              :exportBackup="exportBackup" 
              :importBackup="importBackup" 
              @migrate="showMigrationModal = true" 
            />
          </div>
        </div>

        <!-- 保存按钮 (固定在底部) -->
        <div class="pt-6 mt-6 border-t border-gray-200 dark:border-gray-700 flex justify-end sticky bottom-0 bg-gray-50/80 dark:bg-gray-800/80 pb-4 z-30 backdrop-blur-sm">
          <button 
            @click="handleSave" 
            :disabled="isSaving || hasWhitespace || !isStorageTypeValid"
            class="px-6 py-2 rounded-lg text-white font-medium shadow-md transition-all"
            :class="isSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg'"
          >
            {{ isSaving ? '保存中...' : '保存设置' }}
          </button>
        </div>
      </main>
    </div>

    <MigrationModal v-model:show="showMigrationModal" @success="handleMigrationSuccess" />
  </div>
</template>

<style scoped>

</style>
