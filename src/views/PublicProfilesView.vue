<script setup>
import { ref, onMounted, defineAsyncComponent, nextTick, computed } from 'vue';
import { useToastStore } from '../stores/toast.js';
import QRCode from 'qrcode';
import { api } from '../lib/http.js';
import ProfileGrid from '../components/public/ProfileGrid.vue';

const isDev = import.meta.env.DEV;

const NodePreviewModal = defineAsyncComponent(() => import('../components/modals/NodePreview/NodePreviewModal.vue'));
const AnnouncementCard = defineAsyncComponent(() => import('../components/features/AnnouncementCard.vue'));
const GuestbookModal = defineAsyncComponent(() => import('../components/modals/GuestbookModal.vue'));
const QuickImportModal = defineAsyncComponent(() => import('../components/modals/QuickImportModal.vue'));

const publicProfiles = ref([]);
const loading = ref(true);
const error = ref(null);
const { showToast } = useToastStore();
const config = ref({});
const announcement = computed(() => config.value.announcement);
const heroConfig = computed(() => config.value.hero || {
    title1: '发现优质',
    title2: '订阅资源',
    description: '浏览并获取由管理员分享的精选订阅组合，一键导入到您的客户端。'
});
const guestbookConfig = computed(() => config.value.guestbook || {});

const showGuestbookModal = ref(false);
const showQuickImportModal = ref(false);
const selectedProfileForImport = ref(null);

const handleGuestbookTrigger = () => {
    if (guestbookConfig.value && guestbookConfig.value.enabled === false) {
        showToast('留言板功能已关闭', 'warning');
        return;
    }
    showGuestbookModal.value = true;
};

const fetchPublicProfiles = async () => {
    try {
        loading.value = true;
        const data = await api.get('/api/public/profiles');
        if (data.success) {
            publicProfiles.value = data.data;
            config.value = data.config || {};
            if (isDev) {
                console.debug('Guestbook Config:', config.value.guestbook);
            }
            if (data.config && data.config.announcement) {
                if (isDev) {
                    console.debug('Announcement loaded:', data.config.announcement);
                }
            } else {
                if (isDev) {
                    console.debug('No announcement found in config');
                }
            }
        } else {
            error.value = data.message || '获取数据失败';
        }
    } catch (err) {
        error.value = err.message;
        console.error('Fetch error:', err);
    } finally {
        loading.value = false;
    }
};

const copyLink = async (profile) => {
    const token = config.value.profileToken || 'profiles';
    const identifier = profile.customId || profile.id;
    const link = `${window.location.origin}/${token}/${identifier}`;

    try {
        await navigator.clipboard.writeText(link);
        showToast('订阅链接已复制到剪贴板', 'success');
    } catch (e) {
        showToast('复制失败，请手动复制', 'error');
    }
};



const clients = ref([]);

const fetchClients = async () => {
    try {
        const data = await api.get('/api/clients');
        if (data.success && data.data && data.data.length > 0) {
            clients.value = data.data;
        }
    } catch (e) {
        console.error('Failed to fetch clients', e);
    }
};

const fetchClientVersions = async () => {
    // Only fetch for clients with repo
    clients.value.forEach(async (client) => {
        if (!client.repo) return;
        try {
            const res = await fetch(`https://api.github.com/repos/${client.repo}/releases/latest`);
            if (res.ok) {
                const data = await res.json();
                client.version = data.tag_name;
            }
        } catch (e) {
            console.warn(`Failed to fetch version for ${client.name}`, e);
        }
    });
};

const getPlatformLabel = (p) => {
    const map = {
        windows: 'Windows',
        macos: 'macOS',
        linux: 'Linux',
        android: 'Android',
        ios: 'iOS'
    };
    return map[p] || p;
};

const showPreviewModal = ref(false);
const previewProfileId = ref(null);
const previewProfileName = ref('');

const handlePreview = (profile) => {
    previewProfileId.value = profile.id; // Or profile.customId
    previewProfileName.value = profile.name;
    showPreviewModal.value = true;
};

const handleQuickImport = (profile) => {
    selectedProfileForImport.value = profile;
    showQuickImportModal.value = true;
};

// QR Code in Card
const expandedQRCards = ref(new Set());
const qrCanvasRefs = ref({});

const registerQrCanvas = (profileId, canvas) => {
    if (!canvas) return;
    qrCanvasRefs.value[profileId] = canvas;
};

const toggleQRCode = async (profile) => {
    const profileId = profile.id;

    if (expandedQRCards.value.has(profileId)) {
        // Collapse
        expandedQRCards.value.delete(profileId);
    } else {
        // Expand
        expandedQRCards.value.add(profileId);

        // Generate QR code after DOM update
        await nextTick();
        const canvas = qrCanvasRefs.value[profileId];
        if (canvas) {
            const token = config.value.profileToken || 'profiles';
            const identifier = profile.customId || profile.id;
            const link = `${window.location.origin}/${token}/${identifier}`;

            try {
                await QRCode.toCanvas(canvas, link, {
                    width: 200,
                    margin: 2,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                    }
                });
            } catch (err) {
                console.error('Failed to generate QR code:', err);
            }
        }
    }
};

const isQRExpanded = (profileId) => {
    return expandedQRCards.value.has(profileId);
};

const downloadQRCode = (profile) => {
    const canvas = qrCanvasRefs.value[profile.id];
    if (!canvas) return;

    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${profile.name || 'subscription'}-qrcode.png`;
    link.href = url;
    link.click();
    showToast('二维码已下载', 'success');
};

const getPlatformStyle = (p) => {
    const map = {
        windows: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
        macos: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
        linux: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200',
        android: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
        HarmonyOS: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
        ios: 'bg-gray-800 text-white dark:bg-white dark:text-gray-900'
    };
    return map[p] || 'bg-gray-100 text-gray-800';
};

onMounted(async () => {
    fetchPublicProfiles();
    await fetchClients();
    fetchClientVersions();
});
</script>

<template>
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <!-- Hero Section -->
        <div class="relative bg-white dark:bg-gray-800 overflow-hidden shadow-sm">
            <div class="absolute inset-0">
                <div
                    class="absolute inset-y-0 right-0 w-1/2 bg-linear-to-bl from-indigo-50 to-transparent dark:from-indigo-900/20">
                </div>
                <div
                    class="absolute bottom-0 right-0 w-full h-px bg-linear-to-r from-transparent via-gray-200 to-transparent dark:via-gray-700">
                </div>
            </div>



            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative pt-16 pb-12 lg:pt-24 lg:pb-20">
                <div class="text-center">
                    <h1
                        class="text-4xl tracking-tight font-extrabold text-gray-900 dark:text-white sm:text-5xl md:text-6xl">
                        <span class="block">{{ heroConfig.title1 }}</span>
                        <span class="block text-indigo-600 dark:text-indigo-400">{{ heroConfig.title2 }}</span>
                    </h1>
                    <p
                        class="mt-3 max-w-md mx-auto text-base text-gray-500 dark:text-gray-400 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
                        {{ heroConfig.description }}
                    </p>

                    <!-- Old Trigger Removed -->
                </div>
            </div>

            <!-- Guestbook Trigger (Absolute Bottom Right) -->
            <div
                class="absolute bottom-4 right-4 z-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full pointer-events-none flex justify-end">
                <button @click="handleGuestbookTrigger"
                    class="pointer-events-auto inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 border border-transparent text-xs sm:text-sm font-medium rounded-full shadow-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all transform hover:scale-105">
                    <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    <span>反馈</span>
                    <span class="hidden sm:inline">与建议</span>
                </button>
            </div>
        </div>

        <!-- Content Section -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

            <!-- Announcement Section -->
            <AnnouncementCard v-if="announcement && announcement.enabled" :announcement="announcement" />

            <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div v-for="i in 6" :key="i"
                    class="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 animate-pulse">
                    <div class="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
                    <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
                    <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-6"></div>
                    <div class="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-full"></div>
                </div>
            </div>

            <div v-else-if="error" class="text-center py-12">
                <div
                    class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                    <svg class="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h3 class="text-lg font-medium text-gray-900 dark:text-white">加载失败</h3>
                <p class="mt-2 text-gray-500 dark:text-gray-400">{{ error }}</p>
                <button @click="fetchPublicProfiles"
                    class="mt-4 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    重试
                </button>
            </div>

            <div v-else-if="publicProfiles.length === 0" class="text-center py-24">
                <div
                    class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                    <svg class="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                </div>
                <h3 class="text-lg font-medium text-gray-900 dark:text-white">暂无公开订阅</h3>
                <p class="mt-2 text-gray-500 dark:text-gray-400">目前没有任何公开分享的订阅组，请稍后再来看看。</p>
            </div>

            <ProfileGrid
                v-else
                :profiles="publicProfiles"
                :is-qr-expanded="isQRExpanded"
                @quick-import="handleQuickImport"
                @toggle-qr="toggleQRCode"
                @preview="handlePreview"
                @copy-link="copyLink"
                @download-qr="downloadQRCode"
                @register-canvas="registerQrCanvas"
            />

            <!-- Clients Section -->
            <div class="mt-20 mb-12">
                <div class="text-center mb-12">
                    <h2 class="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
                        <span class="block">必备客户端</span>
                        <span class="block text-indigo-600 dark:text-indigo-400 text-2xl mt-2">主流全平台支持</span>
                    </h2>
                    <p class="mt-3 max-w-2xl mx-auto text-xl text-gray-500 dark:text-gray-400 sm:mt-4">
                        选择适合您设备的客户端，享受高速稳定的网络体验
                    </p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <div v-for="client in clients" :key="client.name"
                        class="group relative bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:border-indigo-100 dark:hover:border-indigo-900 transition-all duration-300 transform hover:-translate-y-1">
                        <div class="flex items-start justify-between">
                            <div class="flex items-center gap-4">
                                <div
                                    class="h-14 w-14 rounded-xl flex items-center justify-center text-3xl shadow-sm bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 overflow-hidden">
                                    <img v-if="client.icon && client.icon.includes('/')" :src="client.icon"
                                        :alt="client.name" class="w-full h-full object-contain p-2" />
                                    <span v-else>{{ client.icon }}</span>
                                </div>
                                <div>
                                    <div class="flex items-center gap-2">
                                        <h3
                                            class="text-lg font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                            {{ client.name }}
                                        </h3>
                                        <!-- Version Badge -->
                                        <span v-if="client.version"
                                            class="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                                            {{ client.version }}
                                        </span>
                                    </div>
                                    <div class="flex flex-wrap gap-1 mt-1">
                                        <span v-for="platform in client.platforms" :key="platform"
                                            class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                                            :class="getPlatformStyle(platform)">
                                            {{ getPlatformLabel(platform) }}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <p class="mt-4 text-gray-500 dark:text-gray-400 text-sm h-10 line-clamp-2">
                            {{ client.description }}
                        </p>

                        <div class="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                            <a :href="client.url" target="_blank"
                                class="flex items-center justify-between w-full text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium group-hover:translate-x-1 transition-transform cursor-pointer">
                                <span>获取下载</span>
                                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                            </a>
                        </div>
                    </div>
                </div>
            </div>

        </div>

        <!-- Modals -->
        <NodePreviewModal v-if="showPreviewModal" :show="showPreviewModal" @update:show="showPreviewModal = $event"
            :profile-id="previewProfileId" :profile-name="previewProfileName" api-endpoint="/api/public/preview" />

        <GuestbookModal :show="showGuestbookModal" :config="guestbookConfig" @close="showGuestbookModal = false" />

        <QuickImportModal :show="showQuickImportModal" :profile="selectedProfileForImport" :clients="clients"
            :profile-token="config.profileToken || 'profiles'" @close="showQuickImportModal = false" />
    </div>
</template>

<style scoped>
/* Custom Scrollbar for nicer feel */
::-webkit-scrollbar {
    width: 8px;
}

::-webkit-scrollbar-track {
    background: transparent;
}

::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
}

.dark ::-webkit-scrollbar-thumb {
    background: #475569;
}

.dark ::-webkit-scrollbar-thumb:hover {
    background: #64748b;
}

/* Gradient Text for Title (if supported) */
/* h1 span.text-indigo-600 {
    background-clip: text;
    -webkit-background-clip: text;
    color: transparent;
    background-image: linear-gradient(to right, #4f46e5, #8b5cf6);
} */
</style>
