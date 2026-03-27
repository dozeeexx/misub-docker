<script setup>
import { computed, ref } from 'vue';
import { createVpsNetworkTarget, updateVpsNetworkTarget, deleteVpsNetworkTarget } from '../../lib/api.js';
import { useToastStore } from '../../stores/toast.js';

const props = defineProps({
  nodeId: {
    type: String,
    required: true
  },
  targets: {
    type: Array,
    default: () => []
  },
  limit: {
    type: Number,
    default: 3
  }
});

const emit = defineEmits(['refresh', 'check']);
const { showToast } = useToastStore();

const formState = ref({
  type: 'icmp',
  target: '',
  port: '',
  path: '/'
});

const canAddMore = computed(() => props.targets.length < props.limit);

const resetForm = () => {
  formState.value = { type: 'icmp', target: '', port: '', path: '/' };
};

const handleCreate = async () => {
  if (!formState.value.target.trim()) {
    showToast('请输入目标地址', 'warning');
    return;
  }
  const payload = {
    type: formState.value.type,
    target: formState.value.target,
    port: formState.value.type === 'tcp' ? Number(formState.value.port) : undefined,
    path: formState.value.type === 'http' ? formState.value.path || '/' : undefined
  };
  const result = await createVpsNetworkTarget(props.nodeId, payload);
  if (result.success) {
    showToast('目标已添加', 'success');
    resetForm();
    emit('refresh');
  } else {
    showToast(result.error || '添加失败', 'error');
  }
};

const handleToggle = async (target) => {
  const result = await updateVpsNetworkTarget(props.nodeId, { id: target.id, enabled: !target.enabled });
  if (result.success) {
    emit('refresh');
  } else {
    showToast(result.error || '更新失败', 'error');
  }
};

const handleDelete = async (target) => {
  const result = await deleteVpsNetworkTarget(props.nodeId, target.id);
  if (result.success) {
    showToast('目标已删除', 'success');
    emit('refresh');
  } else {
    showToast(result.error || '删除失败', 'error');
  }
};

const handleCheck = (target) => {
  emit('check', target);
};
</script>

<template>
  <div class="bg-white/90 dark:bg-gray-900/70 misub-radius-lg p-5 border border-gray-100/80 dark:border-white/10 space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h4 class="text-sm font-semibold text-gray-900 dark:text-white">网络监测目标</h4>
        <p class="text-xs text-gray-500 dark:text-gray-400">支持 ICMP / TCP / HTTP</p>
      </div>
      <span class="text-xs text-gray-400">{{ targets.length }}/{{ limit }}</span>
    </div>

    <div class="space-y-2" v-if="targets.length">
      <div
        v-for="item in targets"
        :key="item.id"
        class="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-200/70 dark:border-white/10 bg-white/70 dark:bg-gray-900/60"
      >
        <div>
          <div class="text-sm font-medium text-gray-900 dark:text-white">
            {{ item.type.toUpperCase() }} · {{ item.target }}
            <span v-if="item.port">:{{ item.port }}</span>
            <span v-if="item.path">{{ item.path }}</span>
          </div>
          <div class="text-xs text-gray-500">{{ item.enabled ? '启用' : '停用' }}</div>
        </div>
        <div class="flex items-center gap-2">
          <button
            class="px-2.5 py-1.5 text-xs border border-gray-200 dark:border-white/10 rounded-lg"
            @click="handleCheck(item)"
          >
            立即检测
          </button>
          <button
            class="px-2.5 py-1.5 text-xs border border-gray-200 dark:border-white/10 rounded-lg"
            @click="handleToggle(item)"
          >
            {{ item.enabled ? '停用' : '启用' }}
          </button>
          <button
            class="px-2.5 py-1.5 text-xs text-rose-600 dark:text-rose-300 border border-rose-200/60 dark:border-rose-500/20 rounded-lg"
            @click="handleDelete(item)"
          >
            删除
          </button>
        </div>
      </div>
    </div>

    <div class="space-y-2" v-if="canAddMore">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-2">
        <select v-model="formState.type" class="px-3 py-2 text-xs bg-white/80 dark:bg-gray-900/60 border border-gray-200/80 dark:border-white/10 rounded-lg">
          <option value="icmp">ICMP</option>
          <option value="tcp">TCP</option>
          <option value="http">HTTP</option>
        </select>
        <input v-model="formState.target" placeholder="IP 或域名" class="px-3 py-2 text-xs bg-white/80 dark:bg-gray-900/60 border border-gray-200/80 dark:border-white/10 rounded-lg" />
        <input v-if="formState.type === 'tcp'" v-model="formState.port" placeholder="端口" class="px-3 py-2 text-xs bg-white/80 dark:bg-gray-900/60 border border-gray-200/80 dark:border-white/10 rounded-lg" />
        <input v-if="formState.type === 'http'" v-model="formState.path" placeholder="路径" class="px-3 py-2 text-xs bg-white/80 dark:bg-gray-900/60 border border-gray-200/80 dark:border-white/10 rounded-lg" />
        <button
          class="px-3 py-2 text-xs text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
          @click="handleCreate"
        >
          添加目标
        </button>
      </div>
    </div>
    <div v-else class="text-xs text-gray-500">已达到目标上限</div>
  </div>
</template>
