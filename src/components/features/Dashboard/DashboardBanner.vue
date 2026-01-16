<script setup>
import StatusIndicator from '../../ui/StatusIndicator.vue';

defineProps({
  isDirty: Boolean,
  saveState: String,
});

defineEmits(['save', 'discard']);
</script>

<template>
  <Transition name="slide-fade">
    <div v-if="isDirty || saveState === 'success'"
      class="p-4 mb-8 rounded-2xl ring-1 ring-inset flex flex-col sm:flex-row items-center justify-between transition-all duration-300 gap-4 shadow-lg backdrop-blur-xl"
      :class="saveState === 'success' ? 'bg-teal-500/10 ring-teal-500/20 shadow-teal-500/5' : 'bg-primary-600/10 dark:bg-primary-500/10 ring-primary-500/20 shadow-primary-500/5'">
      
      <div class="flex items-center gap-3">
        <span class="flex h-3 w-3 relative">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" :class="saveState === 'success' ? 'bg-teal-400' : 'bg-orange-400'"></span>
            <span class="relative inline-flex rounded-full h-3 w-3" :class="saveState === 'success' ? 'bg-teal-500' : 'bg-orange-500'"></span>
        </span>
        <p class="text-sm font-semibold transition-colors duration-300"
            :class="saveState === 'success' ? 'text-teal-700 dark:text-teal-300' : 'text-primary-700 dark:text-primary-300'">
            {{ saveState === 'success' ? '所有更改已保存' : '检测到未保存的更改' }}
        </p>
      </div>

      <div class="flex items-center gap-3 w-full sm:w-auto">
        <button v-if="saveState !== 'success'" @click="$emit('discard')"
          class="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors hover:bg-black/5 dark:hover:bg-white/5 rounded-lg">
          放弃
        </button>
        <button @click.prevent="$emit('save')" :disabled="saveState !== 'idle'"
          class="flex-1 sm:flex-none px-6 py-2 text-sm text-white font-bold rounded-xl shadow-lg flex items-center justify-center transition-all duration-300 transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
          :class="{ 
            'bg-primary-600 hover:bg-primary-500 shadow-primary-500/30 hover:shadow-primary-500/50 hover:-translate-y-0.5': saveState === 'idle', 
            'bg-gray-500 shadow-gray-500/30': saveState === 'saving', 
            'bg-teal-500 shadow-teal-500/30': saveState === 'success' 
          }">
          <div v-if="saveState === 'saving'" class="flex items-center">
            <StatusIndicator status="loading" size="sm" class="mr-2" />
            <span>保存中...</span>
          </div>
          <div v-else-if="saveState === 'success'" class="flex items-center">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
            <span>已保存</span>
          </div>
          <span v-else>立即保存</span>
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease-out;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(-20px);
  opacity: 0;
}
</style>
