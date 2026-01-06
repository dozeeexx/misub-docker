<script setup>
defineProps({
  settings: {
    type: Object,
    required: true
  },
  disguiseConfig: {
    type: Object,
    required: true
  }
});
</script>

<template>
  <div class="space-y-6">
    <!-- 订阅基本信息配置 -->
    <div
      class="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-4 border border-gray-100 dark:border-gray-700 shadow-sm">
      <h3 class="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24"
          stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        订阅配置
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">自定义订阅文件名</label>
          <input type="text" v-model="settings.FileName"
            class="block w-full px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white transition-colors">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">自定义订阅Token</label>
          <input type="text" v-model="settings.mytoken"
            class="block w-full px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white transition-colors">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">订阅组分享Token</label>
          <input type="text" v-model="settings.profileToken" placeholder="用于生成订阅组链接专用Token"
            class="block w-full px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white transition-colors">
        </div>
      </div>
    </div>

    <!-- 功能开关区域 -->
    <div
      class="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-4 border border-gray-100 dark:border-gray-700 shadow-sm">
      <h3 class="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24"
          stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
        功能控制
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- 访问日志 -->
        <div
          class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-lg">
          <div>
            <p class="text-sm font-medium text-gray-900 dark:text-gray-200">开启访问日志 & 计数</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">记录订阅访问并统计流量与IP</p>
          </div>
          <label class="toggle-switch flex-shrink-0">
            <input type="checkbox" v-model="settings.enableAccessLog">
            <span class="slider"></span>
          </label>
        </div>

        <!-- 流量统计节点 -->
        <div
          class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-lg">
          <div>
            <p class="text-sm font-medium text-gray-900 dark:text-gray-200">显示流量统计节点</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">在订阅中生成虚拟节点显示剩余流量</p>
          </div>
          <label class="toggle-switch flex-shrink-0">
            <input type="checkbox" v-model="settings.enableTrafficNode">
            <span class="slider"></span>
          </label>
        </div>
      </div>
    </div>

    <!-- 公开页 Hero 设置 -->
    <div
      class="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-4 border border-gray-100 dark:border-gray-700 shadow-sm">
      <h3 class="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24"
          stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        公开页 Hero 设置
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">主标题 (第一行)</label>
          <input type="text" v-model="settings.heroTitle1" placeholder="默认：发现优质"
            class="block w-full px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white transition-colors">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">主标题 (第二行)</label>
          <input type="text" v-model="settings.heroTitle2" placeholder="默认：订阅资源"
            class="block w-full px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white transition-colors">
        </div>
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">副标题 / 描述</label>
          <input type="text" v-model="settings.heroDescription" placeholder="默认：浏览并获取由管理员分享的精选订阅组合，一键导入到您的客户端。"
            class="block w-full px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white transition-colors">
        </div>
      </div>
    </div>

    <!-- Web 访问控制 -->
    <div
      class="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-4 border border-gray-100 dark:border-gray-700 shadow-sm">
      <h3 class="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24"
          stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
        Web 访问控制
      </h3>

      <div
        class="bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-700 overflow-hidden">
        <!-- 公开页访问 -->
        <div
          class="p-4 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors">
          <div>
            <p class="text-sm font-medium text-gray-900 dark:text-gray-200">允许未登录访问公开页</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">关闭后访问首页将跳转登录页面</p>
          </div>
          <label class="toggle-switch flex-shrink-0">
            <input type="checkbox" v-model="settings.enablePublicPage">
            <span class="slider"></span>
          </label>
        </div>

        <!-- 伪装页面 -->
        <div class="p-4 space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-gray-200">启用伪装页面</p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">浏览器访问订阅链接时显示伪装内容，防止被探测</p>
            </div>
            <label class="toggle-switch flex-shrink-0">
              <input type="checkbox" v-model="disguiseConfig.enabled">
              <span class="slider"></span>
            </label>
          </div>

            <div v-show="disguiseConfig.enabled"
            class="bg-white dark:bg-gray-800 rounded-md p-4 space-y-4 border border-gray-200 dark:border-gray-600 transition-all duration-300">
            <div>
              <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">伪装策略</label>
              <div class="flex flex-col sm:flex-row gap-4">
                <label class="flex items-center cursor-pointer group">
                  <input type="radio" value="default" v-model="disguiseConfig.pageType"
                    class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 dark:bg-gray-800">
                  <div class="ml-3">
                    <span
                      class="block text-sm font-medium text-gray-900 dark:text-gray-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">默认
                      404</span>
                    <span class="block text-xs text-gray-500">显示标准的 404 Not Found 页面</span>
                  </div>
                </label>
                <label class="flex items-center cursor-pointer group">
                  <input type="radio" value="redirect" v-model="disguiseConfig.pageType"
                    class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 dark:bg-gray-800">
                  <div class="ml-3">
                    <span
                      class="block text-sm font-medium text-gray-900 dark:text-gray-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">URL
                      跳转</span>
                    <span class="block text-xs text-gray-500">自动重定向到指定的网页地址</span>
                  </div>
                </label>
              </div>
            </div>

            <div v-if="disguiseConfig.pageType === 'redirect'" class="animate-fade-in-down">
              <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">目标网址</label>
              <div class="relative rounded-md shadow-xs">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span class="text-gray-500 sm:text-sm">https://</span>
                </div>
                <input type="url" v-model="disguiseConfig.redirectUrl" placeholder="www.example.com"
                  class="block w-full pl-16 sm:pl-14 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white">
              </div>
            </div>

            <div
              class="flex items-start gap-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0 mt-0.5" viewBox="0 0 20 20"
                fill="currentColor">
                <path fill-rule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clip-rule="evenodd" />
              </svg>
              <span>伪装仅对浏览器 (User-Agent) 访问生效，不会影响 Clash、V2Ray 等代理客户端的正常订阅更新。</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Toggle Switch CSS */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .4s;
  border-radius: 34px;
}

.dark .slider {
  background-color: #4b5563;
}

.slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

input:checked+.slider {
  background-color: #4f46e5;
}

.dark input:checked+.slider {
  background-color: #16a34a;
}

input:checked+.slider:before {
  transform: translateX(20px);
}

.animate-fade-in-down {
  animation: fadeInDown 0.3s ease-out;
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
