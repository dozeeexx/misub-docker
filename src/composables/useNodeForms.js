import { ref } from 'vue';
import { useToastStore } from '../stores/toast.js';
import { extractNodeName } from '../lib/utils.js';

export function useNodeForms({ addNode, updateNode }) {
    const { showToast } = useToastStore();
    const showModal = ref(false);
    const isNew = ref(false);
    const editingNode = ref(null);

    const openAdd = () => {
        isNew.value = true;
        editingNode.value = {
            id: crypto.randomUUID(),
            name: '',
            url: '',
            enabled: true,
            colorTag: null
        };
        showModal.value = true;
    };

    const openEdit = (node) => {
        if (!node) {
            console.error('UseNodeForms: openEdit called with null');
            return;
        }
        console.log('UseNodeForms: openEdit called with', node);
        isNew.value = false;
        editingNode.value = { ...node };
        console.log('UseNodeForms: editingNode set to', editingNode.value);
        showModal.value = true;
    };

    const handleUrlInput = (event) => {
        if (!editingNode.value) return;
        const newUrl = event.target.value;
        if (newUrl && !editingNode.value.name) {
            editingNode.value.name = extractNodeName(newUrl);
        }
    };

    const handleSave = () => {
        if (!editingNode.value || !editingNode.value.url) {
            showToast('节点链接不能为空', 'error');
            return;
        }

        if (isNew.value) {
            addNode(editingNode.value);
        } else {
            updateNode(editingNode.value);
        }
        showModal.value = false;
    };

    return {
        showModal,
        isNew,
        editingNode,
        openAdd,
        openEdit,
        handleUrlInput,
        handleSave
    };
}
