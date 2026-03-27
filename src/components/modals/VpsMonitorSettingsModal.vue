<script setup>
import Modal from '../forms/Modal.vue';
import VpsMonitorCard from '../settings/sections/ServiceSettings/VpsMonitorCard.vue';

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  settings: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['update:show']);

const handleClose = () => {
  emit('update:show', false);
};
</script>

<template>
  <Modal :show="show" @update:show="handleClose" confirm-text="关闭" cancel-text="关闭" :confirm-disabled="true" size="4xl">
    <template #title>
      <div class="flex items-center gap-2">
        <span class="text-lg font-bold text-gray-900 dark:text-white">VPS 探针设置</span>
      </div>
    </template>
    <template #body>
      <VpsMonitorCard :settings="settings" />
    </template>
  </Modal>
</template>
