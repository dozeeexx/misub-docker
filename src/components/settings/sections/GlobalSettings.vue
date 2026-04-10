<script setup>
import { watch } from 'vue';
import OperatorChain from '../../features/Operators/OperatorChain.vue';
import Input from '../../ui/Input.vue';

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
  manualNodePrefix: '手动节点',
  prependGroupName: false
});

function ensureDefaults() {
  if (!props.settings) return;

  if (!props.settings.defaultPrefixSettings) {
    props.settings.defaultPrefixSettings = buildDefaultPrefixSettings();
  }
  
  if (!Array.isArray(props.settings.defaultOperators)) {
    props.settings.defaultOperators = [];
  }
}

watch(() => props.settings, ensureDefaults, { immediate: true });
</script>

<template>
  <div class="space-y-8">
    <!-- Announcement & Info Section -->
    <div class="bg-indigo-50/50 dark:bg-indigo-900/10 misub-radius-lg p-6 border border-indigo-100 dark:border-indigo-500/10 shadow-sm">
      <div class="flex items-start gap-4">
        <div class="w-10 h-10 rounded-2xl bg-indigo-500 flex items-center justify-center text-white shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <div class="space-y-1">
          <h3 class="text-base font-bold text-gray-900 dark:text-white">配置说明</h3>
          <p class="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            这里的“全局默认”设置将作为所有订阅组的基础处理逻辑。
            您可以为特定订阅组定义独立的操作符链，此时全局设置将被完全覆盖。
          </p>
        </div>
      </div>
    </div>

    <!-- Node Prefix Settings -->
    <div class="bg-white/90 dark:bg-gray-900/70 misub-radius-lg p-6 space-y-6 border border-gray-100 dark:border-white/10 shadow-sm transition-shadow">
      <div class="flex items-center gap-3 mb-2">
        <div class="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
           <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
        </div>
        <h3 class="text-sm font-bold text-gray-900 dark:text-white">通用节点设置</h3>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div class="sm:col-span-2">
          <Input v-model="settings.defaultPrefixSettings.manualNodePrefix" label="手动节点前缀文本" />
        </div>

        <div>
          <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">手动节点显示</label>
          <div class="relative">
            <select
              v-model="settings.defaultPrefixSettings.enableManualNodes"
              class="w-full bg-gray-50 dark:bg-gray-800 border border-transparent dark:border-gray-700 misub-radius-md py-2.5 px-4 text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all appearance-none"
            >
              <option v-for="option in prefixToggleOptions" :key="String(option.value)" :value="option.value">{{ option.label }}</option>
            </select>
            <div class="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-400">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
        </div>

        <div>
          <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">服务商订阅展示</label>
          <div class="relative">
            <select
              v-model="settings.defaultPrefixSettings.enableSubscriptions"
              class="w-full bg-gray-50 dark:bg-gray-800 border border-transparent dark:border-gray-700 misub-radius-md py-2.5 px-4 text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all appearance-none"
            >
              <option v-for="option in prefixToggleOptions" :key="String(option.value)" :value="option.value">{{ option.label }}</option>
            </select>
            <div class="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-400">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Unified Operator Chain -->
    <div class="bg-white/90 dark:bg-gray-900/70 misub-radius-lg p-6 space-y-6 border border-gray-100 dark:border-white/10 shadow-sm">
      <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-xl bg-green-500/10 flex items-center justify-center text-green-600">
               <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h10M4 18h6" /></svg>
            </div>
            <h3 class="text-sm font-bold text-gray-900 dark:text-white">默认转换操作符链 (Operator Chain)</h3>
          </div>
          <span class="text-[9px] font-bold bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full uppercase">Global Default</span>
      </div>

      <OperatorChain
        v-model="settings.defaultOperators"
        :legacy-data="settings.defaultNodeTransform"
      />
    </div>
  </div>
</template>
