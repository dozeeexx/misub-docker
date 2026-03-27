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
  <div class="min-h-screen bg-[#f7f6f1] dark:bg-[#05060a]">
    <div class="relative overflow-hidden">
      <div class="absolute inset-0">
        <div class="absolute -top-24 left-10 h-72 w-72 rounded-full bg-gradient-to-br from-[#0ea5e9]/35 via-[#2dd4bf]/20 to-[#f97316]/25 blur-3xl"></div>
        <div class="absolute top-24 right-10 h-64 w-64 rounded-full bg-gradient-to-br from-[#f97316]/30 via-[#22c55e]/20 to-[#38bdf8]/25 blur-3xl"></div>
        <div class="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#f7f6f1] dark:from-[#05060a] to-transparent"></div>
      </div>
      <div class="relative max-w-6xl mx-auto px-6 pt-16 pb-12">
        <div class="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div class="max-w-2xl">
            <div class="inline-flex items-center gap-2 rounded-full border border-[#e7e1d6] bg-white/80 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-[#8a7f70]">
              Status Observatory
            </div>
            <h1 class="mt-4 text-4xl md:text-5xl font-semibold text-[#1f1b17] dark:text-white">
              VPS 探针公开视图
            </h1>
            <p class="mt-3 text-sm md:text-base text-[#6a5f54] dark:text-slate-400">
              对外展示节点健康、资源负载与在线率。所有关键指标以清晰、可信的方式汇总呈现。
            </p>
            <div class="mt-6 flex flex-wrap items-center gap-3 text-xs text-[#6a5f54] dark:text-slate-400">
              <span class="inline-flex items-center gap-2 rounded-full border border-[#e7e1d6] bg-white/80 px-3 py-1">
                更新时间 {{ lastUpdatedAt || '--' }}
              </span>
              <button
                class="inline-flex items-center gap-2 rounded-full border border-[#d9cdbd] bg-[#1f1b17] px-4 py-1 text-white shadow-lg shadow-[#1f1b17]/20 hover:shadow-xl"
                @click="loadSnapshot"
              >
                刷新数据
              </button>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4 text-xs">
            <div class="rounded-2xl border border-[#ebe3d8] bg-white/80 p-4 shadow-sm">
              <p class="text-[#8a7f70]">节点总数</p>
              <p class="mt-2 text-2xl font-semibold text-[#1f1b17]">{{ statusSummary.total }}</p>
            </div>
            <div class="rounded-2xl border border-[#d1fae5] bg-[#ecfdf3] p-4 shadow-sm">
              <p class="text-[#087f5b]">在线节点</p>
              <p class="mt-2 text-2xl font-semibold text-[#064e3b]">{{ statusSummary.online }}</p>
            </div>
            <div class="rounded-2xl border border-[#fee2e2] bg-[#fef2f2] p-4 shadow-sm">
              <p class="text-[#b91c1c]">离线节点</p>
              <p class="mt-2 text-2xl font-semibold text-[#7f1d1d]">{{ statusSummary.offline }}</p>
            </div>
            <div class="rounded-2xl border border-[#e0e7ff] bg-[#eef2ff] p-4 shadow-sm">
              <p class="text-[#3730a3]">在线率</p>
              <p class="mt-2 text-2xl font-semibold text-[#312e81]">{{ onlineRate }}%</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-6xl mx-auto px-6 pb-16">
      <div v-if="loading" class="py-16 text-center text-sm text-[#8a7f70]">正在加载探针数据...</div>
      <div v-else-if="error" class="py-16 text-center text-sm text-rose-600">{{ error }}</div>
      <div v-else class="space-y-10">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="rounded-[28px] border border-[#ebe3d8] bg-white/90 p-6 shadow-xl shadow-[#d8cab8]/30 lg:col-span-2">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold text-[#1f1b17]">重点节点</h2>
              <span class="text-xs text-[#8a7f70]">按在线优先展示</span>
            </div>
            <div class="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div v-for="node in topNodes" :key="node.id" class="rounded-2xl border border-[#efe6db] bg-[#fdfaf6] p-4">
                <div class="flex items-start justify-between">
                  <div>
                    <p class="text-sm font-semibold text-[#1f1b17]">{{ node.name || node.id }}</p>
                    <p class="text-xs text-[#8a7f70]">{{ node.tag || '--' }} · {{ node.region || '未知地区' }}</p>
                  </div>
                  <span class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]"
                    :class="node.status === 'online'
                      ? 'border-[#bbf7d0] bg-[#ecfdf3] text-[#0f766e]'
                      : 'border-[#fecdd3] bg-[#fff1f2] text-[#be123c]'"
                  >
                    {{ node.status === 'online' ? '在线' : '离线' }}
                  </span>
                </div>
                <div class="mt-4 grid grid-cols-2 gap-2 text-[11px] text-[#6a5f54]">
                  <div>CPU {{ formatPercent(node.latest?.cpu?.usage ?? node.latest?.cpuPercent) }}</div>
                  <div>内存 {{ formatPercent(node.latest?.mem?.usage ?? node.latest?.memPercent) }}</div>
                  <div>磁盘 {{ formatPercent(node.latest?.disk?.usage ?? node.latest?.diskPercent) }}</div>
                  <div>流量 {{ formatTraffic(node.latest?.traffic) }}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="rounded-[28px] border border-[#e6e0d6] bg-gradient-to-br from-white via-[#fdfaf6] to-[#f4efe7] p-6 shadow-xl shadow-[#d8cab8]/30">
            <h2 class="text-lg font-semibold text-[#1f1b17]">资源脉冲</h2>
            <p class="mt-1 text-xs text-[#8a7f70]">汇总最近一次上报的资源占用</p>
            <div class="mt-5 grid grid-cols-2 gap-4">
              <VpsMetricChart title="CPU" unit="%" :points="nodes.map(node => node.latest?.cpu?.usage ?? node.latest?.cpuPercent ?? null)" color="#0ea5e9" :height="80" />
              <VpsMetricChart title="内存" unit="%" :points="nodes.map(node => node.latest?.mem?.usage ?? node.latest?.memPercent ?? null)" color="#f97316" :height="80" />
              <VpsMetricChart title="磁盘" unit="%" :points="nodes.map(node => node.latest?.disk?.usage ?? node.latest?.diskPercent ?? null)" color="#22c55e" :height="80" />
              <VpsMetricChart title="流量" unit="" :points="nodes.map(node => node.latest?.traffic?.rx ?? node.latest?.traffic?.download ?? null)" color="#6366f1" :height="80" />
            </div>
          </div>
        </div>

        <div class="rounded-[30px] border border-[#e7e1d6] bg-white/90 p-6 shadow-xl shadow-[#d8cab8]/30">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-[#1f1b17]">节点全览</h2>
            <span class="text-xs text-[#8a7f70]">共 {{ statusSummary.total }} 个节点</span>
          </div>
          <div class="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <div v-for="node in sortedNodes" :key="node.id" class="rounded-2xl border border-[#efe6db] bg-[#fdfaf6] p-4">
              <div class="flex items-start justify-between">
                <div>
                  <p class="text-sm font-semibold text-[#1f1b17]">{{ node.name || node.id }}</p>
                  <p class="text-xs text-[#8a7f70]">{{ node.tag || '--' }} · {{ node.region || '未知地区' }}</p>
                </div>
                <span class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]"
                  :class="node.status === 'online'
                    ? 'border-[#bbf7d0] bg-[#ecfdf3] text-[#0f766e]'
                    : 'border-[#fecdd3] bg-[#fff1f2] text-[#be123c]'"
                >
                  {{ node.status === 'online' ? '在线' : '离线' }}
                </span>
              </div>
              <div class="mt-4 grid grid-cols-2 gap-2 text-[11px] text-[#6a5f54]">
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
