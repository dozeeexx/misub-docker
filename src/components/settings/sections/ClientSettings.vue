<script setup>
import { ref, onMounted } from 'vue';
import { useToastStore } from '../../../stores/toast';
import Modal from '../../forms/Modal.vue';

const clients = ref([]);
const loading = ref(false);
const { showToast } = useToastStore();

const showEditModal = ref(false);
const editingClient = ref({});
const isNew = ref(false);
const saving = ref(false);

const platformOptions = [
    { value: 'windows', label: 'Windows', class: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200' },
    { value: 'macos', label: 'macOS', class: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' },
    { value: 'linux', label: 'Linux', class: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200' },
    { value: 'android', label: 'Android', class: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' },
    { value: 'ios', label: 'iOS', class: 'bg-gray-800 text-white dark:bg-white dark:text-gray-900' }
];

const fetchClients = async () => {
    loading.value = true;
    try {
        const res = await fetch('/api/clients');
        const data = await res.json();
        if (data.success) {
            clients.value = data.data || [];
        } else {
            showToast('获取客户端列表失败', 'error');
        }
    } catch (e) {
        showToast('网络错误', 'error');
    } finally {
        loading.value = false;
    }
};

const showResetConfirm = ref(false);

const handleInit = () => {
    showResetConfirm.value = true;
};

const executeReset = async () => {
    loading.value = true;
    try {
        const res = await fetch('/api/clients/init', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            clients.value = data.data;
            showToast('重置成功', 'success');
        }
    } catch (e) {
        showToast('重置失败', 'error');
    } finally {
        loading.value = false;
    }
};

const handleAdd = () => {
    isNew.value = true;
    editingClient.value = {
        id: '',
        name: '',
        icon: '',
        description: '',
        platforms: [],
        url: '',
        repo: '',
        bgColor: 'bg-gray-50 dark:bg-gray-700/50 text-gray-600'
    };
    showEditModal.value = true;
};

const handleEdit = (client) => {
    isNew.value = false;
    editingClient.value = JSON.parse(JSON.stringify(client));
    if (!editingClient.value.platforms) editingClient.value.platforms = [];
    showEditModal.value = true;
};

const handleSave = async () => {
    if (!editingClient.value.name) return showToast('请输入名称', 'error');
    
    saving.value = true;
    try {
        const res = await fetch('/api/clients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(editingClient.value)
        });
        const data = await res.json();
        if (data.success) {
            showToast('保存成功', 'success');
            showEditModal.value = false;
            // Update local list (server returns full list or we refetch)
             // API handler currently returns full list
            clients.value = data.data;
        } else {
            showToast(data.message || '保存失败', 'error');
        }
    } catch (e) {
        showToast('保存失败: ' + e.message, 'error');
    } finally {
        saving.value = false;
    }
};

const showDeleteConfirm = ref(false);
const clientToDeleteId = ref(null);

const handleDelete = (id) => {
    clientToDeleteId.value = id;
    showDeleteConfirm.value = true;
};

const executeDelete = async () => {
    if (!clientToDeleteId.value) return;
    try {
        const res = await fetch(`/api/clients?id=${clientToDeleteId.value}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            clients.value = data.data;
            showToast('已删除', 'success');
            showDeleteConfirm.value = false;
        }
    } catch (e) {
        showToast('删除失败', 'error');
    }
};

onMounted(fetchClients);
</script>

<template>
    <div class="space-y-6">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-white">客户端管理</h3>
            <div class="flex gap-2 w-full md:w-auto">
                <button @click="handleInit" class="flex-1 md:flex-none px-3 py-1.5 text-center text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md border border-gray-300 dark:border-gray-600">重置默认</button>
                <button @click="handleAdd" class="flex-1 md:flex-none px-3 py-1.5 text-center text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-xs">新增客户端</button>
            </div>
        </div>

        <div v-if="loading" class="text-center py-8 text-gray-500">加载中...</div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div v-for="client in clients" :key="client.id" 
                 class="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow group">
                
                <div class="flex justify-between items-start gap-2">
                    <div class="flex items-start gap-3 min-w-0 flex-1">
                        <div class="h-12 w-12 rounded-lg flex items-center justify-center text-2xl shrink-0" :class="client.bgColor">
                            {{ client.icon }}
                        </div>
                        <div class="min-w-0 flex-1">
                            <h4 class="font-bold text-gray-900 dark:text-white truncate pr-1">{{ client.name }}</h4>
                            <p class="text-xs text-gray-500 truncate">{{ client.description }}</p>
                            <div class="flex flex-wrap gap-1 mt-2">
                                <span v-for="p in client.platforms" :key="p" 
                                    class="px-1.5 py-0.5 text-[10px] rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                    {{ p }}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="flex gap-1 shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button @click.stop="handleEdit(client)" class="p-1.5 text-blue-600 bg-blue-50 dark:bg-blue-900/30 md:bg-transparent hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full md:rounded-md">
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button @click.stop="handleDelete(client.id)" class="p-1.5 text-red-600 bg-red-50 dark:bg-red-900/30 md:bg-transparent hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full md:rounded-md">
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <Modal v-model:show="showEditModal" :title="isNew ? '新增客户端' : '编辑客户端'" width="md:max-w-xl">
            <template #body>
                <div class="space-y-4">
                    <div class="grid grid-cols-4 gap-4">
                         <div class="col-span-3">
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">名称</label>
                            <input v-model="editingClient.name" type="text" class="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">图标 (Emoji)</label>
                            <input v-model="editingClient.icon" type="text" class="mt-1 block w-full text-center rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                        </div>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">简介</label>
                        <textarea v-model="editingClient.description" rows="2" class="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"></textarea>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">支持平台</label>
                        <div class="flex flex-wrap gap-2">
                            <label v-for="opt in platformOptions" :key="opt.value" 
                                class="inline-flex items-center px-3 py-1 rounded-full cursor-pointer transition-colors border select-none"
                                :class="editingClient.platforms.includes(opt.value) 
                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-700 dark:text-indigo-300' 
                                    : 'bg-white border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'"
                            >
                                <input type="checkbox" :value="opt.value" v-model="editingClient.platforms" class="hidden">
                                <span class="text-xs font-medium">{{ opt.label }}</span>
                            </label>
                        </div>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">下载链接 / 官网</label>
                        <input v-model="editingClient.url" type="text" class="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">GitHub Repo (可选)</label>
                            <input v-model="editingClient.repo" type="text" placeholder="user/repo" class="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                            <p class="mt-1 text-xs text-gray-500">用于自动获取最新版本号</p>
                        </div>
                        <div>
                             <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">背景颜色类 (Tailwind)</label>
                             <input v-model="editingClient.bgColor" type="text" class="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                        </div>
                    </div>
                </div>
            </template>
            <template #footer>
                <div class="flex justify-end gap-3">
                    <button @click="showEditModal = false" class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700">取消</button>
                    <button @click="handleSave" :disabled="saving" class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
                        {{ saving ? '保存中...' : '保存' }}
                    </button>
                </div>
            </template>
        </Modal>

        <!-- Reset Confirmation Modal -->
        <Modal v-model:show="showResetConfirm" @confirm="executeReset" title="重置确认" confirmText="确认重置" cancelText="取消" size="sm">
            <template #body>
                <div class="space-y-3">
                    <div class="flex items-center gap-3 text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-100 dark:border-amber-900/30">
                        <svg class="w-6 h-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p class="text-sm font-medium">警告：此操作不可撤销</p>
                    </div>
                    <p class="text-gray-600 dark:text-gray-300">
                        确定要重置为默认客户端列表吗？
                        <br>
                        这将<span class="font-bold text-red-600 dark:text-red-400">覆盖并丢失</span>您当前的所有自定义客户端设置。
                    </p>
                </div>
            </template>
        </Modal>

        <!-- Delete Confirmation Modal -->
        <Modal v-model:show="showDeleteConfirm" @confirm="executeDelete" title="删除确认" confirmText="确认删除" cancelText="取消" size="sm">
            <template #body>
                <div class="space-y-3">
                    <div class="flex items-center gap-3 text-red-600 dark:text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
                        <svg class="w-6 h-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p class="text-sm font-medium">警告：此操作不可撤销</p>
                    </div>
                    <p class="text-gray-600 dark:text-gray-300">
                        确定要删除此客户端吗？
                    </p>
                </div>
            </template>
        </Modal>
    </div>
</template>
