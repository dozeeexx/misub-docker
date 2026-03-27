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

const onlineRate = computed(() => {
  if (!statusSummary.value.total) return 0;
  return Math.round((statusSummary.value.online / statusSummary.value.total) * 100);
});

const topNodes = computed(() => {
  return [...nodes.value]
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'online' ? -1 : 1;
      return (a.name || '').localeCompare(b.name || '');
    })
    .slice(0, 6);
});

const sortedNodes = computed(() => {
  return [...nodes.value].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'online' ? -1 : 1;
    return (a.name || '').localeCompare(b.name || '');
  });
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
const formatLoad = (val) => (val === null || val === undefined ? '--' : Number(val).toFixed(2));
const formatTraffic = (traffic) => {
  if (!traffic) return '--';
  const rx = traffic.rx ?? traffic.download ?? traffic.in;
  const tx = traffic.tx ?? traffic.upload ?? traffic.out;
  const format = (value) => (value === null || value === undefined ? '--' : value);
  return `⬇ ${format(rx)} / ⬆ ${format(tx)}`;
};

const formatUptime = (seconds) => {
  const total = Number(seconds);
  if (!Number.isFinite(total)) return '--';
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const mins = Math.floor((total % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
};

const averageMetric = (selector) => {
  const values = nodes.value
    .map(selector)
    .filter((val) => Number.isFinite(Number(val)))
    .map(Number);
  if (!values.length) return null;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return Math.round(sum / values.length);
};

const avgCpu = computed(() => averageMetric(node => node.latest?.cpu?.usage ?? node.latest?.cpuPercent));
const avgMem = computed(() => averageMetric(node => node.latest?.mem?.usage ?? node.latest?.memPercent));
const avgDisk = computed(() => averageMetric(node => node.latest?.disk?.usage ?? node.latest?.diskPercent));
const avgLoad = computed(() => {
  const values = nodes.value
    .map(node => node.latest?.load1 ?? node.latest?.load?.load1)
    .filter((val) => Number.isFinite(Number(val)))
    .map(Number);
  if (!values.length) return null;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return (sum / values.length).toFixed(2);
});

onMounted(() => {
  loadSnapshot();
});
</script>

<template>
  <div class="min-h-screen bg-[#f7f6f1] dark:bg-[#0a0d14]">
    <div class="relative overflow-hidden">
      <div class="absolute inset-0">
        <div class="absolute -top-24 left-10 h-72 w-72 rounded-full bg-gradient-to-br from-[#0ea5e9]/35 via-[#2dd4bf]/20 to-[#f97316]/25 blur-3xl"></div>
        <div class="absolute top-24 right-10 h-64 w-64 rounded-full bg-gradient-to-br from-[#f97316]/30 via-[#22c55e]/20 to-[#38bdf8]/25 blur-3xl"></div>
        <div class="absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-gradient-to-br from-[#f59e0b]/25 via-[#22c55e]/20 to-[#0ea5e9]/20 blur-3xl"></div>
        <div class="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#f7f6f1] dark:from-[#0a0d14] to-transparent"></div>
        <div class="absolute inset-0 bg-[radial-gradient(circle_at_top,#ffffff60,transparent_55%)] dark:bg-[radial-gradient(circle_at_top,#1e293b66,transparent_55%)]"></div>
      </div>
      <div class="relative max-w-6xl mx-auto px-6 pt-16 pb-12">
        <div class="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div class="max-w-2xl">
            <div class="inline-flex items-center gap-2 rounded-full border border-[#e7e1d6] bg-white/80 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-[#8a7f70] dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-300">
              Status Observatory
            </div>
            <h1 class="mt-4 text-4xl md:text-5xl font-semibold text-[#1f1b17] dark:text-slate-100">
              VPS 探针公开视图
            </h1>
            <p class="mt-3 text-sm md:text-base text-[#6a5f54] dark:text-slate-400">
              对外展示节点健康、资源负载与在线率。所有关键指标以清晰、可信的方式汇总呈现。
            </p>
            <div class="mt-6 flex flex-wrap items-center gap-3 text-xs text-[#6a5f54] dark:text-slate-400">
              <span class="inline-flex items-center gap-2 rounded-full border border-[#e7e1d6] bg-white/80 px-3 py-1 dark:border-slate-700/60 dark:bg-slate-900/70">
                更新时间 {{ lastUpdatedAt || '--' }}
              </span>
              <button
                class="inline-flex items-center gap-2 rounded-full border border-[#d9cdbd] bg-[#1f1b17] px-4 py-1 text-white shadow-lg shadow-[#1f1b17]/20 hover:shadow-xl dark:border-slate-700/60 dark:bg-slate-100 dark:text-slate-900 dark:shadow-slate-900/30"
                @click="loadSnapshot"
              >
                刷新数据
              </button>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4 text-xs">
            <div class="rounded-2xl border border-[#ebe3d8] bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
              <p class="text-[#8a7f70] dark:text-slate-400">节点总数</p>
              <p class="mt-2 text-2xl font-semibold text-[#1f1b17] dark:text-slate-100">{{ statusSummary.total }}</p>
            </div>
            <div class="rounded-2xl border border-[#d1fae5] bg-[#ecfdf3] p-4 shadow-sm dark:border-emerald-500/30 dark:bg-emerald-500/10">
              <p class="text-[#087f5b] dark:text-emerald-300">在线节点</p>
              <p class="mt-2 text-2xl font-semibold text-[#064e3b] dark:text-emerald-200">{{ statusSummary.online }}</p>
            </div>
            <div class="rounded-2xl border border-[#fee2e2] bg-[#fef2f2] p-4 shadow-sm dark:border-rose-500/30 dark:bg-rose-500/10">
              <p class="text-[#b91c1c] dark:text-rose-300">离线节点</p>
              <p class="mt-2 text-2xl font-semibold text-[#7f1d1d] dark:text-rose-200">{{ statusSummary.offline }}</p>
            </div>
            <div class="rounded-2xl border border-[#e0e7ff] bg-[#eef2ff] p-4 shadow-sm dark:border-sky-500/30 dark:bg-sky-500/10">
              <p class="text-[#3730a3] dark:text-sky-300">在线率</p>
              <p class="mt-2 text-2xl font-semibold text-[#312e81] dark:text-sky-200">{{ onlineRate }}%</p>
            </div>
          </div>
        </div>
        <div class="mt-8 rounded-[24px] border border-[#ebe3d8] bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <div class="h-2 w-24 rounded-full bg-[#efe6db] dark:bg-slate-800">
                <div class="h-2 rounded-full bg-gradient-to-r from-emerald-500 via-sky-400 to-amber-400" :style="{ width: onlineRate + '%' }"></div>
              </div>
              <span class="text-xs text-[#8a7f70] dark:text-slate-400">在线率趋势</span>
            </div>
            <div class="flex flex-wrap items-center gap-2 text-[11px]">
              <span class="px-2 py-1 rounded-full border border-[#efe6db] bg-[#fdfaf6] text-[#6a5f54] dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">CPU ≤ 85%</span>
              <span class="px-2 py-1 rounded-full border border-[#efe6db] bg-[#fdfaf6] text-[#6a5f54] dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">内存 ≤ 90%</span>
              <span class="px-2 py-1 rounded-full border border-[#efe6db] bg-[#fdfaf6] text-[#6a5f54] dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">响应稳定</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-6xl mx-auto px-6 pb-16">
      <div v-if="loading" class="py-16 text-center text-sm text-[#8a7f70] dark:text-slate-400">正在加载探针数据...</div>
      <div v-else-if="error" class="py-16 text-center text-sm text-rose-600 dark:text-rose-300">{{ error }}</div>
      <div v-else class="space-y-10">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="rounded-[28px] border border-[#ebe3d8] bg-white/90 p-6 shadow-xl shadow-[#d8cab8]/30 lg:col-span-2 dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-black/40">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold text-[#1f1b17] dark:text-slate-100">重点节点</h2>
              <span class="text-xs text-[#8a7f70] dark:text-slate-400">按在线优先展示</span>
            </div>
            <div class="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div v-for="node in topNodes" :key="node.id" class="rounded-2xl border border-[#efe6db] bg-[#fdfaf6] p-4 dark:border-slate-800 dark:bg-slate-900/60">
                <div class="flex items-start justify-between">
                  <div>
                    <p class="text-sm font-semibold text-[#1f1b17] dark:text-slate-100">{{ node.name || node.id }}</p>
                    <p class="text-xs text-[#8a7f70] dark:text-slate-400">{{ node.tag || '--' }} · {{ node.region || '未知地区' }}</p>
                  </div>
                  <span class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]"
                    :class="node.status === 'online'
                      ? 'border-[#bbf7d0] bg-[#ecfdf3] text-[#0f766e] dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300'
                      : 'border-[#fecdd3] bg-[#fff1f2] text-[#be123c] dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-300'"
                  >
                    {{ node.status === 'online' ? '在线' : '离线' }}
                  </span>
                </div>
                <div class="mt-4 grid grid-cols-2 gap-2 text-[11px] text-[#6a5f54] dark:text-slate-400">
                  <div>CPU {{ formatPercent(node.latest?.cpu?.usage ?? node.latest?.cpuPercent) }}</div>
                  <div>内存 {{ formatPercent(node.latest?.mem?.usage ?? node.latest?.memPercent) }}</div>
                  <div>磁盘 {{ formatPercent(node.latest?.disk?.usage ?? node.latest?.diskPercent) }}</div>
                  <div>负载 {{ formatLoad(node.latest?.load1 ?? node.latest?.load?.load1) }}</div>
                  <div>流量 {{ formatTraffic(node.latest?.traffic) }}</div>
                  <div>运行 {{ formatUptime(node.latest?.uptimeSec) }}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="rounded-[28px] border border-[#e6e0d6] bg-gradient-to-br from-white via-[#fdfaf6] to-[#f4efe7] p-6 shadow-xl shadow-[#d8cab8]/30 dark:border-slate-800 dark:bg-gradient-to-br dark:from-slate-900/80 dark:via-slate-900/60 dark:to-slate-800/60 dark:shadow-black/40">
            <h2 class="text-lg font-semibold text-[#1f1b17] dark:text-slate-100">资源脉冲</h2>
            <p class="mt-1 text-xs text-[#8a7f70] dark:text-slate-400">汇总最近一次上报的资源占用</p>
            <div class="mt-5 grid grid-cols-2 gap-4">
              <VpsMetricChart title="CPU" unit="%" :points="nodes.map(node => node.latest?.cpu?.usage ?? node.latest?.cpuPercent ?? null)" color="#0ea5e9" :height="80" />
              <VpsMetricChart title="内存" unit="%" :points="nodes.map(node => node.latest?.mem?.usage ?? node.latest?.memPercent ?? null)" color="#f97316" :height="80" />
              <VpsMetricChart title="磁盘" unit="%" :points="nodes.map(node => node.latest?.disk?.usage ?? node.latest?.diskPercent ?? null)" color="#22c55e" :height="80" />
              <VpsMetricChart title="流量" unit="" :points="nodes.map(node => node.latest?.traffic?.rx ?? node.latest?.traffic?.download ?? null)" color="#6366f1" :height="80" />
            </div>
            <div class="mt-6 grid grid-cols-2 gap-3 text-xs">
              <div class="rounded-2xl border border-[#efe6db] bg-white/70 px-3 py-3 text-[#6a5f54] dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
                平均 CPU <span class="font-semibold">{{ formatPercent(avgCpu) }}</span>
              </div>
              <div class="rounded-2xl border border-[#efe6db] bg-white/70 px-3 py-3 text-[#6a5f54] dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
                平均内存 <span class="font-semibold">{{ formatPercent(avgMem) }}</span>
              </div>
              <div class="rounded-2xl border border-[#efe6db] bg-white/70 px-3 py-3 text-[#6a5f54] dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
                平均磁盘 <span class="font-semibold">{{ formatPercent(avgDisk) }}</span>
              </div>
              <div class="rounded-2xl border border-[#efe6db] bg-white/70 px-3 py-3 text-[#6a5f54] dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
                平均负载 <span class="font-semibold">{{ avgLoad || '--' }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="rounded-[30px] border border-[#e7e1d6] bg-white/90 p-6 shadow-xl shadow-[#d8cab8]/30 dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-black/40">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-[#1f1b17] dark:text-slate-100">节点全览</h2>
            <span class="text-xs text-[#8a7f70] dark:text-slate-400">共 {{ statusSummary.total }} 个节点</span>
          </div>
          <div class="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <div v-for="node in sortedNodes" :key="node.id" class="rounded-2xl border border-[#efe6db] bg-[#fdfaf6] p-4 dark:border-slate-800 dark:bg-slate-900/60">
              <div class="flex items-start justify-between">
                <div>
                  <p class="text-sm font-semibold text-[#1f1b17] dark:text-slate-100">{{ node.name || node.id }}</p>
                  <p class="text-xs text-[#8a7f70] dark:text-slate-400">{{ node.tag || '--' }} · {{ node.region || '未知地区' }}</p>
                </div>
                <span class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]"
                  :class="node.status === 'online'
                    ? 'border-[#bbf7d0] bg-[#ecfdf3] text-[#0f766e] dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300'
                    : 'border-[#fecdd3] bg-[#fff1f2] text-[#be123c] dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-300'"
                >
                  {{ node.status === 'online' ? '在线' : '离线' }}
                </span>
              </div>
              <div class="mt-4 grid grid-cols-2 gap-2 text-[11px] text-[#6a5f54] dark:text-slate-400">
                <div>CPU {{ formatPercent(node.latest?.cpu?.usage ?? node.latest?.cpuPercent) }}</div>
                <div>内存 {{ formatPercent(node.latest?.mem?.usage ?? node.latest?.memPercent) }}</div>
                <div>磁盘 {{ formatPercent(node.latest?.disk?.usage ?? node.latest?.diskPercent) }}</div>
                <div>负载 {{ formatLoad(node.latest?.load1 ?? node.latest?.load?.load1) }}</div>
                <div>流量 {{ formatTraffic(node.latest?.traffic) }}</div>
                <div>运行 {{ formatUptime(node.latest?.uptimeSec) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
