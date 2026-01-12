<script setup>
import { ref, nextTick } from 'vue';
import QRCode from 'qrcode';

const props = defineProps({
    profile: {
        type: Object,
        required: true
    },
    profileToken: {
        type: String,
        default: 'profiles'
    }
});

const emit = defineEmits([
    'quick-import',
    'preview',
    'copy-link'
]);

// 二维码相关
const showQR = ref(false);
const qrCanvas = ref(null);

const getSubscriptionUrl = () => {
    const identifier = props.profile.customId || props.profile.id;
    return `${window.location.origin}/${props.profileToken}/${identifier}`;
};

const toggleQR = async () => {
    showQR.value = !showQR.value;
    if (showQR.value) {
        await nextTick();
        if (qrCanvas.value) {
            try {
                await QRCode.toCanvas(qrCanvas.value, getSubscriptionUrl(), {
                    width: 180,
                    margin: 2,
                    color: { dark: '#000000', light: '#FFFFFF' }
                });
            } catch (err) {
                console.error('Failed to generate QR code:', err);
            }
        }
    }
};
</script>

<template>
    <div class="relative w-full">
        <!-- 背景装饰 -->
        <div
            class="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-indigo-950/30 dark:via-gray-800 dark:to-purple-950/30 rounded-3xl">
        </div>
        <div
            class="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-indigo-200/40 to-transparent dark:from-indigo-600/10 rounded-full blur-3xl">
        </div>
        <div
            class="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-purple-200/40 to-transparent dark:from-purple-600/10 rounded-full blur-3xl">
        </div>

        <!-- 主卡片 -->
        <div
            class="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-8 md:p-12 shadow-xl border border-gray-100/50 dark:border-gray-700/50">

            <!-- 精选标签 -->
            <div class="flex justify-center mb-6">
                <div
                    class="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full shadow-lg shadow-indigo-500/25">
                    <span class="text-white text-sm font-semibold">✨ 精选订阅推荐</span>
                </div>
            </div>

            <!-- 内容区域 -->
            <div class="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">

                <!-- 左侧信息 -->
                <div class="flex-1 text-center lg:text-left">
                    <!-- 图标和标题 -->
                    <div class="flex flex-col lg:flex-row items-center lg:items-start gap-4 mb-6">
                        <div
                            class="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                            <span class="text-3xl">🚀</span>
                        </div>
                        <div>
                            <h3 class="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                                {{ profile.name }}
                            </h3>
                            <p class="mt-2 text-gray-500 dark:text-gray-400 max-w-md">
                                {{ profile.description || '暂无简介' }}
                            </p>
                        </div>
                    </div>

                    <!-- 统计信息 -->
                    <div class="flex justify-center lg:justify-start gap-6 mb-8">
                        <div class="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                            <svg class="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24"
                                stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                                订阅源：<strong class="text-indigo-600 dark:text-indigo-400">{{ profile.subscriptionCount ||
                                    0 }}</strong>
                            </span>
                        </div>
                        <div class="flex items-center gap-2 px-4 py-2 bg-purple-50 dark:bg-purple-900/30 rounded-xl">
                            <svg class="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24"
                                stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                            </svg>
                            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                                节点数：<strong class="text-purple-600 dark:text-purple-400">{{ profile.manualNodeCount || 0
                                    }}</strong>
                            </span>
                        </div>
                    </div>

                    <!-- 操作按钮 -->
                    <div class="flex flex-wrap justify-center lg:justify-start gap-3">
                        <button @click="emit('quick-import', profile)"
                            class="inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/30 transition-all hover:scale-105 active:scale-95">
                            <svg class="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            一键导入
                        </button>
                        <button @click="emit('preview', profile)"
                            class="inline-flex items-center px-5 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-all">
                            <svg class="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            预览节点
                        </button>
                        <button @click="emit('copy-link', profile)"
                            class="inline-flex items-center px-5 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-all">
                            <svg class="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                            复制链接
                        </button>
                    </div>
                </div>

                <!-- 右侧二维码区域 -->
                <div class="flex flex-col items-center">
                    <div @click="toggleQR"
                        class="relative w-48 h-48 bg-white dark:bg-gray-700 rounded-2xl shadow-lg border-2 border-dashed border-gray-200 dark:border-gray-600 flex items-center justify-center cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 transition-all group">

                        <!-- 未展开状态 -->
                        <div v-if="!showQR" class="text-center">
                            <div
                                class="w-16 h-16 mx-auto mb-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <svg class="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none"
                                    viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                </svg>
                            </div>
                            <span class="text-sm text-gray-500 dark:text-gray-400">点击显示二维码</span>
                        </div>

                        <!-- 二维码展示 -->
                        <canvas v-show="showQR" ref="qrCanvas" class="rounded-lg"></canvas>
                    </div>
                    <p class="mt-3 text-xs text-gray-400 dark:text-gray-500 text-center">
                        扫码快速导入到客户端
                    </p>
                </div>
            </div>
        </div>
    </div>
</template>
