import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useSubscriptionStore = defineStore('subscriptions', () => {
    const items = ref([]);

    const activeItems = computed(() => items.value.filter(sub => sub.enabled));

    function setItems(newItems) {
        items.value = newItems;
    }

    function add(subscription) {
        items.value.unshift(subscription);
    }

    function remove(id) {
        const index = items.value.findIndex(s => s.id === id);
        if (index !== -1) {
            items.value.splice(index, 1);
        }
    }

    function update(id, updates) {
        const index = items.value.findIndex(s => s.id === id);
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
