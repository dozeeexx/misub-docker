<script setup>
import { ref } from 'vue';
import Modal from '../forms/Modal.vue';

const props = defineProps({
  show: Boolean,
});

const emit = defineEmits(['update:show', 'import']);

const importText = ref('');
const selectedColorTag = ref(null);

const handleConfirm = () => {
    emit('import', importText.value, selectedColorTag.value);
    emit('update:show', false);
    importText.value = '';
    selectedColorTag.value = null;
};
</script>

<template>
  <Modal :show="show" @update:show="emit('update:show', $event)" @confirm="handleConfirm">
    <template #title><h3 class="text-lg font-bold text-gray-900 dark:text-white">批量导入</h3></template>
    <template #body>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">每行一个订阅链接或分享节点。将自动识别节点名称。</p>
      
      <!-- Color Tag Selector -->
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">自动标记颜色（仅针对手动节点）</label>
        <div class="flex items-center gap-3">
          <button 
            v-for="color in ['red', 'orange', 'green', 'blue']" 
            :key="color"
            @click="selectedColorTag = selectedColorTag === color ? null : color"
            class="w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center"
            :class="[
              selectedColorTag === color ? 'border-indigo-500 scale-110' : 'border-transparent hover:scale-105',
              `bg-${color}-500`
            ]"
          >
            <svg v-if="selectedColorTag === color" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
          </button>
          <button 
            v-if="selectedColorTag"
            @click="selectedColorTag = null"
            class="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 ml-2"
          >清除</button>
        </div>
      </div>

      <textarea 
        v-model="importText"
        rows="8"
        class="w-full text-sm border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 p-2 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono dark:text-white"
        placeholder="http://...&#10;https://...&#10;vmess://...&#10;vless://...&#10;trojan://..."
      ></textarea>
    </template>
  </Modal>
</template>