import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useUIStore = defineStore('ui', () => {
  const isSettingsModalVisible = ref(false);
  const layoutMode = ref(localStorage.getItem('layoutMode') || 'modern');

  function show() {
    isSettingsModalVisible.value = true;
  }

  function hide() {
    isSettingsModalVisible.value = false;
  }

  function toggleLayout() {
    layoutMode.value = layoutMode.value === 'modern' ? 'legacy' : 'modern';
    localStorage.setItem('layoutMode', layoutMode.value);
    // Reload to ensure clean state transition if needed, though reactive switch is better if possible.
    // Reactive switch might be complex due to router vs no-router initialization.
    // Reloading is safest for this fundamental architecture switch.
    window.location.reload();
  }

  return { isSettingsModalVisible, layoutMode, show, hide, toggleLayout };
});
