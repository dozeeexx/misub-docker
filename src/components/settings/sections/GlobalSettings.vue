<script setup>
import { watch } from 'vue';
import NodeTransformSettings from '../NodeTransformSettings.vue';

const props = defineProps({
  settings: {
    type: Object,
    required: true
  }
});

const prefixToggleOptions = [
  { label: '启用', value: true },
  { label: '禁用', value: false }
];

const buildDefaultPrefixSettings = () => ({
  enableManualNodes: true,
  enableSubscriptions: true,
  manualNodePrefix: '手动节点'
});

const buildDefaultNodeTransform = () => ({
  enabled: false,
  rename: {
    regex: { enabled: false, rules: [] },
    template: {
      enabled: false,
      template: '{emoji}{region}-{protocol}-{index}',
      indexStart: 1,
      indexPad: 2,
      indexScope: 'regionProtocol',
      regionAlias: {},
      protocolAlias: { hysteria2: 'hy2' }
    }
  },
  dedup: {
    enabled: false,
    mode: 'serverPort',
    includeProtocol: false,
    prefer: { protocolOrder: ['vless', 'trojan', 'vmess', 'hysteria2', 'ss', 'ssr'] }
  },
  sort: {
    enabled: false,
    nameIgnoreEmoji: true,
    keys: [
      { key: 'region', order: 'asc', customOrder: ['香港', '台湾', '日本', '新加坡', '美国', '韩国', '英国', '德国', '法国', '加拿大'] },
      { key: 'protocol', order: 'asc', customOrder: ['vless', 'trojan', 'vmess', 'hysteria2', 'ss', 'ssr'] },
      { key: 'name', order: 'asc' }
    ]
  }
});

const ensureDefaults = () => {
  if (!props.settings) return;

  if (!props.settings.defaultPrefixSettings) {
    props.settings.defaultPrefixSettings = buildDefaultPrefixSettings();
  } else {
    const prefix = props.settings.defaultPrefixSettings;
    if (typeof prefix.enableManualNodes !== 'boolean') prefix.enableManualNodes = true;
    if (typeof prefix.enableSubscriptions !== 'boolean') prefix.enableSubscriptions = true;
    if (!prefix.manualNodePrefix) prefix.manualNodePrefix = '手动节点';
  }

  if (!props.settings.defaultNodeTransform) {
    props.settings.defaultNodeTransform = buildDefaultNodeTransform();
  }
};

watch(() => props.settings, ensureDefaults, { immediate: true });
</script>

<template>
  <div class="space-y-6">
    <div
      class="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-2 border border-gray-100 dark:border-gray-700 shadow-sm">
      <h3 class="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24"
          stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M12 3c-4.418 0-8 3.134-8 7s3.582 7 8 7 8-3.134 8-7-3.582-7-8-7zm0 10.5a3.5 3.5 0 110-7 3.5 3.5 0 010 7zm0 5.5v2m-4-3l-1.5 1.5m9-1.5L16 19.5m-9-9H3m18 0h-4" />
        </svg>
        全局设置
      </h3>
      <p class="text-xs text-gray-500 dark:text-gray-400">
        仅影响默认订阅输出，不会影响已有的自定义订阅组。
      </p>
    </div>

    <div
      class="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-4 border border-gray-100 dark:border-gray-700 shadow-sm">
      <h3 class="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24"
          stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        节点前缀设置
      </h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="sm:col-span-2">
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">手动节点前缀</label>
          <input
            type="text"
            v-model="settings.defaultPrefixSettings.manualNodePrefix"
            class="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 dark:text-white"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">手动节点前缀</label>
          <select
            v-model="settings.defaultPrefixSettings.enableManualNodes"
            class="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 dark:text-white"
          >
            <option v-for="option in prefixToggleOptions" :key="String(option.value)" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">机场订阅前缀</label>
          <select
            v-model="settings.defaultPrefixSettings.enableSubscriptions"
            class="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 dark:text-white"
          >
            <option v-for="option in prefixToggleOptions" :key="String(option.value)" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <div
      class="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-4 border border-gray-100 dark:border-gray-700 shadow-sm">
      <h3 class="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24"
          stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M4 6h16M4 10h16M4 14h10M4 18h6" />
        </svg>
        节点净化管道
      </h3>
      <NodeTransformSettings
        :model-value="settings.defaultNodeTransform"
        @update:model-value="val => settings.defaultNodeTransform = val"
      />
    </div>
  </div>
</template>
