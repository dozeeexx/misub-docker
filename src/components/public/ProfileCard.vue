<script setup>
import QRCodeOverlay from './QRCodeOverlay.vue';

const props = defineProps({
  profile: {
    type: Object,
    required: true
  },
  isQrExpanded: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits([
  'quick-import',
  'toggle-qr',
  'preview',
  'copy-link',
  'download-qr',
  'register-canvas'
]);
</script>

<template>
  <div
    class="group relative bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xs border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:border-indigo-100 dark:hover:border-indigo-900 transition-all duration-300 transform hover:-translate-y-1"
  >
    <!-- Top Right Buttons: Quick Import & QR Code -->
    <div class="absolute top-4 right-4 flex gap-2">
      <!-- Quick Import Button -->
      <button
        @click="emit('quick-import', profile)"
        class="w-10 h-10 flex items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all hover:scale-110 group/import"
        title="一键导入"
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        <span
          class="absolute -bottom-8 right-0 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover/import:opacity-100 transition-opacity whitespace-nowrap pointer-events-none"
        >
          一键导入
        </span>
      </button>

      <!-- QR Code Button -->
      <button
        @click="emit('toggle-qr', profile)"
        class="w-10 h-10 flex items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 transition-all hover:scale-110 group/qr"
        :class="{ 'bg-green-100 dark:bg-green-900/40': isQrExpanded }"
        title="查看二维码"
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
        </svg>
        <span
          class="absolute -bottom-8 right-0 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover/qr:opacity-100 transition-opacity whitespace-nowrap pointer-events-none"
        >
          {{ isQrExpanded ? '收起二维码' : '扫码导入' }}
        </span>
      </button>
    </div>

    <div class="mb-4">
      <div
        class="h-12 w-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 transition-colors"
      >
        <span class="text-2xl">🚀</span>
      </div>
    </div>

    <h3
      class="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"
    >
      {{ profile.name }}
    </h3>

    <p class="text-gray-500 dark:text-gray-400 text-sm mb-6 line-clamp-3 min-h-[3.75rem]">
      {{ profile.description || '暂无简介' }}
    </p>

    <div class="flex items-center gap-4 mb-6">
      <div class="flex flex-col text-center bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 flex-1">
        <span class="text-xs text-gray-500 dark:text-gray-400">包含订阅</span>
        <span class="text-lg font-bold text-gray-900 dark:text-white">{{ profile.subscriptionCount || 0 }}</span>
      </div>
      <div class="flex flex-col text-center bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 flex-1">
        <span class="text-xs text-gray-500 dark:text-gray-400">包含节点</span>
        <span class="text-lg font-bold text-gray-900 dark:text-white">{{ profile.manualNodeCount || 0 }}</span>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <button
        @click="emit('preview', profile)"
        class="flex items-center justify-center px-4 py-3 border border-indigo-200 dark:border-indigo-800 text-sm font-medium rounded-xl text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
      >
        <svg class="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        预览节点
      </button>
      <button
        @click="emit('copy-link', profile)"
        class="flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-lg shadow-indigo-500/30 transition-all active:scale-95"
      >
        <svg class="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        复制链接
      </button>
    </div>

    <p class="mt-4 text-center text-xs text-gray-400">
      点击右上角一键导入或查看二维码
    </p>

    <QRCodeOverlay
      :profile="profile"
      :is-expanded="isQrExpanded"
      @close="emit('toggle-qr', profile)"
      @download="emit('download-qr', profile)"
      @register-canvas="(id, el) => emit('register-canvas', id, el)"
    />
  </div>
</template>
