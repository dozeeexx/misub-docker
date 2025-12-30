<script setup>
import { computed, ref, defineAsyncComponent } from 'vue';
import { useDataStore } from '../stores/useDataStore.js';
import { useBulkImportLogic } from '../composables/useBulkImportLogic.js'; // Added
import { storeToRefs } from 'pinia';
import SkeletonLoader from '../components/ui/SkeletonLoader.vue';
import RightPanel from '../components/profiles/RightPanel.vue';
import { useSubscriptions } from '../composables/useSubscriptions.js';
import { useRouter } from 'vue-router';
import { useProfiles } from '../composables/useProfiles.js';
import { useManualNodes } from '../composables/useManualNodes.js';
import { extractNodeName } from '../lib/utils.js';
import { useToastStore } from '../stores/toast.js';

const dataStore = useDataStore();
const { settings, profiles, isLoading, lastUpdated } = storeToRefs(dataStore);
const { activeSubscriptions, activeProfiles, markDirty } = dataStore; 

const { showToast } = useToastStore();
const { 
  totalRemainingTraffic: trafficVal, 
  enabledSubscriptionsCount, 
  subscriptions,
  addSubscriptionsFromBulk 
} = useSubscriptions(markDirty);

const { manualNodes, addNodesFromBulk } = useManualNodes(markDirty);

const router = useRouter();

const formatBytes = (bytes, decimals = 2) => {
  if (!+bytes || bytes < 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const formattedTotalRemainingTraffic = computed(() => formatBytes(trafficVal.value));

const totalNodesCount = computed(() => {
    return (subscriptions.value || []).reduce((acc, sub) => acc + (sub.nodeCount || 0), 0);
});

const lastUpdatedTime = computed(() => {
    if (!lastUpdated.value) return '从未';
    return new Date(lastUpdated.value).toLocaleString();
});

const trafficStats = computed(() => {
    let totalUsed = 0;
    let totalMax = 0;
    (subscriptions.value || []).forEach(sub => {
        if (sub.userInfo) {
            totalUsed += (sub.userInfo.upload || 0) + (sub.userInfo.download || 0);
            totalMax += (sub.userInfo.total || 0);
        }
    });
    const percentage = totalMax > 0 ? Math.min(100, (totalUsed / totalMax) * 100).toFixed(1) : 0;
    return {
        used: formatBytes(totalUsed),
        total: formatBytes(totalMax),
        percentage
    };
});

// --- Bulk Import Logic ---
const {
  showModal: showBulkImportModal,
  handleBulkImport
} = useBulkImportLogic({ addSubscriptionsFromBulk, addNodesFromBulk });

const BulkImportModal = defineAsyncComponent(() => import('../components/modals/BulkImportModal.vue'));
    
    


// --- Profile Modal Logic ---
const {
  handleAddProfile,
  handleSaveProfile,
  editingProfile,
  isNewProfile,
  showProfileModal
} = useProfiles(markDirty);

const ProfileModal = defineAsyncComponent(() => import('../components/modals/ProfileModal.vue'));

// --- Log Modal Logic ---
const showLogModal = ref(false);
const LogModal = defineAsyncComponent(() => import('../components/modals/LogModal.vue'));
</script>

<template>
  <div class="space-y-6">
    <div v-if="isLoading" class="p-4">
      <SkeletonLoader type="dashboard" />
    </div>
    
    <template v-else>
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">仪表盘</h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            概览与生成的订阅配置 | 上次更新: {{ lastUpdatedTime }}
          </p>
        </div>
        
        <div class="flex gap-2">
            <button @click="showLogModal = true" class="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 rounded-md transition-colors border border-gray-200 dark:border-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                订阅日志
            </button>

            <button @click="showBulkImportModal = true" class="px-3 py-1.5 text-sm bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50 rounded-md transition-colors">
                批量导入
            </button>
            <button @click="handleAddProfile" class="px-3 py-1.5 text-sm bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50 rounded-md transition-colors">
                新增我的订阅
            </button>
        </div>
      </div>
      
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
         <!-- Card 1: Traffic -->
         <div class="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xs border border-gray-100 dark:border-gray-700">
            <div class="flex items-center justify-between mb-2">
                <h3 class="text-xs font-medium text-gray-500 uppercase">剩余流量</h3>
                <span class="p-1.5 rounded-md bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </span>
            </div>
            <p class="text-xl font-bold text-gray-900 dark:text-white">{{ formattedTotalRemainingTraffic }}</p>
            <div class="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div class="bg-green-500 h-1.5 rounded-full" :style="{ width: (100 - trafficStats.percentage) + '%' }"></div>
            </div>
            <p class="text-xs text-gray-400 mt-1">已用 {{ trafficStats.used }} / {{ trafficStats.total }}</p>
         </div>

         <!-- Card 2: Active Subs -->
         <div class="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xs border border-gray-100 dark:border-gray-700">
            <div class="flex items-center justify-between mb-2">
                <h3 class="text-xs font-medium text-gray-500 uppercase">活跃订阅</h3>
                <span class="p-1.5 rounded-md bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                </span>
            </div>
            <p class="text-xl font-bold text-gray-900 dark:text-white">{{ activeSubscriptions?.length || 0 }} <span class="text-sm font-normal text-gray-400">/ {{ subscriptions?.length || 0 }}</span></p>
            <p class="text-xs text-green-600 mt-2 flex items-center">
                <span class="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span> 正常运行
            </p>
         </div>

         <!-- Card 3: Total Nodes -->
         <div class="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xs border border-gray-100 dark:border-gray-700">
             <div class="flex items-center justify-between mb-2">
                <h3 class="text-xs font-medium text-gray-500 uppercase">节点总数</h3>
                <span class="p-1.5 rounded-md bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </span>
            </div>
            <p class="text-xl font-bold text-gray-900 dark:text-white">{{ totalNodesCount }}</p>
             <p class="text-xs text-gray-400 mt-2">来自 {{ subscriptions?.length || 0 }} 个订阅源</p>
         </div>
         
         <!-- Card 4: Profiles -->
         <div class="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xs border border-gray-100 dark:border-gray-700">
            <div class="flex items-center justify-between mb-2">
                <h3 class="text-xs font-medium text-gray-500 uppercase">组合订阅</h3>
                <span class="p-1.5 rounded-md bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                </span>
            </div>
            <p class="text-xl font-bold text-gray-900 dark:text-white">{{ activeProfiles?.length || 0 }}</p>
            <p class="text-xs text-gray-400 mt-2">已发布 {{ activeProfiles?.length || 0 }} 个组合</p>
         </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div class="lg:col-span-2 space-y-6">
             <div class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xs border border-gray-100 dark:border-gray-700">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    使用指南
                </h3>
                <div class="grid md:grid-cols-2 gap-4">
                    <div class="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                         <h4 class="font-medium text-gray-900 dark:text-gray-200 mb-2">1. 添加机场订阅</h4>
                         <p class="text-sm text-gray-500 dark:text-gray-400">前往 <b>机场订阅</b> 页面，点击"新增订阅"或"批量导入"，填入您的机场订阅链接。</p>
                    </div>
                    <div class="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                         <h4 class="font-medium text-gray-900 dark:text-gray-200 mb-2">2. 创建组合订阅</h4>
                         <p class="text-sm text-gray-500 dark:text-gray-400">在 <b>我的订阅</b> 页面创建新的组合（Profile），选择刚才添加的机场订阅或节点作为来源。</p>
                    </div>
                    <div class="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                         <h4 class="font-medium text-gray-900 dark:text-gray-200 mb-2">3. 获取订阅链接</h4>
                         <p class="text-sm text-gray-500 dark:text-gray-400">在右侧面板的 "生成的订阅" 中，复制对应的 Clash 或其他客户端链接。</p>
                    </div>
                    <div class="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                         <h4 class="font-medium text-gray-900 dark:text-gray-200 mb-2">4. 导入客户端</h4>
                         <p class="text-sm text-gray-500 dark:text-gray-400">将生成的链接粘贴到您的 Clash, Shadowrocket 或 v2rayN 客户端中即可使用。</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="lg:col-span-1">
             <RightPanel :config="settings" :profiles="profiles" />
        </div>
      </div>

      <BulkImportModal 
          v-if="showBulkImportModal" 
          :show="showBulkImportModal" 
          @update:show="showBulkImportModal = $event"
          @import="(txt, tag) => handleBulkImport(txt, tag)"
      />

      <ProfileModal 
        v-if="showProfileModal" 
        v-model:show="showProfileModal" 
        :profile="editingProfile" 
        :is-new="isNewProfile" 
        :all-subscriptions="subscriptions" 
        :all-manual-nodes="manualNodes" 
        @save="handleSaveProfile" 
        size="2xl" 
      />

      <LogModal
        :show="showLogModal"
        @update:show="showLogModal = $event"
      />
    </template>
  </div>
</template>
