import { ref } from 'vue';
import { useToastStore } from '../stores/toast.js';
import { extractNodeName } from '../lib/utils.js';
import { generateNodeId, generateSubscriptionId } from '../utils/id.js';

export function useBulkImportLogic({ addSubscriptionsFromBulk, addNodesFromBulk }) {
    const { showToast } = useToastStore();
    const showModal = ref(false);

    const handleBulkImport = (importText, group) => {
        if (!importText) return;

        const lines = importText.split('\n').map(line => line.trim()).filter(Boolean);
        const validSubs = [];
        const validNodes = [];

        lines.forEach(line => {
            const baseItem = {
                name: extractNodeName(line) || '未命名',
                url: line,
                enabled: true,
                status: 'unchecked',
                group: group || null,
                colorTag: null,
                // Default fields for subscriptions
                exclude: '',
                customUserAgent: '',
                notes: ''
            };

            if (/^https?:\/\//.test(line)) {
                validSubs.push({ ...baseItem, id: generateSubscriptionId() });
            } else if (/^(ss|ssr|vmess|vless|trojan|hysteria2?|hy|hy2|tuic|anytls|socks5|socks):\/\//.test(line)) {
                validNodes.push({ ...baseItem, id: generateNodeId() });
            }
        });

        let message = '';

        if (validSubs.length > 0) {
            addSubscriptionsFromBulk(validSubs);
            message += `成功导入 ${validSubs.length} 条订阅 `;
        }

        if (validNodes.length > 0) {
            addNodesFromBulk(validNodes);
            message += `成功导入 ${validNodes.length} 个节点`;
        }

        if (message) {
            showToast(message, 'success');
        } else {
            showToast('未检测到有效的链接', 'warning');
        }
        showModal.value = false;
    };

    return {
        showModal,
        handleBulkImport
    };
}
