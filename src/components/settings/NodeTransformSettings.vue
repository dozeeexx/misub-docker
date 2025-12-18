<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['update:modelValue']);

const config = ref({
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
    keys: []
  }
});

const newRegexRule = ref({ pattern: '', replacement: '', flags: 'g' });
let lastEmittedJson = '';

const buildConfig = (val) => ({
  enabled: val?.enabled ?? false,
  rename: {
    regex: {
      enabled: val?.rename?.regex?.enabled ?? false,
      rules: val?.rename?.regex?.rules ?? []
    },
    template: {
      enabled: val?.rename?.template?.enabled ?? false,
      template: val?.rename?.template?.template ?? '{emoji}{region}-{protocol}-{index}',
      indexStart: val?.rename?.template?.indexStart ?? 1,
      indexPad: val?.rename?.template?.indexPad ?? 2,
      indexScope: val?.rename?.template?.indexScope ?? 'regionProtocol',
      regionAlias: val?.rename?.template?.regionAlias ?? {},
      protocolAlias: val?.rename?.template?.protocolAlias ?? { hysteria2: 'hy2' }
    }
  },
  dedup: {
    enabled: val?.dedup?.enabled ?? false,
    mode: val?.dedup?.mode ?? 'serverPort',
    includeProtocol: val?.dedup?.includeProtocol ?? false,
    prefer: {
      protocolOrder: val?.dedup?.prefer?.protocolOrder ?? ['vless', 'trojan', 'vmess', 'hysteria2', 'ss', 'ssr']
    }
  },
  sort: {
    enabled: val?.sort?.enabled ?? false,
    nameIgnoreEmoji: val?.sort?.nameIgnoreEmoji ?? true,
    keys: val?.sort?.keys ?? []
  }
});

watch(() => props.modelValue, (val) => {
  if (val && typeof val === 'object') {
    const newJson = JSON.stringify(buildConfig(val));
    if (newJson !== lastEmittedJson) {
      config.value = JSON.parse(newJson);
      lastEmittedJson = newJson;
    }
  }
}, { immediate: true, deep: true });

watch(config, (val) => {
  const newJson = JSON.stringify(val);
  if (newJson !== lastEmittedJson) {
    lastEmittedJson = newJson;
    emit('update:modelValue', JSON.parse(newJson));
  }
}, { deep: true });

const addRegexRule = () => {
  if (newRegexRule.value.pattern.trim()) {
    config.value.rename.regex.rules.push({ ...newRegexRule.value });
    newRegexRule.value = { pattern: '', replacement: '', flags: 'g' };
  }
};

const removeRegexRule = (index) => {
  config.value.rename.regex.rules.splice(index, 1);
};
</script>

<template>
  <div class="space-y-4">
    <!-- 总开关 -->
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm font-medium text-gray-700 dark:text-gray-300">启用节点转换管道</p>
        <p class="text-xs text-gray-500 dark:text-gray-400">对节点进行重命名、去重、排序等操作</p>
      </div>
      <label class="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" v-model="config.enabled" class="sr-only peer">
        <div class="w-11 h-6 bg-gray-200 peer-focus:outline-hidden rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-500 peer-checked:bg-indigo-600 dark:peer-checked:bg-green-600"></div>
      </label>
    </div>

    <div v-if="config.enabled" class="space-y-4 border-t border-gray-200 dark:border-gray-600 pt-4">
      <!-- 正则重命名 -->
      <div class="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
        <div class="flex items-center justify-between mb-2">
          <div>
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300">正则重命名</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">使用正则表达式批量修改节点名称</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" v-model="config.rename.regex.enabled" class="sr-only peer">
            <div class="w-9 h-5 bg-gray-200 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 dark:peer-checked:bg-green-600"></div>
          </label>
        </div>
        <div v-if="config.rename.regex.enabled" class="space-y-2 mt-3">
          <div v-for="(rule, idx) in config.rename.regex.rules" :key="idx" class="flex items-center gap-2 text-xs">
            <code class="flex-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded truncate">{{ rule.pattern }}</code>
            <span class="text-gray-400">→</span>
            <code class="flex-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded truncate">{{ rule.replacement || '(空)' }}</code>
            <button @click="removeRegexRule(idx)" class="text-red-500 hover:text-red-700">✕</button>
          </div>
          <div class="flex items-center gap-2">
            <input v-model="newRegexRule.pattern" placeholder="正则表达式" class="flex-1 px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white">
            <input v-model="newRegexRule.replacement" placeholder="替换为" class="flex-1 px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white">
            <button @click="addRegexRule" class="px-2 py-1 text-xs bg-indigo-500 text-white rounded hover:bg-indigo-600">添加</button>
          </div>
          <p class="text-xs text-gray-400">示例：\\[广告\\] → (空) 可移除包含 [广告] 的文字</p>
        </div>
      </div>

      <!-- 模板重命名 -->
      <div class="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
        <div class="flex items-center justify-between mb-2">
          <div>
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300">模板重命名</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">使用模板统一节点命名格式</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" v-model="config.rename.template.enabled" class="sr-only peer">
            <div class="w-9 h-5 bg-gray-200 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 dark:peer-checked:bg-green-600"></div>
          </label>
        </div>
        <div v-if="config.rename.template.enabled" class="space-y-2 mt-3">
          <input v-model="config.rename.template.template" placeholder="{emoji}{region}-{protocol}-{index}" class="w-full px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white">
          <p class="text-xs text-gray-400">可用变量: {emoji} {region} {protocol} {index} {name} {server} {port}</p>
          <div class="flex gap-2">
            <select v-model="config.rename.template.indexScope" class="flex-1 px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white">
              <option value="global">全局编号</option>
              <option value="region">按地区编号</option>
              <option value="protocol">按协议编号</option>
              <option value="regionProtocol">按地区+协议编号</option>
            </select>
            <input type="number" v-model.number="config.rename.template.indexPad" min="0" max="4" class="w-16 px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="补0">
          </div>
        </div>
      </div>

      <!-- 智能去重 -->
      <div class="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
        <div class="flex items-center justify-between mb-2">
          <div>
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300">智能去重</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">基于服务器+端口去重，而非简单URL去重</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" v-model="config.dedup.enabled" class="sr-only peer">
            <div class="w-9 h-5 bg-gray-200 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 dark:peer-checked:bg-green-600"></div>
          </label>
        </div>
        <div v-if="config.dedup.enabled" class="space-y-2 mt-3">
          <div class="flex items-center gap-4">
            <label class="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <input type="checkbox" v-model="config.dedup.includeProtocol" class="rounded">
              去重时区分协议
            </label>
          </div>
          <p class="text-xs text-gray-400">启用后，相同服务器+端口但不同协议的节点会保留</p>
        </div>
      </div>

      <!-- 节点排序 -->
      <div class="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
        <div class="flex items-center justify-between mb-2">
          <div>
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300">节点排序</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">按地区、协议等规则排序节点</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" v-model="config.sort.enabled" class="sr-only peer">
            <div class="w-9 h-5 bg-gray-200 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 dark:peer-checked:bg-green-600"></div>
          </label>
        </div>
        <div v-if="config.sort.enabled" class="space-y-2 mt-3">
          <p class="text-xs text-gray-400">默认排序规则: 地区(香港→台湾→日本...) → 协议 → 名称</p>
          <label class="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <input type="checkbox" v-model="config.sort.nameIgnoreEmoji" class="rounded">
            排序时忽略国旗 Emoji
          </label>
        </div>
      </div>
    </div>
  </div>
</template>
