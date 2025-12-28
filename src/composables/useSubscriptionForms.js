import { ref } from 'vue';
import { useToastStore } from '../stores/toast.js';

export function useSubscriptionForms({ addSubscription, updateSubscription }) {
    const { showToast } = useToastStore();
    const showModal = ref(false);
    const isNew = ref(false);
    const editingSubscription = ref(null);

    const openAdd = () => {
        isNew.value = true;
        editingSubscription.value = {
            name: '',
            url: '',
            enabled: true,
            exclude: '',
            customUserAgent: '',
            notes: ''
        };
        showModal.value = true;
    };

    const openEdit = (sub) => {
        if (!sub) {
            console.error('UseSubscriptionForms: openEdit called with null/undefined');
            return;
        }
        console.log('UseSubscriptionForms: openEdit called with', sub);
        isNew.value = false;
        // Deep copy to avoid mutating store state directly before save
        try {
            editingSubscription.value = JSON.parse(JSON.stringify(sub));
            console.log('UseSubscriptionForms: editingSubscription set to', editingSubscription.value);
            showModal.value = true;
        } catch (e) {
            console.error('UseSubscriptionForms: Failed to clone subscription', e);
        }
    };

    const handleSave = () => {
        if (!editingSubscription.value || !editingSubscription.value.url) {
            showToast('订阅链接不能为空', 'error');
            return;
        }
        if (!/^https?:\/\//.test(editingSubscription.value.url)) {
            showToast('请输入有效的 http:// 或 https:// 订阅链接', 'error');
            return;
        }

        if (isNew.value) {
            addSubscription({ ...editingSubscription.value, id: crypto.randomUUID() });
        } else {
            updateSubscription(editingSubscription.value);
        }
        showModal.value = false;
    };

    return {
        showModal,
        isNew,
        editingSubscription,
        openAdd,
        openEdit,
        handleSave
    };
}
