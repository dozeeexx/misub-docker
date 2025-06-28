<script setup>
import { ref, computed, onUnmounted } from 'vue';
import { useToast } from '../lib/stores.js';

const props = defineProps({
  config: Object
});

const { showToast } = useToast();

// --- 新增状态，用于追踪复制操作 ---
const copied = ref(false);
let copyTimeout = null;

const formats = ['自适应', 'Base64', 'Clash', 'Sing-Box', 'Surge', 'Loon'];
const selectedFormat = ref('自适应');

const subLink = computed(() => {
  const token = props.config?.mytoken === 'auto' ? 'auto' : props.config?.mytoken;
  if (!token) return '请先在设置中配置 Token';
  
  const baseUrl = `${window.location.protocol}//${window.location.host}/sub?token=${token}`;
  
  const format = selectedFormat.value;

  if (format === '自适应') {
    return baseUrl;
  }

  // 将格式名转为小写以用作URL参数
  const targetMapping = {
    'Sing-Box': 'singbox',
    'QuanX': 'quanx',
  };
  const target = targetMapping[format] || format.toLowerCase();
  
  return `${baseUrl}&target=${target}`;
});

const copyToClipboard = () => {
  if (!subLink.value || subLink.value.startsWith('请先')) {
    showToast('链接无效，无法复制', 'error');
    return;
  }
  navigator.clipboard.writeText(subLink.value);
  showToast('已复制到剪贴板', 'success');
  
  // 更新状态以提供即时视觉反馈
  copied.value = true;
  // 清除上一个定时器（以防用户快速连续点击）
  clearTimeout(copyTimeout);
  // 设置一个定时器，在2秒后将图标恢复原状
  copyTimeout = setTimeout(() => {
    copied.value = false;
  }, 2000);
};

// 【重要】组件卸载时清除定时器，防止内存泄漏和报错
onUnmounted(() => {
  clearTimeout(copyTimeout);
});
</script>

<template>
  <div class="sticky top-24">
    <div class="bg-white/50 dark:bg-gray-900/60 backdrop-blur-sm p-5 rounded-2xl shadow-lg dark:shadow-2xl ring-1 ring-black/5">
      <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-4">订阅链接</h3>
      <div class="grid grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
        <button
          v-for="format in formats"
          :key="format"
          @click="selectedFormat = format"
          class="px-3 py-1.5 text-xs font-medium rounded-full transition-colors flex justify-center"
          :class="[
            selectedFormat === format
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-gray-200/50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 hover:bg-gray-300/50 dark:hover:bg-gray-600/50'
          ]"
        >
          {{ format }}
        </button>
      </div>
      <div class="relative">
        <input
          type="text"
          :value="subLink"
          readonly
          class="w-full text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800/50 rounded-lg pl-3 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
        />
        <button @click="copyToClipboard" class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-indigo-500 transition-colors duration-200" :title="copied ? '已复制' : '复制'">
            <Transition name="fade" mode="out-in">
                <svg v-if="copied" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
            </Transition>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>