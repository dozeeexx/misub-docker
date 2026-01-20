<script setup>
import { ref } from 'vue';
import FluidButton from '../ui/FluidButton.vue';

const emit = defineEmits(['success']);
const password = ref('');
const isLoading = ref(false);
const error = ref('');

const props = defineProps({
  login: Function,
});

const submitLogin = async () => {
  if (!password.value) {
    error.value = '请输入密码';
    return;
  }
  isLoading.value = true;
  error.value = '';
  try {
    await props.login(password.value);
    // 成功后不再需要 emit，因为父组件会处理状态变更
  } catch (err) {
    error.value = err.message || '发生未知错误';
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="w-full max-w-[420px] relative z-10 px-6">
    <!-- Clean Minimalist Card -->
    <div class="relative bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border border-white/50 dark:border-white/10 rounded-[2rem] p-10 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] dark:shadow-none overflow-hidden transition-all duration-500 hover:shadow-[0_20px_60px_-12px_rgba(0,0,0,0.15)]">
      
      <div class="flex flex-col items-center relative z-10">
        <!-- Minimal Logo -->
        <div class="w-24 h-24 mb-8 relative group cursor-default">
           <div class="absolute inset-0 bg-primary-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
           <svg width="100%" height="100%" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" class="text-primary-600 dark:text-primary-400 drop-shadow-lg relative z-10">
              <path fill="currentColor" d="M64 128a64 64 0 1 1 64-64a64.07 64.07 0 0 1-64 64Zm0-122a58 58 0 1 0 58 58A58.07 58.07 0 0 0 64 6Z"/>
              <path fill="currentColor" d="M64 100a36 36 0 1 1 36-36a36 36 0 0 1-36 36Zm0-66a30 30 0 1 0 30 30a30 30 0 0 0-30-30Z"/>
              <path fill="currentColor" d="M64 78a14 14 0 1 1 14-14a14 14 0 0 1-14 14Zm0-22a8 8 0 1 0 8 8a8 8 0 0 0-8-8Z"/>
           </svg>
        </div>
        
        <div class="text-center mb-10">
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
            欢迎回来
          </h1>
          <p class="text-base text-gray-500 dark:text-gray-400 font-medium">
            请验证您的管理员身份
          </p>
        </div>
      </div>

      <form @submit.prevent="submitLogin" class="space-y-6 relative z-10">
        
        <div class="relative w-full group">
          <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary-500 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
            </svg>
          </div>
          <input 
            v-model="password"
            type="password"
            placeholder="Access Token"
            :disabled="isLoading"
            class="w-full bg-transparent border border-gray-200 dark:border-white/20 rounded-xl py-3.5 pl-11 pr-4 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:border-primary-500 dark:focus:border-primary-400 focus:ring-1 focus:ring-primary-500/50 dark:focus:ring-primary-400/50 outline-none transition-all duration-300 disabled:opacity-50"
          />
          <p v-if="error" class="absolute -bottom-6 left-1 text-xs text-red-500 font-medium">{{ error }}</p>
        </div>
        
        <FluidButton 
          type="submit"
          class="w-full !rounded-xl !py-3.5 !text-base font-bold shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300"
          :loading="isLoading"
          variant="primary"
          size="lg"
        >
          <span v-if="!isLoading">授权登录</span>
          <span v-else>验证中...</span>
        </FluidButton>

      </form>
    </div>
    
    <div class="mt-8 text-center opacity-60 hover:opacity-100 transition-opacity">
        <a href="/" class="text-xs text-gray-400 dark:text-gray-500 font-medium hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          &larr; 返回首页
        </a>
    </div>
  </div>
</template>