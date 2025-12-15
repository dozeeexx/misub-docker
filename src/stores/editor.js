import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useEditorStore = defineStore('editor', () => {
    const isDirty = ref(false);
    const isLoading = ref(false);
    const lastUpdated = ref(null);

    function markDirty() {
        console.log('[EditorStore] markDirty called');
        isDirty.value = true;
    }

    function clearDirty() {
        console.log('[EditorStore] clearDirty called');
        isDirty.value = false;
    }

    function setLoading(loading) {
        isLoading.value = loading;
    }

    function setLastUpdated(date) {
        lastUpdated.value = date;
    }

    return {
        isDirty,
        isLoading,
        lastUpdated,
        markDirty,
        clearDirty,
        setLoading,
        setLastUpdated
    };
});
