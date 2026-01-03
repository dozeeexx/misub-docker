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
import { extractNodeName, formatBytes } from '../lib/utils.js';
import { useToastStore } from '../stores/toast.js';
import StatCards from '../components/features/Dashboard/StatCards.vue';

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

// formatBytes 由 utils.js 提供
const formattedTotalRemainingTraffic = computed(() => formatBytes(trafficVal.value));

const totalNodesCount = computed(() => {
    return (subscriptions.value || []).reduce((acc, sub) => acc + (sub.nodeCount || 0), 0);
});

const activeSubscriptionsCount = computed(() => (activeSubscriptions || []).length);
const subscriptionsCount = computed(() => (subscriptions.value || []).length);
const activeProfilesCount = computed(() => (activeProfiles || []).length);

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
      
      <StatCards
        :formatted-total-remaining-traffic="formattedTotalRemainingTraffic"
        :traffic-stats="trafficStats"
        :active-subscriptions-count="activeSubscriptionsCount"
        :subscriptions-count="subscriptionsCount"
        :total-nodes-count="totalNodesCount"
        :active-profiles-count="activeProfilesCount"
      />

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
