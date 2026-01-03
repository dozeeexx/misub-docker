<script setup>
import { ref, watch } from 'vue';
import { api } from '../../lib/http.js';

const props = defineProps({
    show: {
        type: Boolean,
        default: false
    },
    config: {
        type: Object,
        default: () => ({ enabled: false })
    }
});

const emit = defineEmits(['close']);

const form = ref({
    nickname: '',
    content: '',
    type: 'general', // general, feature, bug
    captcha: ''
});

const captcha = ref({
    num1: 0,
    num2: 0,
    operator: '+',
    answer: 0
});

const submitting = ref(false);
const showSuccess = ref(false);
const errorMsg = ref('');

const generateCaptcha = () => {
    const operators = ['+', '-'];
    const operator = operators[Math.floor(Math.random() * operators.length)];
    let num1 = Math.floor(Math.random() * 20) + 1;
    let num2 = Math.floor(Math.random() * 20) + 1;

    // Ensure positive result for subtraction
    if (operator === '-' && num1 < num2) {
        [num1, num2] = [num2, num1];
    }

    captcha.value = {
        num1,
        num2,
        operator,
        answer: operator === '+' ? num1 + num2 : num1 - num2
    };
    form.value.captcha = '';
};

// Reset form when modal opens
const resetForm = () => {
    form.value = { nickname: '', content: '', type: 'general', captcha: '' };
    showSuccess.value = false;
    errorMsg.value = '';
    generateCaptcha();
};

watch(() => props.show, (newVal) => {
    if (newVal) {
        resetForm();
    }
});

const submitMessage = async () => {
    errorMsg.value = '';

    if (!form.value.content || !form.value.content.trim()) {
        errorMsg.value = '请填写反馈内容';
        return;
    }

    if (parseInt(form.value.captcha) !== captcha.value.answer) {
        errorMsg.value = '验证码错误，请重试';
        generateCaptcha();
        return;
    }

    submitting.value = true;
    try {
        const data = await api.post('/api/public/guestbook', {
            nickname: form.value.nickname,
            content: form.value.content,
            type: form.value.type
        });

        if (data.success) {
            showSuccess.value = true;
        } else {
            errorMsg.value = data.message || '提交失败';
            generateCaptcha();
        }
    } catch (e) {
        console.error('Submit guestbook error', e);
        errorMsg.value = '网络错误，请稍后重试';
    } finally {
        submitting.value = false;
    }
};
</script>

<template>
    <!-- Root container with high z-index -->
    <div v-if="show" class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" role="dialog"
        aria-modal="true">

        <!-- Backdrop -->
        <div class="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity" @click="emit('close')"></div>

        <!-- Modal Panel -->
        <div
            class="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col max-h-[90vh] transition-all p-6">

            <!-- Close Button (Absolute) -->
            <button @click="emit('close')"
                class="absolute top-4 right-4 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors z-10">
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            <!-- Success State -->
            <div v-if="showSuccess" class="flex flex-col items-center justify-center py-8 text-center animate-fade-in">
                <div
                    class="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                    <svg class="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">提交成功</h3>
                <p class="text-gray-500 dark:text-gray-400 max-w-xs">
                    感谢您的反馈！管理员已收到您的留言。
                </p>
                <button @click="emit('close')"
                    class="mt-8 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors">
                    关闭
                </button>
            </div>

            <!-- Form State -->
            <div v-else class="flex flex-col h-full">
                <!-- Header -->
                <div class="mb-6">
                    <h3 class="text-lg font-bold text-gray-900 dark:text-white">
                        提交反馈
                    </h3>
                    <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        所有的反馈都会被认真阅读
                    </p>
                </div>

                <!-- Body -->
                <div class="space-y-4 overflow-y-auto custom-scrollbar flex-1 px-1">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">反馈类型</label>
                        <select v-model="form.type"
                            class="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-white py-2 px-3 text-sm">
                            <option value="general">💬 普通留言</option>
                            <option value="feature">✨ 功能建议</option>
                            <option value="bug">🐛 问题反馈</option>
                        </select>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">昵称 (可选)</label>
                        <input type="text" v-model="form.nickname" placeholder="您怎么称呼？"
                            class="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-white py-2 px-3 text-sm">
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">内容</label>
                        <textarea v-model="form.content" rows="4" placeholder="请详细描述您的建议或遇到的问题..."
                            class="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-white py-2 px-3 text-sm resize-none"></textarea>
                    </div>

                    <!-- Captcha -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">人机验证</label>
                        <div class="flex items-center gap-3">
                            <div
                                class="bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 font-mono font-bold select-none border border-gray-200 dark:border-gray-600 min-w-[80px] text-center">
                                {{ captcha.num1 }} {{ captcha.operator }} {{ captcha.num2 }} = ?
                            </div>
                            <input type="number" v-model="form.captcha" placeholder="答案"
                                class="block w-24 rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-white py-2 px-3 text-sm"
                                @keydown.enter="submitMessage">
                            <button type="button" @click="generateCaptcha"
                                class="text-gray-400 hover:text-indigo-500 transition-colors p-1" title="刷新验证码">
                                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    <!-- Error Message -->
                    <div v-if="errorMsg" class="text-red-500 text-sm animate-pulse flex items-center gap-1">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {{ errorMsg }}
                    </div>
                </div>

                <!-- Footer -->
                <div class="mt-6 flex justify-end gap-3 pt-2">
                    <button @click="emit('close')"
                        class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 transition-colors">
                        取消
                    </button>
                    <button @click="submitMessage" :disabled="submitting || !form.content"
                        class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md active:scale-95">
                        {{ submitting ? '提交中...' : '提交反馈' }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.animate-fade-in {
    animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.custom-scrollbar::-webkit-scrollbar {
    width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: rgba(156, 163, 175, 0.5);
    border-radius: 3px;
}
</style>
