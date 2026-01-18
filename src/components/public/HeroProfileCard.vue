<script setup>
import { ref, nextTick } from 'vue';
import QRCode from 'qrcode';
import BaseIcon from '../ui/BaseIcon.vue';

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

const ICONS = {
    import: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4',
    preview: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
    link: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1',
    qr: 'M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z'
};
</script>

<template>
    <div class="relative w-full">
        <!-- 背景装饰 -->
        <div
            class="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-purple-50 dark:from-primary-900/20 dark:via-white/5 dark:to-purple-900/20 rounded-[2.5rem]">
        </div>
        <div
            class="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary-200/40 to-transparent dark:from-primary-600/10 rounded-full blur-3xl animate-pulse-slow">
        </div>
        <div
            class="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-purple-200/40 to-transparent dark:from-purple-600/10 rounded-full blur-3xl animate-pulse-slow delay-700">
        </div>

        <!-- 主卡片 -->
        <div
            class="relative glass-panel dark:bg-white/5 backdrop-blur-2xl rounded-[2rem] p-8 md:p-12 shadow-2xl shadow-primary-500/10 border-white/40 dark:border-white/10 hover:shadow-primary-500/20 transition-all duration-500">

            <!-- 精选标签 -->
            <div class="flex justify-center mb-8">
                <div
                    class="inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-primary-500 to-purple-600 rounded-full shadow-lg shadow-primary-500/25 ring-1 ring-white/20">
                    <span class="text-white text-sm font-bold tracking-wide">✨ 精选订阅推荐</span>
                </div>
            </div>

            <!-- 内容区域 -->
            <div class="flex flex-col lg:flex-row items-center gap-8 lg:gap-16">

                <!-- 左侧信息 -->
                <div class="flex-1 text-center lg:text-left">
                    <!-- 图标和标题 -->
                    <div class="flex flex-col lg:flex-row items-center lg:items-start gap-6 mb-8">
                        <div
                            class="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center shadow-lg shadow-primary-500/30 shrink-0 transform hover:scale-105 transition-transform duration-500">
                            <span class="text-4xl drop-shadow-md">🚀</span>
                        </div>
                        <div>
                            <h3 class="text-3xl md:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-primary-800 to-gray-900 dark:from-white dark:via-primary-200 dark:to-white">
                                {{ profile.name }}
                            </h3>
                            <p class="mt-3 text-lg text-gray-500 dark:text-gray-400 max-w-lg leading-relaxed">
                                {{ profile.description || '暂无简介' }}
                            </p>
                        </div>
                    </div>



                    <!-- 操作按钮 -->
                    <div class="flex flex-wrap justify-center lg:justify-start gap-4">
                        <button @click="emit('quick-import', profile)"
                            class="inline-flex items-center px-8 py-3.5 bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-500 hover:to-purple-500 text-white font-bold rounded-2xl shadow-xl shadow-primary-500/30 transition-all hover:-translate-y-1 hover:scale-105 active:scale-95">
                            <BaseIcon :path="ICONS.import" className="w-5 h-5 mr-2" />
                            一键导入
                        </button>
                        <button @click="emit('preview', profile)"
                            class="inline-flex items-center px-6 py-3.5 bg-white/80 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 font-bold rounded-2xl hover:bg-white dark:hover:bg-white/20 transition-all hover:-translate-y-0.5 active:scale-95 backdrop-blur-sm">
                            <BaseIcon :path="ICONS.preview" className="w-5 h-5 mr-2" />
                            预览节点
                        </button>
                        <button @click="emit('copy-link', profile)"
                            class="inline-flex items-center px-6 py-3.5 bg-white/80 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 font-bold rounded-2xl hover:bg-white dark:hover:bg-white/20 transition-all hover:-translate-y-0.5 active:scale-95 backdrop-blur-sm">
                            <BaseIcon :path="ICONS.link" className="w-5 h-5 mr-2" />
                            复制链接
                        </button>
                    </div>
                </div>

                <!-- 右侧二维码区域 -->
                <div class="flex flex-col items-center">
                    <div @click="toggleQR"
                        class="relative w-56 h-56 bg-white/50 dark:bg-gray-800/50 rounded-3xl shadow-lg border-2 border-dashed border-gray-200 dark:border-gray-600 flex items-center justify-center cursor-pointer hover:border-primary-400 dark:hover:border-primary-500 hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all group backdrop-blur-sm">

                        <!-- 未展开状态 -->
                        <div v-if="!showQR" class="text-center">
                            <div
                                class="w-20 h-20 mx-auto mb-4 bg-primary-50 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                <BaseIcon :path="ICONS.qr" className="w-10 h-10 text-primary-600 dark:text-primary-400" />
                            </div>
                            <span class="text-sm font-medium text-gray-500 dark:text-gray-400">点击显示二维码</span>
                        </div>

                        <!-- 二维码展示 -->
                        <canvas v-show="showQR" ref="qrCanvas" class="rounded-xl shadow-sm"></canvas>
                    </div>
                    <p class="mt-4 text-xs font-medium text-gray-400 dark:text-gray-500 text-center uppercase tracking-wider">
                        扫码快速导入
                    </p>
                </div>
            </div>
        </div>
    </div>
</template>
