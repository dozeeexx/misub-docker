<script setup>
import { ref, defineAsyncComponent, computed } from 'vue';
import { extractNodeName } from '../lib/utils.js';
import { useDataStore } from '../stores/useDataStore.js';
import { useSubscriptions } from '../composables/useSubscriptions.js';
import { useManualNodes } from '../composables/useManualNodes.js';
import { useProfiles } from '../composables/useProfiles.js';
import { useSubscriptionForms } from '../composables/useSubscriptionForms.js'; // Added
import { useBulkImportLogic } from '../composables/useBulkImportLogic.js'; // Added
import SubscriptionPanel from '../components/subscriptions/SubscriptionPanel.vue';
import Modal from '../components/forms/Modal.vue';
import { useToastStore } from '../stores/toast.js';

const dataStore = useDataStore();
const { showToast } = useToastStore();
const { markDirty } = dataStore;

// State
// State
const isSortingSubs = ref(false);
const showDeleteSubsModal = ref(false);

const {
  subscriptions, subsCurrentPage, subsTotalPages, paginatedSubscriptions,
  changeSubsPage, addSubscription, updateSubscription, deleteSubscription, deleteAllSubscriptions,
  addSubscriptionsFromBulk, handleUpdateNodeCount, batchUpdateAllSubscriptions,
  reorderSubscriptions
} = useSubscriptions(markDirty);

const { addNodesFromBulk } = useManualNodes(markDirty);

const { cleanupSubscriptions, cleanupAllSubscriptions } = useProfiles(markDirty);

// Composables
const {
  showModal: showSubModal,
  isNew: isNewSubscription,
  editingSubscription,
  openAdd: handleAddSubscription,
  openEdit: handleEditSubscription,
  handleSave: handleSaveSubscription
} = useSubscriptionForms({ addSubscription, updateSubscription });

const {
  showModal: showBulkImportModal,
  handleBulkImport
} = useBulkImportLogic({ addSubscriptionsFromBulk, addNodesFromBulk });

const handleDeleteSubscriptionWithCleanup = (subId) => {
    deleteSubscription(subId);
    cleanupSubscriptions(subId);
};

const handleDeleteAllSubscriptionsWithCleanup = () => {
    deleteAllSubscriptions();
    cleanupAllSubscriptions();
    showDeleteSubsModal.value = false;
};

// Preview
const NodePreviewModal = defineAsyncComponent(() => import('../components/modals/NodePreview/NodePreviewModal.vue'));
const showNodePreviewModal = ref(false);
const previewSubscriptionId = ref(null);
const previewSubscriptionName = ref('');
const previewSubscriptionUrl = ref('');

const handlePreviewSubscription = (subscriptionId) => {
  const subscription = subscriptions.value.find(s => s.id === subscriptionId);
  if (subscription) {
    previewSubscriptionId.value = subscriptionId;
    previewSubscriptionName.value = subscription.name || '未命名订阅';
    previewSubscriptionUrl.value = subscription.url;
    showNodePreviewModal.value = true;
  }
};

// Bulk Import Logic
const BulkImportModal = defineAsyncComponent(() => import('../components/modals/BulkImportModal.vue'));
</script>

<template>
  <div class="max-w-(--breakpoint-xl) mx-auto">


    <SubscriptionPanel
      :subscriptions="subscriptions"
      :paginated-subscriptions="paginatedSubscriptions"
      :current-page="subsCurrentPage"
      :total-pages="subsTotalPages"
      :is-sorting="isSortingSubs"
      @add="handleAddSubscription"
      @delete="handleDeleteSubscriptionWithCleanup"
      @change-page="changeSubsPage"
      @update-node-count="handleUpdateNodeCount"
      @refresh-all="batchUpdateAllSubscriptions"
      @edit="(id) => handleEditSubscription(subscriptions.find(s => s.id === id))"
      @toggle-sort="isSortingSubs = !isSortingSubs"
      @mark-dirty="markDirty"
      @delete-all="showDeleteSubsModal = true"
      @preview="handlePreviewSubscription"
      @reorder="reorderSubscriptions"
      @import="showBulkImportModal = true"
    >
        <!-- Slot removed as user requested button move to dropdown -->
    </SubscriptionPanel>

    <!-- Dialogs -->
    <Modal v-if="editingSubscription" v-model:show="showSubModal" @confirm="handleSaveSubscription">
        <template #title><h3 class="text-lg font-bold text-gray-800 dark:text-white">{{ isNewSubscription ? '新增订阅' : '编辑订阅' }}</h3></template>
        <template #body>
            <div class="space-y-4">
                <div><label class="block text-sm font-medium text-gray-700 dark:text-gray-300">订阅名称</label><input type="text" v-model="editingSubscription.name" placeholder="（可选）自动获取" class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs dark:text-white"></div>
                <div><label class="block text-sm font-medium text-gray-700 dark:text-gray-300">订阅链接</label><input type="text" v-model="editingSubscription.url" placeholder="https://..." class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs dark:text-white"></div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">包含/排除节点</label>
                    <textarea v-model="editingSubscription.exclude" placeholder="排除模式 (默认)&#10;proto:vless&#10;---&#10;包含模式: keep:HK" rows="5" class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs dark:text-white"></textarea>
                </div>
                <div>
                     <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">自定义 User-Agent</label>
                     <select v-model="editingSubscription.customUserAgent" class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md dark:text-white">
                        <option value="">使用默认 UA</option>
                        <option value="clash.meta">Clash Meta</option>
                        <option value="v2rayN/7.23">v2rayN</option>
                        <option value="Shadowrocket/1.9.0">Shadowrocket</option>
                        <option value="Mozilla/5.0">Mozilla</option>
                     </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">备注</label>
                    <textarea v-model="editingSubscription.notes" placeholder="官网、价格等..." rows="2" class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md dark:text-white"></textarea>
                </div>
            </div>
        </template>
    </Modal>

    <Modal v-model:show="showDeleteSubsModal" @confirm="handleDeleteAllSubscriptionsWithCleanup">
        <template #title><h3 class="text-lg font-bold text-red-500">确认清空订阅</h3></template>
        <template #body><p class="text-sm text-gray-400">您确定要删除所有**订阅**吗？</p></template>
    </Modal>
    
    <BulkImportModal 
        v-if="showBulkImportModal" 
        :show="showBulkImportModal" 
        @update:show="showBulkImportModal = $event"
        @import="(txt, tag) => handleBulkImport(txt, tag)"
    />

    <NodePreviewModal
        :show="showNodePreviewModal"
        :subscription-id="previewSubscriptionId"
        :subscription-name="previewSubscriptionName"
        :subscription-url="previewSubscriptionUrl"
        :profile-id="null"
        :profile-name="''"
        @update:show="showNodePreviewModal = $event"
    />
  </div>
</template>
