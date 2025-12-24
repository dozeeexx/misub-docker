<script setup>
import { ref, watch } from 'vue';
import Modal from '../forms/Modal.vue';
import SettingsPanel from './SettingsPanel.vue';

const props = defineProps({
  show: Boolean,
  exportBackup: Function,
  importBackup: Function,
});

const emit = defineEmits(['update:show']);
</script>

<template>
  <Modal 
    :show="show" 
    @update:show="emit('update:show', $event)" 
    :show-footer="false"
  >
    <template #title><h3 class="text-lg font-bold text-gray-800 dark:text-white">设置</h3></template>
    <template #body>
       <SettingsPanel :export-backup="props.exportBackup" :import-backup="props.importBackup" />
    </template>
  </Modal>
</template>
