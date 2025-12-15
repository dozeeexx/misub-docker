import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useProfileStore = defineStore('profiles', () => {
    const items = ref([]);

    const activeItems = computed(() => items.value.filter(profile => profile.enabled));

    function setItems(newItems) {
        items.value = newItems;
    }

    function add(profile) {
        items.value.unshift(profile);
    }

    function remove(id) {
        const index = items.value.findIndex(p => p.id === id || p.customId === id);
        if (index !== -1) {
            items.value.splice(index, 1);
        }
    }

    function update(id, updates) {
        const index = items.value.findIndex(p => p.id === id || p.customId === id);
        if (index !== -1) {
            items.value[index] = { ...items.value[index], ...updates };
        }
    }

    return {
        items,
        activeItems,
        setItems,
        add,
        remove,
        update
    };
});
