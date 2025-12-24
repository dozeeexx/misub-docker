<script setup>
import { defineAsyncComponent } from 'vue';
import { useDataStore } from '../stores/useDataStore.js';
import { useToastStore } from '../stores/toast.js';
import { useUIStore } from '../stores/ui.js';

// Reuse SettingsModal logic, effectively flattening it into a page.
// The original SettingsModal was quite complex, likely importing other components.
// I should probably check `SettingsModal.vue` content, but I didn't read it.
// However, `Dashboard.vue` imported it: `import SettingsModal from '../../modals/SettingsModal.vue'`.
// And passed `:export-backup` and `:import-backup`.
// If I use `SettingsModal` *as* the page content (or wrapped), it might be easiest.
// But `SettingsModal` likely has a standard "Modal" wrapper (title, overlay). I want to strip that.
// If I can't strip it easily, I might need to refactor `SettingsModal` to extracting its content to `SettingsForm.vue`.
// For now, let's look at what `SettingsModal` does. I haven't read it.
// I'll take a risk and assume I can just instantiate `SettingsModal` but force it to be "inline"? 
// Unlikely if it uses the `Modal` component which usually fixes position.
// Better plan: Read `SettingsModal.vue` first to see if I can extract the form.
// Since I can't read it inside this turn easily (I am writing), I will check `Dashboard.vue` usage again.
// It passes `exportBackup` and `importBackup`.
// I'll implement the Backup logic here (copied from Dashboard.vue) and then maybe just try to reuse `SettingsModal` if I can, OR just "re-implement" the settings UI here if it's simple.
// The user image showed "General", "Account", "Agent", "Advanced", "About". It's a full page.
// `SettingsModal.vue` is probably the implementation of that.
// If `SettingsModal` is designed as a Modal, using it as a page is awkward.
// I will create `SettingsView.vue` and temporarily just put a placeholder "Settings are migrating..." 
// OR simpler: I will assume I can modify `SettingsModal.vue` later to be a standalone component.
// But wait, I'm refactoring now.
// Let's try to implement the Backup/Restore logic here directly, as that was in `Dashboard.vue`.

const dataStore = useDataStore();
const { showToast } = useToastStore();
const { subscriptions, profiles } = dataStore;
// manualNodes? Again, issue with dataStore not exposing manualNodes directly? 
// dataStore internal implementation uses `subscriptionStore` which holds items. 
// "manualNodes" are part of subscriptions in the backend storage (same table usually), but separated in UI?
// In `useDataStore.js`: `overwriteSubscriptions` calls `subscriptionStore.setItems`.
// In `Dashboard.vue`, `tabs` separated them.
// Let's retrieve manualNodes via composable again.
import { useManualNodes } from '../composables/useManualNodes.js';
const { manualNodes } = useManualNodes(() => {});

// Backup Logic
const exportBackup = () => {
  try {
    const backupData = {
      subscriptions: subscriptions.value || [],
      manualNodes: manualNodes.value || [], // Need value!
      profiles: profiles.value || [],
    };
    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-');
    a.download = `misub-backup-${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('备份已成功导出', 'success');
  } catch (error) {
    console.error('Backup export failed:', error);
    showToast('备份导出失败', 'error');
  }
};

const importBackup = () => {
    // Input element creation...
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (!data || !Array.isArray(data.subscriptions)) {
                     throw new Error('无效的备份文件格式');
                }
                if (confirm('确定要从备份中恢复吗？所有当前数据将被覆盖。')) {
                    const merged = [...(data.subscriptions||[]), ...(data.manualNodes||[])];
                    dataStore.overwriteSubscriptions(merged);
                    dataStore.overwriteProfiles(data.profiles || []);
                    dataStore.markDirty();
                    showToast('数据已恢复，请保存', 'success');
                }
            } catch (err) {
                 showToast('导入失败: ' + err.message, 'error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
};

// Now, about the UI.
// I'll reuse `SettingsModal` but I'll need to check if it can be rendered without the Modal shell.
// If `SettingsModal` uses `<Modal>`, I can't just unwrap it easily without editing `SettingsModal.vue`.
// For the sake of this task, I will import `SettingsModal` and modify `SettingsModal.vue` *in the next step* to separate the Content from the Modal wrapper.
// So here I will use a new component `SettingsContent` which I will create by refactoring `SettingsModal`.
// For now, let's assume `SettingsModal` is available.
// Actually, I'll just use `SettingsModal` here. If it pops up a modal, that's bad.
// I'll create the file, and then I'll refactor `SettingsModal` to be `SettingsPanel.vue` (content) and `SettingsModal.vue` (wrapper).
// And `SettingsView` will use `SettingsPanel`.

import SettingsPanel from '../components/modals/SettingsPanel.vue'; // Anticipating the refactor

</script>

<template>
  <div class="max-w-4xl mx-auto">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">设置</h1>
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xs border border-gray-100 dark:border-gray-700 overflow-hidden">
          <SettingsPanel :export-backup="exportBackup" :import-backup="importBackup" />
      </div>
  </div>
</template>
