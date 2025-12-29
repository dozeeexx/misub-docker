<script setup>
import Modal from '../forms/Modal.vue';

const props = defineProps({
  show: Boolean,
  isNew: Boolean,
  editingNode: Object
});

const emit = defineEmits(['update:show', 'confirm', 'input-url']);

const handleConfirm = () => {
  emit('confirm');
};
</script>

<template>
  <Modal
    v-if="editingNode"
    :show="show"
    size="2xl"
    @update:show="emit('update:show', $event)"
    @confirm="handleConfirm"
  >
    <template #title>
      <h3 class="text-lg font-bold text-gray-800 dark:text-white">
        {{ isNew ? '新增手动节点' : '编辑手动节点' }}
      </h3>
    </template>
    <template #body>
      <div class="space-y-4">
        <div>
          <label for="node-name" class="block text-sm font-medium text-gray-700 dark:text-gray-300">节点名称</label>
          <input
            type="text"
            id="node-name"
            v-model="editingNode.name"
            placeholder="（可选）"
            class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md dark:text-white"
          >
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">颜色标签</label>
          <div class="flex items-center gap-3">
            <button
              v-for="color in ['red', 'orange', 'green', 'blue']"
              :key="color"
              @click="editingNode.colorTag = editingNode.colorTag === color ? null : color"
              class="w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center"
              :class="[
                editingNode.colorTag === color ? 'border-indigo-500 scale-110' : 'border-transparent hover:scale-105',
                `bg-${color}-500`
              ]"
            >
              <svg v-if="editingNode.colorTag === color" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
            </button>
            <button
              v-if="editingNode.colorTag"
              @click="editingNode.colorTag = null"
              class="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 ml-2"
            >清除</button>
          </div>
        </div>

        <div>
          <label for="node-url" class="block text-sm font-medium text-gray-700 dark:text-gray-300">节点链接</label>
          <textarea
            id="node-url"
            v-model="editingNode.url"
            rows="4"
            class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md dark:text-white"
            @input="$emit('input-url')"
          ></textarea>
        </div>
      </div>
    </template>
  </Modal>
</template>
