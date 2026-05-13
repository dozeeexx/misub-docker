<script setup>
import { computed } from 'vue';
import Modal from '../forms/Modal.vue';
import { useToastStore } from '@/stores/toast';
import { buildClientQuickLinks } from '@/utils/client-quick-links.js';

const props = defineProps({
  show: Boolean,
  profile: Object,
  token: String,
});

const emit = defineEmits(['update:show']);
const { showToast } = useToastStore();

const close = () => {
  emit('update:show', false);
};

const identifier = computed(() => {
  if (!props.profile) return '';
  return props.profile.customId || props.profile.id;
});

const baseUrl = computed(() => {
  if (!props.token || props.token === 'auto' || !props.token.trim()) return '';
  return `${window.location.origin}/${props.token}/${identifier.value}`;
});

const quickLinks = computed(() => buildClientQuickLinks({
  origin: window.location.origin,
  token: props.token,
  profile: props.profile
}));

const clients = computed(() => [
  { name: '默认', type: 'default', format: '', description: '自动识别客户端' },
  { name: 'Clash', type: 'clash', format: '?clash', description: 'Clash/Mihomo 通用' },
  { name: 'Sing-Box', type: 'singbox', format: '?base64', description: '通用节点订阅' },
  { name: 'Surge', type: 'surge', format: '?surge', description: 'Surge 托管配置' },
  { name: 'Loon', type: 'loon', format: '?loon', description: 'Loon 兼容输出' },
  { name: 'V2Ray / Base64', type: 'base64', format: '?base64', description: 'Base64 节点列表' },
  { name: 'Quantumult X', type: 'quanx', format: '?quanx', description: 'QuanX 兼容输出' },
]);

const copyLink = async (link) => {
  if (!link) {
    showToast('请在设置中配置一个固定的"订阅组分享Token"', 'error');
    return;
  }

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(link);
      showToast('链接已复制到剪贴板！', 'success');
      close();
    } else {
      fallbackCopy(link);
    }
  } catch (err) {
    fallbackCopy(link);
  }
};

const copyToClipboard = async (format) => {
  if (!baseUrl.value) {
    showToast('请在设置中配置一个固定的"订阅组分享Token"', 'error');
    return;
  }

  await copyLink(`${baseUrl.value}${format}`);
};

const fallbackCopy = (link) => {
  const textArea = document.createElement("textarea");
  textArea.value = link;
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  textArea.style.top = "0";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  
  try {
    const successful = document.execCommand('copy');
    if (successful) {
      showToast('链接已复制到剪贴板！', 'success');
      close();
    } else {
      showToast('复制失败，请手动复制', 'error');
    }
  } catch (err) {
    showToast('复制失败，请手动复制', 'error');
  }
  document.body.removeChild(textArea);
};
</script>

<template>
  <Modal :show="show" @update:show="close" :show-cancel="false" :show-confirm="false">
    <template #title>
      <div>
        <h3 class="text-xl font-bold text-gray-900 dark:text-white">复制订阅链接</h3>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">选择客户端，MiSub 会自动给出推荐格式。</p>
      </div>
    </template>
    
    <template #body>
      <div class="mt-2" v-if="!baseUrl">
         <p class="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
           检测到您未在设置中配置“订阅组分享Token”，无法生成链接。请前往设置页面配置。
         </p>
      </div>
      <div v-else class="mt-4 space-y-5">
        <section class="rounded-2xl border border-primary-100 bg-primary-50/60 p-4 dark:border-primary-500/20 dark:bg-primary-500/10">
          <div class="mb-3 flex items-start justify-between gap-3">
            <div>
              <h4 class="text-sm font-semibold text-gray-900 dark:text-white">选择客户端，一键复制推荐链接</h4>
              <p class="mt-1 text-xs text-gray-600 dark:text-gray-300">已自动选择兼容格式，高级用户仍可复制指定格式。</p>
            </div>
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <button
              v-for="client in quickLinks"
              :key="client.id"
              :data-testid="`client-quick-link-${client.id}`"
              @click="copyLink(client.url)"
              class="group flex min-h-[88px] items-start gap-3 rounded-xl border border-white/70 bg-white/85 p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md dark:border-white/10 dark:bg-gray-900/70 dark:hover:border-primary-500/50"
            >
              <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-2xl dark:bg-white/10">{{ client.icon }}</span>
              <span class="min-w-0 flex-1">
                <span class="flex flex-wrap items-center gap-2">
                  <span class="font-semibold text-gray-900 dark:text-white">{{ client.name }}</span>
                  <span v-if="client.badge" class="rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-semibold text-primary-700 dark:bg-primary-500/20 dark:text-primary-200">{{ client.badge }}</span>
                </span>
                <span class="mt-1 block text-xs leading-relaxed text-gray-500 dark:text-gray-400">{{ client.summary }}</span>
              </span>
            </button>
          </div>
        </section>

        <section>
          <p class="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">指定格式</p>
          <div class="grid gap-2 sm:grid-cols-2">
            <button
              v-for="client in clients"
              :key="client.type"
              @click="copyToClipboard(client.format)"
              class="flex items-center justify-between rounded-xl border border-gray-200 bg-white/75 p-3 text-left transition-colors hover:border-primary-300 hover:bg-primary-50 dark:border-gray-700 dark:bg-gray-800/60 dark:hover:border-primary-700 dark:hover:bg-primary-900/20"
            >
              <span>
                <span class="block text-sm font-medium text-gray-900 dark:text-gray-100">{{ client.name }}</span>
                <span class="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">{{ client.description }}</span>
              </span>
              <span class="rounded-lg bg-primary-100 px-3 py-1 text-sm font-medium text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">复制</span>
            </button>
          </div>
        </section>
      </div>
    </template>
  </Modal>
</template>