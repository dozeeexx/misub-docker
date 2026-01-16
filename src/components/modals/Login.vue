<script setup>
import { ref } from 'vue';
import Input from '../ui/Input.vue';
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
  <div class="w-full max-w-md">
    <!-- Cosmic Glass Card -->
    <div class="glass-panel border border-white/20 dark:border-white/10 rounded-3xl p-8 sm:p-12 transition-all duration-500 hover:shadow-2xl hover:shadow-primary-500/10">
      <div class="flex flex-col items-center">
        <!-- Dynamic Logo -->
        <div class="w-24 h-24 mb-6 relative group">
           <div class="absolute inset-0 bg-primary-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
           <svg width="100%" height="100%" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" class="text-primary-500 dark:text-primary-400 transform group-hover:scale-110 transition-transform duration-500 drop-shadow-lg relative z-10 rounded-full">
              <path fill="currentColor" d="M64 128a64 64 0 1 1 64-64a64.07 64.07 0 0 1-64 64Zm0-122a58 58 0 1 0 58 58A58.07 58.07 0 0 0 64 6Z"/>
              <path fill="currentColor" d="M64 100a36 36 0 1 1 36-36a36 36 0 0 1-36 36Zm0-66a30 30 0 1 0 30 30a30 30 0 0 0-30-30Z"/>
              <path fill="currentColor" d="M64 78a14 14 0 1 1 14-14a14 14 0 0 1-14 14Zm0-22a8 8 0 1 0 8 8a8 8 0 0 0-8-8Z"/>
           </svg>
        </div>
        
        <h1 class="text-4xl font-display font-bold bg-gradient-to-br from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent mb-2">MiSub</h1>
        <p class="text-gray-500 dark:text-gray-400 font-medium text-center">请输入管理员密码以继续</p>
      </div>

      <form @submit.prevent="submitLogin" class="mt-8 space-y-6">
        
        <Input 
          v-model="password"
          type="password"
          placeholder="管理员密码"
          :error="error"
          :disabled="isLoading"
          icon="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
        
        <FluidButton 
          type="submit"
          class="w-full"
          :loading="isLoading"
          variant="primary"
          size="lg"
        >
          {{ isLoading ? '验证中...' : '授权访问' }}
        </FluidButton>

      </form>
    </div>
  </div>
</template>