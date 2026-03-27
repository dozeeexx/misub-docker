<script setup>
import { computed, onMounted, ref } from 'vue';
import { useToastStore } from '../stores/toast.js';
import { fetchVpsNodes, createVpsNode, updateVpsNode, deleteVpsNode, fetchVpsAlerts, clearVpsAlerts, fetchVpsNodeDetail } from '../lib/api.js';
import DataGrid from '../components/shared/DataGrid.vue';
import Modal from '../components/forms/Modal.vue';
import VpsMetricChart from '../components/vps/VpsMetricChart.vue';
import VpsMonitorSettingsModal from '../components/modals/VpsMonitorSettingsModal.vue';
import { useSettingsStore } from '../stores/settings.js';

const { showToast } = useToastStore();
const { settings } = useSettingsStore();

const isLoading = ref(false);
const nodes = ref([]);
const alerts = ref([]);
const alertFilterType = ref('all');
const alertFilterQuery = ref('');

const showCreateModal = ref(false);
const showEditModal = ref(false);
const showGuideModal = ref(false);
const showDeleteModal = ref(false);
const showDetailModal = ref(false);
const showSettingsModal = ref(false);

const editingNode = ref(null);
const guidePayload = ref(null);
const detailPayload = ref(null);
const detailReports = ref([]);
const detailRange = ref('24h');
const detailAggregation = ref('avg');

const formState = ref({
  name: '',
  tag: '',
  region: '',
  description: '',
  enabled: true,
  secret: ''
});

const statusBadge = (status) => {
  if (status === 'online') return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300';
  if (status === 'offline') return 'bg-rose-500/15 text-rose-600 dark:text-rose-300';
  return 'bg-slate-500/10 text-slate-500 dark:text-slate-300';
};

const metricsBadge = (value, threshold) => {
  if (value === null || value === undefined) return 'text-slate-400';
  return value >= threshold
    ? 'text-rose-600 dark:text-rose-300'
    : 'text-emerald-600 dark:text-emerald-300';
};

const metricThresholds = {
  cpu: 90,
  mem: 90,
  disk: 90
};

const columns = computed(() => [
  { key: 'name', title: '节点', sortable: false },
  { key: 'status', title: '状态', sortable: false, align: 'center' },
  { key: 'metrics', title: '资源', sortable: false },
  { key: 'traffic', title: '流量', sortable: false },
  { key: 'lastSeenAt', title: '最近上报', sortable: false },
  { key: 'actions', title: '操作', sortable: false, align: 'right' }
]);

const loadData = async () => {
  isLoading.value = true;
  try {
    const [nodesResult, alertsResult] = await Promise.all([fetchVpsNodes(), fetchVpsAlerts()]);
    if (nodesResult.success) {
      nodes.value = nodesResult.data.data || [];
    } else {
      showToast(nodesResult.error || '加载节点失败', 'error');
    }
    if (alertsResult.success) {
      alerts.value = alertsResult.data.data || [];
    }
  } catch (error) {
    showToast(error.message || '加载数据失败', 'error');
  } finally {
    isLoading.value = false;
  }
};

const resetForm = () => {
  formState.value = {
    name: '',
    tag: '',
    region: '',
    description: '',
    enabled: true,
    secret: ''
  };
};

const openCreate = () => {
  resetForm();
  showCreateModal.value = true;
};

const openSettings = () => {
  showSettingsModal.value = true;
};

const openEdit = (node) => {
  editingNode.value = node;
  formState.value = {
    name: node.name || '',
    tag: node.tag || '',
    region: node.region || '',
    description: node.description || '',
    enabled: node.enabled !== false,
    secret: ''
  };
  showEditModal.value = true;
};

const openGuide = (node, guide) => {
  if (!guide) {
    showToast('请先重置密钥以生成安装信息', 'info');
    return;
  }
  guidePayload.value = guide;
  editingNode.value = node;
  showGuideModal.value = true;
};

const openDelete = (node) => {
  editingNode.value = node;
  showDeleteModal.value = true;
};

const openDetail = async (node) => {
  editingNode.value = node;
  detailPayload.value = null;
  detailReports.value = [];
  detailRange.value = '24h';
  detailAggregation.value = 'avg';
  showDetailModal.value = true;
  const result = await fetchVpsNodeDetail(node.id);
  if (result.success) {
    detailPayload.value = result.data.data || null;
    detailReports.value = result.data.reports || [];
  } else {
    showToast(result.error || '加载详情失败', 'error');
  }
};

const handleCreate = async () => {
  if (!formState.value.name.trim()) {
    showToast('请输入节点名称', 'warning');
    return;
  }
  const result = await createVpsNode({
    name: formState.value.name,
    tag: formState.value.tag,
    region: formState.value.region,
    description: formState.value.description,
    enabled: formState.value.enabled,
    secret: formState.value.secret
  });
  if (result.success) {
    showToast('节点已创建', 'success');
    await loadData();
    showCreateModal.value = false;
    if (result.data?.guide) {
      openGuide(result.data.data, result.data.guide);
    }
  } else {
    showToast(result.error || '创建失败', 'error');
  }
};

const handleUpdate = async () => {
  if (!editingNode.value) return;
  const payload = {
    name: formState.value.name,
    tag: formState.value.tag,
    region: formState.value.region,
    description: formState.value.description,
    enabled: formState.value.enabled
  };
  if (formState.value.secret && formState.value.secret.trim()) {
    payload.secret = formState.value.secret;
  }
  const result = await updateVpsNode(editingNode.value.id, payload);
  if (result.success) {
    showToast('节点已更新', 'success');
    await loadData();
    showEditModal.value = false;
    if (result.data?.guide) {
      openGuide(result.data.data, result.data.guide);
    }
  } else {
    showToast(result.error || '更新失败', 'error');
  }
};

const handleResetSecret = async () => {
  if (!editingNode.value) return;
  const result = await updateVpsNode(editingNode.value.id, { resetSecret: true });
  if (result.success) {
    showToast('密钥已重置', 'success');
    await loadData();
    showEditModal.value = false;
    if (result.data?.guide) {
      openGuide(result.data.data, result.data.guide);
    }
  } else {
    showToast(result.error || '重置失败', 'error');
  }
};

const handleDelete = async () => {
  if (!editingNode.value) return;
  const result = await deleteVpsNode(editingNode.value.id);
  if (result.success) {
    showToast('节点已删除', 'success');
    await loadData();
    showDeleteModal.value = false;
  } else {
    showToast(result.error || '删除失败', 'error');
  }
};

const handleClearAlerts = async () => {
  const result = await clearVpsAlerts();
  if (result.success) {
    showToast('告警已清空', 'success');
    alerts.value = [];
  } else {
    showToast(result.error || '清空失败', 'error');
  }
};

const formatTime = (value) => {
  if (!value) return '暂无';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '暂无';
  return date.toLocaleString();
};

const formatPercent = (value) => {
  if (value === null || value === undefined) return '-';
  return `${value}%`;
};

const formatTraffic = (traffic) => {
  if (!traffic) return '-';
  const rx = traffic.rx ?? traffic.download ?? traffic.in;
  const tx = traffic.tx ?? traffic.upload ?? traffic.out;
  const format = (val) => (val === null || val === undefined ? '-' : `${val}`);
  return `⬇ ${format(rx)} / ⬆ ${format(tx)}`;
};

const latestSnapshot = (node) => node.latest || node.lastReport || null;

const filteredAlerts = computed(() => {
  const keyword = alertFilterQuery.value.trim().toLowerCase();
  return alerts.value.filter((alert) => {
    if (alertFilterType.value !== 'all' && alert.type !== alertFilterType.value) {
      return false;
    }
    if (!keyword) return true;
    const content = `${alert.type || ''} ${alert.message || ''}`.toLowerCase();
    return content.includes(keyword);
  });
});

const pickSeries = (key) => {
  return buildSeries(detailReports.value, detailRange.value, (item) => item?.[key]?.usage);
};

const pickScalarSeries = (getter) => {
  return buildSeries(detailReports.value, detailRange.value, getter);
};

const detailSummary = computed(() => {
  const latest = detailReports.value[detailReports.value.length - 1];
  if (!latest) return null;
  return {
    hostname: latest.meta?.hostname || '--',
    os: latest.meta?.os || '--',
    ip: latest.meta?.publicIp || '--',
    load1: latest.load?.load1 ?? '--',
    uptimeSec: latest.uptimeSec ?? '--'
  };
});

const rangeOptions = [
  { key: '24h', label: '近24小时', bucketCount: 24, windowMs: 24 * 60 * 60 * 1000 },
  { key: '7d', label: '近7天', bucketCount: 28, windowMs: 7 * 24 * 60 * 60 * 1000 },
  { key: '30d', label: '近30天', bucketCount: 30, windowMs: 30 * 24 * 60 * 60 * 1000 }
];

const aggregationOptions = [
  { key: 'avg', label: '平均' },
  { key: 'max', label: '峰值' }
];

const rangeConfigMap = rangeOptions.reduce((acc, item) => {
  acc[item.key] = item;
  return acc;
}, {});

const resolveReportTime = (item) => {
  const raw = item?.reportedAt || item?.createdAt;
  if (!raw) return null;
  const ts = new Date(raw).getTime();
  return Number.isFinite(ts) ? ts : null;
};

const buildSeries = (reports, rangeKey, accessor) => {
  const config = rangeConfigMap[rangeKey] || rangeConfigMap['24h'];
  const now = Date.now();
  const start = now - config.windowMs;
  const bucketSize = config.windowMs / config.bucketCount;
  const sums = Array.from({ length: config.bucketCount }, () => 0);
  const counts = Array.from({ length: config.bucketCount }, () => 0);
  const peaks = Array.from({ length: config.bucketCount }, () => null);

  reports.forEach((item) => {
    const time = resolveReportTime(item);
    if (time === null || time < start || time > now) return;
    const idx = Math.min(config.bucketCount - 1, Math.max(0, Math.floor((time - start) / bucketSize)));
    const value = accessor(item);
    if (value === null || value === undefined) return;
    const num = Number(value);
    if (!Number.isFinite(num)) return;
    sums[idx] += num;
    counts[idx] += 1;
    if (peaks[idx] === null || num > peaks[idx]) {
      peaks[idx] = num;
    }
  });

  if (detailAggregation.value === 'max') {
    return peaks.map((val) => (val === null ? null : Math.round(val * 10) / 10));
  }
  return sums.map((sum, idx) => (counts[idx] ? Math.round((sum / counts[idx]) * 10) / 10 : null));
};

const rangeHint = computed(() => {
  if (detailRange.value === '24h') return '采样粒度：约 1 小时';
  if (detailRange.value === '7d') return '采样粒度：约 6 小时';
  return '采样粒度：约 1 天';
});

onMounted(loadData);
</script>

<template>
  <div class="space-y-6">
    <div class="mb-4 bg-white/80 dark:bg-gray-900/60 border border-gray-100/80 dark:border-white/10 misub-radius-lg p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">VPS 探针</h1>
        <p class="mt-1 text-sm font-medium text-gray-600 dark:text-gray-400">
          统一管理 VPS 探针节点、资源状态与告警
        </p>
        <p class="mt-2 text-xs text-amber-600 dark:text-amber-400">
          注意：VPS 探针功能需要绑定 D1 数据库（MISUB_DB）并切换存储模式为 D1。
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button
          @click="loadData"
          class="px-4 py-2 text-sm font-medium bg-white/80 text-gray-700 hover:bg-white dark:bg-gray-900/60 dark:text-gray-300 dark:hover:bg-gray-900 misub-radius-lg transition-colors border border-gray-200/80 dark:border-white/10 shadow-sm"
        >
          刷新
        </button>
        <button
          @click="openSettings"
          class="px-4 py-2 text-sm font-medium bg-white/80 text-gray-700 hover:bg-white dark:bg-gray-900/60 dark:text-gray-300 dark:hover:bg-gray-900 misub-radius-lg transition-colors border border-gray-200/80 dark:border-white/10 shadow-sm"
        >
          探针设置
        </button>
        <button
          @click="openCreate"
          class="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 misub-radius-lg transition-colors shadow-sm shadow-primary-500/20"
        >
          新增节点
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div class="xl:col-span-2 space-y-4">
        <DataGrid
          :data="nodes"
          :columns="columns"
          :loading="isLoading"
          :pagination="false"
          empty-text="暂无节点数据"
        >
          <template #column-name="{ row }">
            <div>
              <div class="text-sm font-semibold text-gray-900 dark:text-white">{{ row.name }}</div>
              <div class="text-xs text-gray-500 dark:text-gray-400" v-if="row.tag || row.region">
                <span v-if="row.tag">{{ row.tag }}</span>
                <span v-if="row.tag && row.region"> · </span>
                <span v-if="row.region">{{ row.region }}</span>
              </div>
              <div class="text-xs text-gray-400" v-if="row.description">{{ row.description }}</div>
            </div>
          </template>
          <template #column-status="{ row }">
            <span
              class="px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1"
              :class="statusBadge(row.status)"
            >
              <span class="w-1.5 h-1.5 rounded-full" :class="row.status === 'online' ? 'bg-emerald-500' : 'bg-rose-500'"></span>
              {{ row.status === 'online' ? '在线' : '离线' }}
            </span>
          </template>
          <template #column-metrics="{ row }">
            <div class="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <div>
                CPU <span :class="metricsBadge(latestSnapshot(row)?.cpuPercent, metricThresholds.cpu)">{{ formatPercent(latestSnapshot(row)?.cpuPercent) }}</span>
              </div>
              <div>
                内存 <span :class="metricsBadge(latestSnapshot(row)?.memPercent, metricThresholds.mem)">{{ formatPercent(latestSnapshot(row)?.memPercent) }}</span>
              </div>
              <div>
                磁盘 <span :class="metricsBadge(latestSnapshot(row)?.diskPercent, metricThresholds.disk)">{{ formatPercent(latestSnapshot(row)?.diskPercent) }}</span>
              </div>
            </div>
          </template>
          <template #column-traffic="{ row }">
            <div class="text-xs text-gray-500 dark:text-gray-400">
              {{ formatTraffic(latestSnapshot(row)?.traffic) }}
            </div>
          </template>
          <template #column-lastSeenAt="{ row }">
            <div class="text-xs text-gray-500 dark:text-gray-400">
              {{ formatTime(row.lastSeenAt) }}
            </div>
          </template>
          <template #column-actions="{ row }">
            <div class="flex items-center justify-end gap-2">
              <button
                class="px-2.5 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5"
                @click.stop="openGuide(row, row.guide)"
              >
                安装
              </button>
              <button
                class="px-2.5 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-500/20 rounded-lg hover:bg-indigo-50/40 dark:hover:bg-indigo-500/10"
                @click.stop="openEdit(row)"
              >
                编辑
              </button>
              <button
                class="px-2.5 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5"
                @click.stop="openDetail(row)"
              >
                详情
              </button>
              <button
                class="px-2.5 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-300 border border-rose-200/60 dark:border-rose-500/20 rounded-lg hover:bg-rose-50/40 dark:hover:bg-rose-500/10"
                @click.stop="openDelete(row)"
              >
                删除
              </button>
            </div>
          </template>
        </DataGrid>
      </div>

      <div class="space-y-4">
        <div class="bg-white/90 dark:bg-gray-900/70 misub-radius-lg p-5 border border-gray-100/80 dark:border-white/10 shadow-sm">
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold text-gray-900 dark:text-white">告警动态</h3>
            <button
              class="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              @click="handleClearAlerts"
              v-if="alerts.length"
            >
              清空
            </button>
          </div>
          <div class="mt-3 space-y-3" v-if="alerts.length">
            <div class="flex flex-wrap gap-2">
              <select
                v-model="alertFilterType"
                class="px-2.5 py-1.5 text-xs bg-white/80 dark:bg-gray-900/70 border border-gray-200/60 dark:border-white/10 rounded-lg"
              >
                <option value="all">全部类型</option>
                <option value="offline">离线</option>
                <option value="recovery">恢复</option>
                <option value="overload">负载</option>
              </select>
              <input
                v-model="alertFilterQuery"
                placeholder="搜索节点或关键词"
                class="flex-1 min-w-[160px] px-2.5 py-1.5 text-xs bg-white/80 dark:bg-gray-900/70 border border-gray-200/60 dark:border-white/10 rounded-lg"
              />
            </div>
            <div
              v-for="alert in filteredAlerts.slice().reverse().slice(0, 6)"
              :key="alert.id"
              class="p-3 bg-gray-50 dark:bg-gray-900/60 border border-gray-200/60 dark:border-white/10 rounded-lg text-xs text-gray-600 dark:text-gray-300"
            >
              <div class="font-medium mb-1">{{ alert.type }}</div>
              <div class="text-[11px] whitespace-pre-line">{{ alert.message }}</div>
            </div>
          </div>
          <div v-else class="text-xs text-gray-500 dark:text-gray-400 mt-3">
            暂无告警记录
          </div>
        </div>

        <div class="bg-gradient-to-br from-indigo-500/15 via-sky-500/10 to-emerald-500/10 dark:from-indigo-500/10 dark:via-sky-500/5 dark:to-emerald-500/5 misub-radius-lg p-5 border border-white/30 dark:border-white/10">
          <h3 class="text-base font-semibold text-gray-900 dark:text-white">探针上报说明</h3>
          <p class="text-xs text-gray-600 dark:text-gray-400 mt-2">
            新增节点后复制上报 URL 和密钥到 VPS 探针脚本，保持定时上报即可。
          </p>
          <ul class="mt-3 text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <li>• 建议上报频率：60 秒</li>
            <li>• 支持 CPU/内存/磁盘/流量/负载信息</li>
            <li>• 告警推送复用 Telegram 通知配置</li>
          </ul>
        </div>
      </div>
    </div>
  </div>

  <Modal v-model:show="showCreateModal" @confirm="handleCreate" confirm-text="创建" cancel-text="取消">
    <template #title>
      <h3 class="text-lg font-bold text-gray-900 dark:text-white">新增 VPS 节点</h3>
    </template>
    <template #body>
      <div class="space-y-3">
        <div>
          <label class="block text-sm text-gray-600 dark:text-gray-300 mb-1">节点名称</label>
          <input v-model="formState.name" class="w-full px-3 py-2 bg-white/80 dark:bg-gray-900/60 border border-gray-200/80 dark:border-white/10 rounded-lg text-sm" />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-sm text-gray-600 dark:text-gray-300 mb-1">标签</label>
            <input v-model="formState.tag" class="w-full px-3 py-2 bg-white/80 dark:bg-gray-900/60 border border-gray-200/80 dark:border-white/10 rounded-lg text-sm" />
          </div>
          <div>
            <label class="block text-sm text-gray-600 dark:text-gray-300 mb-1">地区</label>
            <input v-model="formState.region" class="w-full px-3 py-2 bg-white/80 dark:bg-gray-900/60 border border-gray-200/80 dark:border-white/10 rounded-lg text-sm" />
          </div>
        </div>
        <div>
          <label class="block text-sm text-gray-600 dark:text-gray-300 mb-1">描述</label>
          <textarea v-model="formState.description" rows="2" class="w-full px-3 py-2 bg-white/80 dark:bg-gray-900/60 border border-gray-200/80 dark:border-white/10 rounded-lg text-sm"></textarea>
        </div>
        <div>
          <label class="block text-sm text-gray-600 dark:text-gray-300 mb-1">自定义密钥（可选）</label>
          <input v-model="formState.secret" class="w-full px-3 py-2 bg-white/80 dark:bg-gray-900/60 border border-gray-200/80 dark:border-white/10 rounded-lg text-sm" />
        </div>
        <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <input type="checkbox" v-model="formState.enabled" class="rounded border-gray-300" />
          启用节点
        </div>
      </div>
    </template>
  </Modal>

  <Modal v-model:show="showEditModal" @confirm="handleUpdate" confirm-text="保存" cancel-text="取消">
    <template #title>
      <h3 class="text-lg font-bold text-gray-900 dark:text-white">编辑 VPS 节点</h3>
    </template>
    <template #body>
      <div class="space-y-3">
        <div>
          <label class="block text-sm text-gray-600 dark:text-gray-300 mb-1">节点名称</label>
          <input v-model="formState.name" class="w-full px-3 py-2 bg-white/80 dark:bg-gray-900/60 border border-gray-200/80 dark:border-white/10 rounded-lg text-sm" />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-sm text-gray-600 dark:text-gray-300 mb-1">标签</label>
            <input v-model="formState.tag" class="w-full px-3 py-2 bg-white/80 dark:bg-gray-900/60 border border-gray-200/80 dark:border-white/10 rounded-lg text-sm" />
          </div>
          <div>
            <label class="block text-sm text-gray-600 dark:text-gray-300 mb-1">地区</label>
            <input v-model="formState.region" class="w-full px-3 py-2 bg-white/80 dark:bg-gray-900/60 border border-gray-200/80 dark:border-white/10 rounded-lg text-sm" />
          </div>
        </div>
        <div>
          <label class="block text-sm text-gray-600 dark:text-gray-300 mb-1">描述</label>
          <textarea v-model="formState.description" rows="2" class="w-full px-3 py-2 bg-white/80 dark:bg-gray-900/60 border border-gray-200/80 dark:border-white/10 rounded-lg text-sm"></textarea>
        </div>
        <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <input type="checkbox" v-model="formState.enabled" class="rounded border-gray-300" />
          启用节点
        </div>
        <div class="pt-2 border-t border-gray-200/80 dark:border-white/10">
          <button
            type="button"
            class="text-xs text-rose-600 dark:text-rose-300"
            @click="handleResetSecret"
          >
            重新生成密钥并显示安装信息
          </button>
        </div>
      </div>
    </template>
  </Modal>

  <Modal v-model:show="showGuideModal" :confirm-disabled="true" cancel-text="关闭">
    <template #title>
      <h3 class="text-lg font-bold text-gray-900 dark:text-white">探针安装信息</h3>
    </template>
    <template #body>
      <div v-if="guidePayload" class="space-y-4 text-sm text-gray-600 dark:text-gray-300">
        <div>
          <label class="block text-xs text-gray-500 mb-1">上报地址</label>
          <div class="font-mono text-xs bg-gray-100/70 dark:bg-gray-900/60 border border-gray-200/80 dark:border-white/10 rounded-lg px-3 py-2">
            {{ guidePayload.reportUrl }}
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs text-gray-500 mb-1">节点 ID</label>
            <div class="font-mono text-xs bg-gray-100/70 dark:bg-gray-900/60 border border-gray-200/80 dark:border-white/10 rounded-lg px-3 py-2">
              {{ guidePayload.nodeId }}
            </div>
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">节点密钥</label>
            <div class="font-mono text-xs bg-gray-100/70 dark:bg-gray-900/60 border border-gray-200/80 dark:border-white/10 rounded-lg px-3 py-2">
              {{ guidePayload.nodeSecret }}
            </div>
          </div>
        </div>
        <div>
          <label class="block text-xs text-gray-500 mb-1">请求头</label>
          <pre class="text-xs bg-gray-100/70 dark:bg-gray-900/60 border border-gray-200/80 dark:border-white/10 rounded-lg px-3 py-2 overflow-auto">{{ JSON.stringify(guidePayload.headers, null, 2) }}</pre>
        </div>
        <div>
          <label class="block text-xs text-gray-500 mb-1">一键安装脚本</label>
          <pre class="text-xs bg-gray-100/70 dark:bg-gray-900/60 border border-gray-200/80 dark:border-white/10 rounded-lg px-3 py-2 overflow-auto">{{ guidePayload.installScript }}</pre>
        </div>
        <div>
          <label class="block text-xs text-gray-500 mb-1">一行安装命令</label>
          <pre class="text-xs bg-gray-100/70 dark:bg-gray-900/60 border border-gray-200/80 dark:border-white/10 rounded-lg px-3 py-2 overflow-auto">{{ guidePayload.installCommand }}</pre>
        </div>
      </div>
      <div v-else class="text-sm text-gray-500">暂无安装信息</div>
    </template>
  </Modal>

  <Modal v-model:show="showDeleteModal" @confirm="handleDelete" confirm-text="删除" cancel-text="取消">
    <template #title>
      <h3 class="text-lg font-bold text-rose-600">确认删除节点</h3>
    </template>
    <template #body>
      <p class="text-sm text-gray-600 dark:text-gray-300">
        确定删除 {{ editingNode?.name || '该节点' }} 吗？相关上报数据会一并清除。
      </p>
    </template>
  </Modal>

  <Modal v-model:show="showDetailModal" size="5xl" confirm-text="关闭" cancel-text="关闭" :confirm-disabled="true">
    <template #title>
      <h3 class="text-lg font-bold text-gray-900 dark:text-white">节点详情</h3>
    </template>
    <template #body>
      <div v-if="detailPayload" class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-white/70 dark:bg-gray-900/60 border border-gray-200/60 dark:border-white/10 rounded-xl p-4">
            <div class="text-xs text-gray-500">主机名</div>
            <div class="text-sm font-semibold text-gray-900 dark:text-white mt-1">{{ detailSummary?.hostname }}</div>
          </div>
          <div class="bg-white/70 dark:bg-gray-900/60 border border-gray-200/60 dark:border-white/10 rounded-xl p-4">
            <div class="text-xs text-gray-500">系统</div>
            <div class="text-sm font-semibold text-gray-900 dark:text-white mt-1">{{ detailSummary?.os }}</div>
          </div>
          <div class="bg-white/70 dark:bg-gray-900/60 border border-gray-200/60 dark:border-white/10 rounded-xl p-4">
            <div class="text-xs text-gray-500">公网 IP</div>
            <div class="text-sm font-semibold text-gray-900 dark:text-white mt-1">{{ detailSummary?.ip }}</div>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bg-white/70 dark:bg-gray-900/60 border border-gray-200/60 dark:border-white/10 rounded-xl p-4">
            <div class="text-xs text-gray-500">Load1</div>
            <div class="text-sm font-semibold text-gray-900 dark:text-white mt-1">{{ detailSummary?.load1 }}</div>
          </div>
          <div class="bg-white/70 dark:bg-gray-900/60 border border-gray-200/60 dark:border-white/10 rounded-xl p-4">
            <div class="text-xs text-gray-500">运行时长 (秒)</div>
            <div class="text-sm font-semibold text-gray-900 dark:text-white mt-1">{{ detailSummary?.uptimeSec }}</div>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-xs text-gray-500">范围</span>
            <button
              v-for="option in rangeOptions"
              :key="option.key"
              type="button"
              class="px-3 py-1.5 text-xs rounded-full border transition-colors"
              :class="detailRange === option.key
                ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                : 'border-gray-200/70 dark:border-white/10 text-gray-500 hover:text-gray-700 dark:text-gray-400'"
              @click="detailRange = option.key"
            >
              {{ option.label }}
            </button>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-xs text-gray-500">模式</span>
            <button
              v-for="option in aggregationOptions"
              :key="option.key"
              type="button"
              class="px-3 py-1.5 text-xs rounded-full border transition-colors"
              :class="detailAggregation === option.key
                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                : 'border-gray-200/70 dark:border-white/10 text-gray-500 hover:text-gray-700 dark:text-gray-400'"
              @click="detailAggregation = option.key"
            >
              {{ option.label }}
            </button>
          </div>
          <span class="text-xs text-gray-400">{{ rangeHint }}</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <VpsMetricChart title="CPU" unit="%" :points="pickSeries('cpu')" color="#f97316" />
          <VpsMetricChart title="内存" unit="%" :points="pickSeries('mem')" color="#3b82f6" />
          <VpsMetricChart title="磁盘" unit="%" :points="pickSeries('disk')" color="#22c55e" />
          <VpsMetricChart title="Load1" unit="" :max="5" :points="pickScalarSeries(item => item?.load?.load1 ?? null)" color="#6366f1" />
        </div>
      </div>
      <div v-else class="text-sm text-gray-500">正在加载...</div>
    </template>
  </Modal>

  <VpsMonitorSettingsModal v-model:show="showSettingsModal" :settings="settings" />
</template>
