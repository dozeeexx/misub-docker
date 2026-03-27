<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { fetchVpsPublicSnapshot } from '../lib/api.js';
import VpsMetricChart from '../components/vps/VpsMetricChart.vue';

const route = useRoute();

const loading = ref(true);
const error = ref('');
const nodes = ref([]);
const lastUpdatedAt = ref('');

const statusSummary = computed(() => {
  const total = nodes.value.length;
  const online = nodes.value.filter((n) => n.status === 'online').length;
  const offline = total - online;
  return { total, online, offline };
});

const topNodes = computed(() => {
  return [...nodes.value]
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'online' ? -1 : 1;
      return (a.name || '').localeCompare(b.name || '');
    })
    .slice(0, 6);
});

const loadSnapshot = async () => {
  loading.value = true;
  error.value = '';
  const token = typeof route.query?.token === 'string' ? route.query.token : '';
  const result = await fetchVpsPublicSnapshot(token);
  if (result.success) {
    nodes.value = result.data?.data || [];
    lastUpdatedAt.value = new Date().toLocaleString();
  } else {
    error.value = result.error || '加载失败';
  }
  loading.value = false;
};

const formatPercent = (val) => (val === null || val === undefined ? '--' : `${val}%`);
const formatTraffic = (traffic) => {
  if (!traffic) return '--';
  const rx = traffic.rx ?? traffic.download ?? traffic.in;
  const tx = traffic.tx ?? traffic.upload ?? traffic.out;
  const format = (value) => (value === null || value === undefined ? '--' : value);
  return `⬇ ${format(rx)} / ⬆ ${format(tx)}`;
};

onMounted(() => {
  loadSnapshot();
});
</script>

<template>
  <div class="min-h-screen bg-[#f4f6fb] dark:bg-[#05070f]">
    <div class="relative overflow-hidden">
      <div class="absolute inset-0">
        <div class="absolute -top-32 -left-24 w-[420px] h-[420px] rounded-full bg-gradient-to-br from-amber-400/40 via-sky-400/20 to-emerald-400/20 blur-3xl"></div>
        <div class="absolute -bottom-32 -right-24 w-[420px] h-[420px] rounded-full bg-gradient-to-br from-rose-400/30 via-indigo-400/20 to-cyan-400/20 blur-3xl"></div>
      </div>
      <div class="relative max-w-6xl mx-auto px-6 pt-16 pb-10">
        <div class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p class="text-xs font-semibold tracking-[0.3em] text-slate-500">VPS STATUS</p>
            <h1 class="mt-3 text-3xl md:text-4xl font-semibold text-slate-900 dark:text-white">
              探针总览 · 实时守护
            </h1>
            <p class="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-xl">
              公开展示 VPS 节点状态、资源负载与网络质量，便于对外展示稳定性与可用性。
            </p>
          </div>
          <div class="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span class="px-3 py-1 rounded-full bg-white/80 dark:bg-slate-900/70 border border-white/60 dark:border-white/10">
              更新时间 {{ lastUpdatedAt || '--' }}
            </span>
            <button
              class="px-3 py-1 rounded-full border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-slate-900/70 text-slate-600 dark:text-slate-300"
              @click="loadSnapshot"
            >
              刷新
            </button>
          </div>
        </div>

        <div class="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="rounded-2xl p-5 border border-white/70 dark:border-white/10 bg-white/80 dark:bg-slate-900/70 shadow-lg shadow-slate-200/40 dark:shadow-black/40">
            <p class="text-xs text-slate-500">节点总数</p>
            <p class="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{{ statusSummary.total }}</p>
          </div>
          <div class="rounded-2xl p-5 border border-emerald-200/70 dark:border-emerald-500/20 bg-emerald-50/80 dark:bg-emerald-500/10 shadow-lg shadow-emerald-200/40">
            <p class="text-xs text-emerald-700">在线节点</p>
            <p class="mt-2 text-2xl font-semibold text-emerald-900 dark:text-emerald-200">{{ statusSummary.online }}</p>
          </div>
          <div class="rounded-2xl p-5 border border-rose-200/70 dark:border-rose-500/20 bg-rose-50/80 dark:bg-rose-500/10 shadow-lg shadow-rose-200/40">
            <p class="text-xs text-rose-700">离线节点</p>
            <p class="mt-2 text-2xl font-semibold text-rose-900 dark:text-rose-200">{{ statusSummary.offline }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-6xl mx-auto px-6 pb-16">
      <div v-if="loading" class="py-16 text-center text-sm text-slate-500">正在加载探针数据...</div>
      <div v-else-if="error" class="py-16 text-center text-sm text-rose-500">{{ error }}</div>
      <div v-else class="space-y-6">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="rounded-3xl border border-white/70 dark:border-white/10 bg-white/80 dark:bg-slate-900/70 p-6 shadow-xl shadow-slate-200/40">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold text-slate-900 dark:text-white">在线节点</h2>
              <span class="text-xs text-slate-500">展示前 6 个节点</span>
            </div>
            <div class="mt-4 space-y-3">
              <div v-for="node in topNodes" :key="node.id" class="flex items-center justify-between rounded-2xl border border-slate-100 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 p-4">
                <div>
                  <p class="text-sm font-semibold text-slate-900 dark:text-white">{{ node.name || node.id }}</p>
                  <p class="text-xs text-slate-500">{{ node.tag || '--' }} · {{ node.region || '未知地区' }}</p>
                </div>
                <div class="text-right text-xs">
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full border"
                    :class="node.status === 'online'
                      ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                      : 'border-rose-200 text-rose-700 bg-rose-50'"
                  >
                    {{ node.status === 'online' ? '在线' : '离线' }}
                  </span>
                  <p class="mt-2 text-slate-500">CPU {{ formatPercent(node.latest?.cpu?.usage ?? node.latest?.cpuPercent) }}</p>
                  <p class="text-slate-500">内存 {{ formatPercent(node.latest?.mem?.usage ?? node.latest?.memPercent) }}</p>
                </div>
              </div>
            </div>
          </div>
          <div class="rounded-3xl border border-white/70 dark:border-white/10 bg-gradient-to-br from-white/90 via-white/80 to-slate-50/80 dark:from-slate-900/80 dark:via-slate-900/70 dark:to-slate-800/70 p-6 shadow-xl shadow-slate-200/40">
            <h2 class="text-lg font-semibold text-slate-900 dark:text-white">最新资源快照</h2>
            <div class="mt-5 grid grid-cols-2 gap-4">
              <VpsMetricChart title="CPU" unit="%" :points="nodes.map(node => node.latest?.cpu?.usage ?? node.latest?.cpuPercent ?? null)" color="#0ea5e9" :height="70" />
              <VpsMetricChart title="内存" unit="%" :points="nodes.map(node => node.latest?.mem?.usage ?? node.latest?.memPercent ?? null)" color="#f59e0b" :height="70" />
              <VpsMetricChart title="磁盘" unit="%" :points="nodes.map(node => node.latest?.disk?.usage ?? node.latest?.diskPercent ?? null)" color="#22c55e" :height="70" />
              <VpsMetricChart title="流量" unit="" :points="nodes.map(node => node.latest?.traffic?.rx ?? node.latest?.traffic?.download ?? null)" color="#6366f1" :height="70" />
            </div>
          </div>
        </div>

        <div class="rounded-3xl border border-white/70 dark:border-white/10 bg-white/80 dark:bg-slate-900/70 p-6 shadow-xl shadow-slate-200/40">
          <h2 class="text-lg font-semibold text-slate-900 dark:text-white">节点列表</h2>
          <div class="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <div v-for="node in nodes" :key="node.id" class="rounded-2xl border border-slate-100 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 p-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-semibold text-slate-900 dark:text-white">{{ node.name || node.id }}</p>
                  <p class="text-xs text-slate-500">{{ node.tag || '--' }} · {{ node.region || '未知地区' }}</p>
                </div>
                <span class="inline-flex items-center px-2 py-0.5 rounded-full border"
                  :class="node.status === 'online'
                    ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                    : 'border-rose-200 text-rose-700 bg-rose-50'"
                >
                  {{ node.status === 'online' ? '在线' : '离线' }}
                </span>
              </div>
              <div class="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
                <div>CPU {{ formatPercent(node.latest?.cpu?.usage ?? node.latest?.cpuPercent) }}</div>
                <div>内存 {{ formatPercent(node.latest?.mem?.usage ?? node.latest?.memPercent) }}</div>
                <div>磁盘 {{ formatPercent(node.latest?.disk?.usage ?? node.latest?.diskPercent) }}</div>
                <div>流量 {{ formatTraffic(node.latest?.traffic) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
