<script setup>
import { defineAsyncComponent, onMounted, ref, onErrorCaptured } from 'vue';
import { useThemeStore } from './stores/theme';
import { useSessionStore } from './stores/session';
import { useToastStore } from './stores/toast';
import { storeToRefs } from 'pinia';

// 懒加载大型组件以提升性能
const Dashboard = defineAsyncComponent(() => import('./components/features/Dashboard/Dashboard.vue'));
const DashboardSkeleton = defineAsyncComponent(() => import('./components/layout/DashboardSkeleton.vue'));
const Login = defineAsyncComponent(() => import('./components/modals/Login.vue'));
const Header = defineAsyncComponent(() => import('./components/layout/Header.vue'));
const Toast = defineAsyncComponent(() => import('./components/ui/Toast.vue'));
const Footer = defineAsyncComponent(() => import('./components/layout/Footer.vue'));
const PWAUpdatePrompt = defineAsyncComponent(() => import('./components/features/PWAUpdatePrompt.vue'));
const PWADevTools = defineAsyncComponent(() => import('./components/features/PWADevTools.vue'));

const themeStore = useThemeStore();
const { theme } = storeToRefs(themeStore);
const { initTheme } = themeStore;

const sessionStore = useSessionStore();
const { sessionState, initialData } = storeToRefs(sessionStore);
const { checkSession, login, logout } = sessionStore;

const toastStore = useToastStore();
const { toast: toastState } = storeToRefs(toastStore);

onMounted(() => {
  // 简单的性能监控（仅在开发模式显示）
  const loadTime = performance.now();
  if (import.meta.env.DEV) {
    console.log(`MiSub App loaded in ${loadTime.toFixed(2)}ms`);
  }

  // 初始化主题和会话
  initTheme();
  checkSession();
});

const error = ref(null);
onErrorCaptured((err) => {
  console.error('Captured Error:', err);
  error.value = err.toString();
  return false; // Stop propagation
});
const reload = () => window.location.reload();
</script>

<template>
  <div 
    :class="theme" 
    class="min-h-screen flex flex-col text-gray-800 dark:text-gray-200 transition-colors duration-300 bg-gray-100 dark:bg-gray-950"
  >
    <Header :is-logged-in="sessionState === 'loggedIn'" @logout="logout" />

    <main 
      class="grow"
      :class="{
        'flex items-center justify-center': sessionState !== 'loggedIn' && sessionState !== 'loading',
        'overflow-y-auto': sessionState === 'loggedIn' || sessionState === 'loading',
        'ios-content-offset': sessionState === 'loggedIn' || sessionState === 'loading'
      }"
    >
      <div v-if="error" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div class="bg-white dark:bg-gray-800 p-6 rounded-xl max-w-lg w-full shadow-2xl border border-red-500">
          <h2 class="text-xl font-bold text-red-600 mb-4">应用发生错误</h2>
          <pre class="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg overflow-auto text-xs font-mono text-red-500 max-h-64">{{ error }}</pre>
          <button @click="reload" class="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg w-full hover:bg-indigo-700">刷新页面</button>
        </div>
      </div>
      <DashboardSkeleton v-else-if="sessionState === 'loading'" />
      <Dashboard v-else-if="sessionState === 'loggedIn' && initialData" :data="initialData" />
      <Login v-else :login="login" />
    </main>
    
    <Toast :show="toastState.id" :message="toastState.message" :type="toastState.type" />
    <PWAUpdatePrompt />
    <PWADevTools />
    <Footer />
  </div>
</template>

<style>
:root {
  --header-height: 80px;
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
}
:root.dark {
  color-scheme: dark;
}
:root.light {
  color-scheme: light;
}

/* iOS内容偏移适配 - 只在iOS设备上生效 */
@supports (-webkit-touch-callout: none) {
  .ios-content-offset {
    /* 为iOS状态栏和Header高度预留空间，防止内容穿透 */
    padding-top: calc(var(--safe-top) + var(--header-height));
    margin-top: 0;
  }
  
  /* 确保整个应用区域正确适配 */
  body {
    padding-top: var(--safe-top);
    padding-bottom: var(--safe-bottom);
  }
  
  /* 全局iOS适配 */
  html, body {
    overflow-x: hidden;
    position: relative;
    height: 100%;
  }
  
  /* 确保内容区域不会穿透 */
  * {
    -webkit-overflow-scrolling: touch;
  }
}

/* 非iOS设备的正常样式 */
@supports not (-webkit-touch-callout: none) {
  .ios-content-offset {
    /* 非iOS设备不需要额外的顶部间距 */
    padding-top: 0;
  }
}
</style>
