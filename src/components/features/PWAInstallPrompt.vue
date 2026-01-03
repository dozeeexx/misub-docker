<script setup>
import { ref, onMounted } from 'vue';
import { useToastStore } from '../../stores/toast.js';
import { TIMING } from '../../constants/timing.js';

const isDev = import.meta.env.DEV;

const { showToast } = useToastStore();
const canInstall = ref(false);
const deferredPrompt = ref(null);
const isInstalled = ref(false);

// 检查是否已安装
const checkIfInstalled = () => {


  // 检查是否在独立模式下运行（已安装）
  if (window.matchMedia('(display-mode: standalone)').matches) {

    isInstalled.value = true;
    canInstall.value = false; // 已安装时不显示安装按钮
    return true;
  }

  // 检查是否在PWA环境中（iOS Safari）
  if (window.navigator.standalone === true) {

    isInstalled.value = true;
    canInstall.value = false; // 已安装时不显示安装按钮
    return true;
  }

  // 检查localStorage中是否有安装标记
  if (localStorage.getItem('pwa-installed') === 'true') {

    isInstalled.value = true;
    canInstall.value = false; // 已安装时不显示安装按钮
    return true;
  }

  // 检查URL是否包含PWA启动参数
  if (window.location.search.includes('source=pwa') || window.location.search.includes('mode=standalone')) {

    isInstalled.value = true;
    canInstall.value = false; // 已安装时不显示安装按钮
    localStorage.setItem('pwa-installed', 'true');
    return true;
  }


  return false;
};

// 安装PWA
const installPWA = async () => {
  if (!deferredPrompt.value) {
    showToast('当前浏览器不支持PWA安装，请使用Chrome或Edge浏览器', 'warning');
    return;
  }

  try {
    // 显示安装提示
    deferredPrompt.value.prompt();
    
    // 等待用户响应
    const { outcome } = await deferredPrompt.value.userChoice;
    
    if (outcome === 'accepted') {
      showToast('应用安装成功！您可以在桌面或主屏幕找到MiSub', 'success');
      canInstall.value = false;
      isInstalled.value = true;
      // 标记已安装到localStorage
      localStorage.setItem('pwa-installed', 'true');
    } else {
      showToast('安装已取消', 'info');
    }
    
    // 清除事件
    deferredPrompt.value = null;
  } catch (error) {
    console.error('PWA安装失败:', error);
    showToast('安装失败，请重试或手动从浏览器菜单安装', 'error');
  }
};

// 显示安装说明
const showInstallGuide = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  let guide = '';
  
  if (userAgent.includes('chrome') && !userAgent.includes('edge')) {
    guide = 'Chrome：点击地址栏右侧的安装图标，或者菜单 → "安装MiSub..."';
  } else if (userAgent.includes('edge')) {
    guide = 'Edge：点击地址栏右侧的应用图标，或者菜单 → "应用" → "安装此站点为应用"';
  } else if (userAgent.includes('safari')) {
    guide = 'Safari：点击分享按钮 → "添加到主屏幕"';
  } else if (userAgent.includes('firefox')) {
    guide = 'Firefox：当前不支持PWA安装，建议使用Chrome或Edge浏览器';
  } else {
    guide = '请在支持PWA的浏览器（如Chrome、Edge）中访问以获得最佳体验';
  }
  
  showToast(guide, 'info', 8000);
};

// 重置安装状态（开发用）
const resetInstallState = () => {
  localStorage.removeItem('pwa-installed');
  isInstalled.value = false;
  canInstall.value = false;
  if (isDev) {
    console.debug('🔄 PWA安装状态已重置');
    console.debug('重置后状态:', {
      isInstalled: isInstalled.value,
      canInstall: canInstall.value,
      localStorage: localStorage.getItem('pwa-installed')
    });
  }
  // 显示提示
  showToast('🔄 PWA状态已重置，刷新页面测试安装功能', 'info', 5000);
};

// 在开发环境中暴露重置函数
if (import.meta.env.DEV) {
  window.resetPWAInstallState = resetInstallState;
}

onMounted(() => {


  // 检查是否已安装
  if (checkIfInstalled()) {

    return; // 已安装则退出，不显示任何安装内容
  }

  // 未安装时，显示安装说明按钮，等待beforeinstallprompt事件升级为直接安装按钮


  // 监听beforeinstallprompt事件
  window.addEventListener('beforeinstallprompt', (e) => {


    // 阻止浏览器自动显示安装提示
    e.preventDefault();

    // 保存事件，稍后手动触发
    deferredPrompt.value = e;
    canInstall.value = true; // 升级为直接安装按钮
  });

  // 监听appinstalled事件
  window.addEventListener('appinstalled', () => {
    if (isDev) {
      console.debug('PWA已成功安装');
    }
    canInstall.value = false;
    isInstalled.value = true;
    localStorage.setItem('pwa-installed', 'true');
    showToast('MiSub已成功安装！', 'success');
  });

  // 监听显示模式变化（安装后会触发）
  const mediaQuery = window.matchMedia('(display-mode: standalone)');
  const handleDisplayModeChange = (e) => {
    if (e.matches) {

      canInstall.value = false;
      isInstalled.value = true;
      localStorage.setItem('pwa-installed', 'true');
    }
  };

  mediaQuery.addListener(handleDisplayModeChange);

  // 定期检查安装状态（用于处理某些浏览器延迟检测）
  const checkInterval = setInterval(() => {
    if (checkIfInstalled()) {
      clearInterval(checkInterval);
    }
  }, TIMING.PWA_CHECK_INTERVAL_MS);

  // 清理定时器（组件卸载时）
  const cleanup = () => {
    clearInterval(checkInterval);
    mediaQuery.removeListener(handleDisplayModeChange);
  };

  // 在组件卸载时清理
  window.addEventListener('beforeunload', cleanup);

  // 检查Service Worker支持
  if (!('serviceWorker' in navigator)) {
    console.warn('当前浏览器不支持Service Worker');
  }
});
</script>

<template>
  <!-- 安装按钮（在头部或菜单中使用） -->
  <!-- PWA安装/说明按钮 (Icon Only) -->
  <div v-if="!isInstalled" class="install-button-container">
    <button
      v-if="canInstall"
      @click="installPWA"
      class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white smooth-all hover:scale-110 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
      title="安装应用"
    >
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    </button>

    <button
      v-else
      @click="showInstallGuide"
      class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white smooth-all hover:scale-110 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
      title="安装说明"
    >
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    </button>
  </div>

  <!-- 已安装状态提示 - 隐藏，因为用户已经在使用应用 -->
  <!-- <div v-if="isInstalled" class="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-sm font-medium rounded-lg">
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
    </svg>
    应用已安装
  </div> -->
</template>

<style scoped>
.install-button-container {
  display: inline-block;
}

/* 移动端响应式优化 */
/* 移动端响应式优化 - 已移除，保持与其他图标一致大小 */
</style>
