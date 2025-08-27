<script setup>
import { ref, onMounted } from 'vue';
import { useToastStore } from '../stores/toast.js';

const { showToast } = useToastStore();
const canInstall = ref(false);
const deferredPrompt = ref(null);
const isInstalled = ref(false);

// 检查是否已安装
const checkIfInstalled = () => {
  // 检查是否在独立模式下运行（已安装）
  if (window.matchMedia('(display-mode: standalone)').matches) {
    isInstalled.value = true;
    return true;
  }
  
  // 检查是否在PWA环境中
  if (window.navigator.standalone === true) {
    isInstalled.value = true;
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

onMounted(() => {
  // 检查是否已安装
  if (checkIfInstalled()) {
    return;
  }
  
  // 监听beforeinstallprompt事件
  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('PWA安装提示事件触发');
    
    // 阻止浏览器自动显示安装提示
    e.preventDefault();
    
    // 保存事件，稍后手动触发
    deferredPrompt.value = e;
    canInstall.value = true;
    
    // 显示友好提示
    setTimeout(() => {
      showToast('发现您可以安装MiSub到桌面，获得更好的使用体验！', 'info', 6000);
    }, 3000);
  });
  
  // 监听appinstalled事件
  window.addEventListener('appinstalled', () => {
    console.log('PWA已成功安装');
    canInstall.value = false;
    isInstalled.value = true;
    showToast('MiSub已成功安装！', 'success');
  });
  
  // 检查Service Worker支持
  if (!('serviceWorker' in navigator)) {
    console.warn('当前浏览器不支持Service Worker');
  }
});
</script>

<template>
  <!-- 安装提示横幅 -->
  <Transition name="install-banner">
    <div
      v-if="canInstall && !isInstalled"
      class="fixed top-20 left-4 right-4 z-40 mx-auto max-w-md sm:left-auto sm:right-4 sm:max-w-sm"
    >
      <div class="bg-gradient-to-r from-green-500 to-emerald-600 backdrop-blur-lg border border-white/20 rounded-xl shadow-2xl overflow-hidden">
        <div class="p-4">
          <div class="flex items-center gap-3">
            <!-- PWA图标 -->
            <div class="flex-shrink-0 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            
            <!-- 消息内容 -->
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-white">
                安装MiSub到桌面
              </p>
              <p class="text-xs text-white/80 mt-1">
                获得更快速的访问体验
              </p>
            </div>
            
            <!-- 操作按钮 -->
            <div class="flex gap-2">
              <button
                @click="installPWA"
                class="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none"
              >
                安装
              </button>
              <button
                @click="canInstall = false"
                class="p-1.5 hover:bg-white/20 text-white rounded-lg transition-colors focus:outline-none"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
  
  <!-- 安装按钮（在头部或菜单中使用） -->
  <div v-if="!isInstalled" class="install-button-container">
    <button
      v-if="canInstall"
      @click="installPWA"
      class="inline-flex items-center gap-2 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500/50"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
      安装应用
    </button>
    
    <button
      v-else
      @click="showInstallGuide"
      class="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      安装说明
    </button>
  </div>
  
  <!-- 已安装状态提示 -->
  <div v-if="isInstalled" class="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-sm font-medium rounded-lg">
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
    </svg>
    应用已安装
  </div>
</template>

<style scoped>
.install-banner-enter-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.install-banner-leave-active {
  transition: all 0.3s ease-in;
}

.install-banner-enter-from {
  transform: translateY(-100%) scale(0.95);
  opacity: 0;
}

.install-banner-leave-to {
  transform: translateY(-100%) scale(0.95);
  opacity: 0;
}

.install-button-container {
  display: inline-block;
}
</style>