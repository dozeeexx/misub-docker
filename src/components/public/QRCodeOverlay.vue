<script setup>
const props = defineProps({
  profile: {
    type: Object,
    required: true
  },
  isExpanded: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close', 'download', 'register-canvas']);
</script>

<template>
  <Transition name="qr-overlay">
    <div
      v-if="isExpanded"
      @click.self="emit('close')"
      class="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10"
    >
      <div class="relative bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl max-w-sm mx-4 transform transition-all"
        @click.stop>
        <!-- Close Button -->
        <button
          @click="emit('close')"
          class="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div class="flex flex-col items-center pt-2">
          <h4 class="text-lg font-semibold text-gray-900 dark:text-white mb-1">{{ profile.name }}</h4>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">扫描二维码导入订阅</p>

          <div class="bg-white p-4 rounded-xl shadow-sm">
            <canvas
              :ref="el => { if (el) emit('register-canvas', profile.id, el); }"
              class="max-w-full h-auto"
            ></canvas>
          </div>

          <button
            @click="emit('download')"
            class="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors shadow-lg shadow-green-500/30"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            下载二维码
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.qr-overlay-enter-active .bg-white,
.qr-overlay-leave-active .bg-white,
.qr-overlay-enter-active .dark\:bg-gray-800,
.qr-overlay-leave-active .dark\:bg-gray-800 {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.qr-overlay-enter-from {
  opacity: 0;
}

.qr-overlay-enter-from > div {
  transform: scale(0.9);
  opacity: 0;
}

.qr-overlay-leave-to {
  opacity: 0;
}

.qr-overlay-leave-to > div {
  transform: scale(0.9);
  opacity: 0;
}
</style>
