<script setup>
import { ref, watch, computed } from 'vue';
import Modal from './Modal.vue';

const props = defineProps({
  show: Boolean,
  profile: Object,
  isNew: Boolean,
  allSubscriptions: Array,
  allManualNodes: Array,
});

const emit = defineEmits(['update:show', 'save']);

const localProfile = ref({});
const subscriptionSearchTerm = ref('');
const nodeSearchTerm = ref('');

const filteredSubscriptions = computed(() => {
  if (!subscriptionSearchTerm.value) {
    return props.allSubscriptions;
  }
  const lowerCaseSearchTerm = subscriptionSearchTerm.value.toLowerCase();
  return props.allSubscriptions.filter(sub => 
    (sub.name && sub.name.toLowerCase().includes(lowerCaseSearchTerm)) ||
    (sub.url && sub.url.toLowerCase().includes(lowerCaseSearchTerm))
  );
});

const filteredManualNodes = computed(() => {
  if (!nodeSearchTerm.value) {
    return props.allManualNodes;
  }
  const lowerCaseSearchTerm = nodeSearchTerm.value.toLowerCase();
  return props.allManualNodes.filter(node => 
    (node.name && node.name.toLowerCase().includes(lowerCaseSearchTerm)) ||
    (node.url && node.url.toLowerCase().includes(lowerCaseSearchTerm))
  );
});

watch(() => props.profile, (newProfile) => {
  if (newProfile) {
    localProfile.value = JSON.parse(JSON.stringify(newProfile));
  } else {
    localProfile.value = { name: '', enabled: true, subscriptions: [], manualNodes: [], customId: '' };
  }
}, { deep: true, immediate: true });

const handleConfirm = () => {
  emit('save', localProfile.value);
};

const toggleSelection = (listName, id) => {
    const list = localProfile.value[listName];
    const index = list.indexOf(id);
    if (index > -1) {
        list.splice(index, 1);
    } else {
        list.push(id);
    }
};

const handleSelectAll = (listName, sourceArray) => {
    localProfile.value[listName] = sourceArray.map(item => item.id);
};
const handleDeselectAll = (listName) => {
    localProfile.value[listName] = [];
};

</script>

<template>
  <Modal :show="show" @update:show="emit('update:show', $event)" @confirm="handleConfirm" size="2xl">
    <template #title>
      <h3 class="text-lg font-bold text-gray-800 dark:text-white">
        {{ isNew ? '新增订阅组' : '编辑订阅组' }}
      </h3>
    </template>
    <template #body>
      <div v-if="localProfile" class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="profile-name" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                订阅组名称
              </label>
              <input
                type="text"
                id="profile-name"
                v-model="localProfile.name"
                placeholder="例如：家庭共享"
                class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white"
              >
            </div>
            <div>
              <label for="profile-custom-id" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                自定义 ID (可选)
              </label>
              <input
                type="text"
                id="profile-custom-id"
                v-model="localProfile.customId"
                placeholder="如: home, game (限字母、数字、-、_)"
                class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white"
              >
               <p class="text-xs text-gray-400 mt-1">设置后，订阅链接会更短，如 /token/home</p>
            </div>
            <div>
              <label for="profile-subconverter" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                自定义后端 (可选)
              </label>
              <input
                type="text"
                id="profile-subconverter"
                v-model="localProfile.subConverter"
                placeholder="留空则使用全局设置"
                class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white"
              >
              <p class="text-xs text-gray-400 mt-1">为此订阅组指定一个独立的 SubConverter 后端地址。</p>
            </div>
            <div>
              <label for="profile-subconfig" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                自定义远程配置 (可选)
              </label>
              <input
                type="text"
                id="profile-subconfig"
                v-model="localProfile.subConfig"
                placeholder="留空则使用全局设置"
                class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white"
              >
              <p class="text-xs text-gray-400 mt-1">为此订阅组指定一个独立的 Subconverter 配置文件。</p>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

            <div v-if="allSubscriptions.length > 0" class="space-y-2">
              <div class="flex justify-between items-center mb-2">
                <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">选择机场订阅</h4>
                <div class="space-x-2">
                    <button @click="handleSelectAll('subscriptions', allSubscriptions)" class="text-xs text-indigo-600 hover:underline">全选</button>
                    <button @click="handleDeselectAll('subscriptions')" class="text-xs text-indigo-600 hover:underline">全不选</button>
                </div>
              </div>
              <div class="relative mb-2">
                <input
                  type="text"
                  v-model="subscriptionSearchTerm"
                  placeholder="搜索订阅..."
                  class="w-full pl-9 pr-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <div class="overflow-y-auto space-y-2 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border dark:border-gray-700 h-48">
                <div v-for="sub in filteredSubscriptions" :key="sub.id">
                  <label class="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      :checked="localProfile.subscriptions?.includes(sub.id)"
                      @change="toggleSelection('subscriptions', sub.id)"
                      class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span class="text-sm text-gray-800 dark:text-gray-200 truncate" :title="sub.name">{{ sub.name || '未命名订阅' }}</span>
                  </label>
                </div>
                <div v-if="filteredSubscriptions.length === 0" class="text-center text-gray-500 text-sm py-4">
                  没有找到匹配的订阅。
                </div>
              </div>
            </div>
            <div v-else class="text-center text-sm text-gray-500 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg flex items-center justify-center h-full">
              没有可用的机场订阅
            </div>

            <div v-if="allManualNodes.length > 0" class="space-y-2">
              <div class="flex justify-between items-center mb-2">
                <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">选择手动节点</h4>
                 <div class="space-x-2">
                    <button @click="handleSelectAll('manualNodes', allManualNodes)" class="text-xs text-indigo-600 hover:underline">全选</button>
                    <button @click="handleDeselectAll('manualNodes')" class="text-xs text-indigo-600 hover:underline">全不选</button>
                </div>
              </div>
              <div class="relative mb-2">
                <input
                  type="text"
                  v-model="nodeSearchTerm"
                  placeholder="搜索节点..."
                  class="w-full pl-9 pr-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
               <div class="overflow-y-auto space-y-2 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border dark:border-gray-700 h-48">
                <div v-for="node in filteredManualNodes" :key="node.id">
                  <label class="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      :checked="localProfile.manualNodes?.includes(node.id)"
                      @change="toggleSelection('manualNodes', node.id)"
                      class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span class="text-sm text-gray-800 dark:text-gray-200 truncate" :title="node.name">{{ node.name || '未命名节点' }}</span>
                  </label>
                </div>
                <div v-if="filteredManualNodes.length === 0" class="text-center text-gray-500 text-sm py-4">
                  没有找到匹配的节点。
                </div>
              </div>
            </div>
            <div v-else class="text-center text-sm text-gray-500 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg flex items-center justify-center h-full">
               没有可用的手动节点
            </div>
        </div>

      </div>
    </template>
  </Modal>
</template>