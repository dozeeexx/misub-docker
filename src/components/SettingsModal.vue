<script setup>
import { ref, watch } from 'vue';
import Modal from './Modal.vue';
import { fetchSettings, saveSettings } from '../lib/api.js';
import { useToast } from '../lib/stores.js';

const props = defineProps({
  show: Boolean
});

const emit = defineEmits(['update:show']);

const { showToast } = useToast();
const isLoading = ref(false);
const isSaving = ref(false);
const settings = ref({});

const loadSettings = async () => {
  isLoading.value = true;
  try {
    settings.value = await fetchSettings();
  } catch (error) {
    showToast('加载设置失败', 'error');
  } finally {
    isLoading.value = false;
  }
};

const handleSave = async () => {
  isSaving.value = true;
  try {
    const result = await saveSettings(settings.value);
    if (result.success) {
      showToast('设置已保存，页面将自动刷新...', 'success');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } else {
      throw new Error(result.message || '保存失败');
    }
  } catch (error) {
    showToast(error.message, 'error');
    isSaving.value = false;
  }
};

watch(() => props.show, (newValue) => {
  if (newValue) {
    loadSettings();
  }
});
</script>

<template>
  <Modal :show="show" @update:show="emit('update:show', $event)" @confirm="handleSave" :is-saving="isSaving">
    <template #title><h3 class="text-lg font-bold text-gray-800 dark:text-white">设置</h3></template>
    <template #body>
      <div v-if="isLoading" class="text-center p-8">
        <p class="text-gray-500">正在加载设置...</p>
      </div>
      <div v-else class="space-y-4">
        <div>
          <label for="fileName" class="block text-sm font-medium text-gray-700 dark:text-gray-300">自定义订阅文件名称</label>
          <input 
            type="text" id="fileName" v-model="settings.FileName" 
            class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white"
          >
        </div>
        <div>
          <label for="myToken" class="block text-sm font-medium text-gray-700 dark:text-gray-300">自定义订阅Token</label>
          <input 
            type="text" id="myToken" v-model="settings.mytoken"
            class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white"
          >
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">节点名称前缀</label>
          <div class="mt-2 flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <p class="text-sm text-gray-600 dark:text-gray-300">自动将订阅名添加为节点名的前缀</p>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" v-model="settings.prependSubName" class="sr-only peer">
              <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>

        <div>
          <label for="autoGroups" class="block text-sm font-medium text-gray-700 dark:text-gray-300">自动分组关键词 (JSON格式)</label>
          <p class="mt-1 text-xs text-gray-500">为策略组名称及其匹配的节点名关键词。例如: {"香港":["hk","港"],"日本":["jp","日"]}</p>
          <textarea 
            id="autoGroups" v-model="settings.autoGroups" rows="5"
            class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono dark:text-white"
            placeholder='{
  "香港": ["hk", "hongkong", "港"],
  "日本": ["jp", "japan", "日"],
  "美国": ["us", "united states", "美"]
}'
          ></textarea>
        </div>

        <div>
          <label for="customRules" class="block text-sm font-medium text-gray-700 dark:text-gray-300">自定义分流规则 (YAML格式)</label>
           <p class="mt-1 text-xs text-gray-500">每行一条Clash规则，将覆盖默认规则。留空则使用基础的 "MATCH,PROXY" 规则。</p>
          <textarea 
            id="customRules" v-model="settings.customRules" rows="10"
            class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono dark:text-white"
            placeholder="- DOMAIN-SUFFIX,google.com,PROXY
- DOMAIN-KEYWORD,ad,REJECT
- MATCH,PROXY"
          ></textarea>
        </div>

        <div class="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
            <h4 class="text-sm font-bold text-gray-500 dark:text-gray-400">高级设置 (仅后端代理模式有效)</h4>
            <div>
              <label for="subConverter" class="block text-sm font-medium text-gray-700 dark:text-gray-300">SubConverter后端地址</label>
              <input 
                type="text" id="subConverter" v-model="settings.subConverter" 
                class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white"
              >
            </div>
            <div>
              <label for="subConfig" class="block text-sm font-medium text-gray-700 dark:text-gray-300">SubConverter配置文件</label>
              <input 
                type="text" id="subConfig" v-model="settings.subConfig"
                class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white"
              >
            </div>
        </div>

         <div class="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
             <h4 class="text-sm font-bold text-gray-500 dark:text-gray-400">Telegram 通知</h4>
            <div>
              <label for="tgBotToken" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Telegram Bot Token</label>
              <input 
                type="text" id="tgBotToken" v-model="settings.BotToken"
                class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white"
              >
            </div>
            <div>
              <label for="tgChatID" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Telegram Chat ID</label>
              <input 
                type="text" id="tgChatID" v-model="settings.ChatID"
                class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white"
              >
            </div>
         </div>

      </div>
    </template>
  </Modal>
</template>