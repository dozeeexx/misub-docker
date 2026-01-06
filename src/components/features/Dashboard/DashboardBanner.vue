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
      class="p-3 mb-6 rounded-lg ring-1 ring-inset flex items-center justify-between transition-colors duration-300"
      :class="saveState === 'success' ? 'bg-teal-500/10 ring-teal-500/20' : 'bg-indigo-600/10 dark:bg-indigo-500/20 ring-indigo-600/20'">
      <p class="text-sm font-medium transition-colors duration-300"
        :class="saveState === 'success' ? 'text-teal-800 dark:text-teal-200' : 'text-indigo-800 dark:text-indigo-200'">
        {{ saveState === 'success' ? '保存成功' : '您有未保存的更改' }}
      </p>
      <div class="flex items-center gap-3">
        <button v-if="saveState !== 'success'" @click="$emit('discard')"
          class="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">放弃更改</button>
        <button @click.prevent="$emit('save')" :disabled="saveState !== 'idle'"
          class="px-5 py-2 text-sm text-white font-semibold rounded-lg shadow-xs flex items-center justify-center transition-all duration-300 w-28"
          :class="{ 'bg-indigo-600 hover:bg-indigo-700': saveState === 'idle', 'bg-gray-500 cursor-not-allowed': saveState === 'saving', 'bg-teal-500 cursor-not-allowed': saveState === 'success' }">
          <div v-if="saveState === 'saving'" class="flex items-center">
            <StatusIndicator status="loading" size="sm" class="mr-2" />
            <span>保存中...</span>
          </div>
          <div v-else-if="saveState === 'success'" class="flex items-center">
            <StatusIndicator status="success" size="sm" class="mr-2" />
            <span>已保存</span>
          </div>
          <span v-else>保存更改</span>
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
