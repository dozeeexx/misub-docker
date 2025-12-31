<script setup>
import { ref, computed } from 'vue';
import SubConverterSelector from '@/components/forms/SubConverterSelector.vue';

const props = defineProps({
  settings: {
    type: Object,
    required: true
  }
});

// Telegram Push Bot 配置
const telegramPushConfig = computed({
  get() {
    return props.settings.telegram_push_config || {
      enabled: true,
      bot_token: '',
      webhook_secret: '',
      allowed_user_ids: []
    };
  },
  set(value) {
    props.settings.telegram_push_config = value;
  }
});

// 白名单用户 ID（逗号分隔的字符串）
const allowedUsersStr = computed({
  get() {
    return (telegramPushConfig.value.allowed_user_ids || []).join(', ');
  },
  set(value) {
    const ids = value.split(',').map(id => id.trim()).filter(id => id);
    telegramPushConfig.value = {
      ...telegramPushConfig.value,
      allowed_user_ids: ids
    };
  }
});

// Webhook URL
const webhookUrl = computed(() => {
  return `${window.location.origin}/api/telegram/webhook`;
});

// 复制 Webhook URL
function copyWebhookUrl() {
  navigator.clipboard.writeText(webhookUrl.value);
  // 可以添加 toast 提示
}

// 折叠状态
const showSetupGuide = ref(false);
const showUsageGuide = ref(false);

</script>

<template>
  <div class="space-y-6">
    <h3 class="text-lg font-medium text-gray-900 dark:text-white border-b pb-2 dark:border-gray-700">外部服务</h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SubConverter后端地址</label>
        <SubConverterSelector 
            v-model="settings.subConverter" 
            type="backend" 
            placeholder="选择后端地址" 
            :allowEmpty="false"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SubConverter配置文件</label>
        <SubConverterSelector 
            v-model="settings.subConfig" 
            type="config" 
            placeholder="选择配置" 
            :allowEmpty="false"
        />
      </div>
    </div>

    <!-- Telegram 通知 Bot -->
    <h3 class="text-lg font-medium text-gray-900 dark:text-white border-b pb-2 dark:border-gray-700 mt-8">Telegram 通知 Bot</h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Bot Token</label>
        <input type="text" v-model="settings.BotToken" class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white">
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">用于推送订阅更新通知</p>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Chat ID</label>
        <input type="text" v-model="settings.ChatID" class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white">
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">接收通知的聊天 ID</p>
      </div>
    </div>

    <!-- Telegram 推送 Bot -->
    <h3 class="text-lg font-medium text-gray-900 dark:text-white border-b pb-2 dark:border-gray-700 mt-8">Telegram 推送 Bot</h3>
    <div class="space-y-4">
      <!-- 启用开关 -->
      <div class="flex items-center">
        <input 
          type="checkbox" 
          id="telegram-push-enabled"
          v-model="telegramPushConfig.enabled"
          class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
        >
        <label for="telegram-push-enabled" class="ml-2 block text-sm text-gray-700 dark:text-gray-300">
          启用节点推送功能
        </label>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Bot Token -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            推送 Bot Token
          </label>
          <input 
            type="password" 
            v-model="telegramPushConfig.bot_token" 
            placeholder="123456:ABC-DEF..."
            :disabled="!telegramPushConfig.enabled"
            class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white disabled:opacity-50"
          >
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">独立的 Bot，用于接收节点推送</p>
        </div>

        <!-- Webhook Secret -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Webhook Secret（可选）
          </label>
          <input 
            type="text" 
            v-model="telegramPushConfig.webhook_secret" 
            placeholder="随机字符串"
            :disabled="!telegramPushConfig.enabled"
            class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white disabled:opacity-50"
          >
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">用于验证 Webhook 请求来源</p>
        </div>
      </div>

      <!-- 白名单用户 ID -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
          允许的用户 ID（白名单）
        </label>
        <textarea 
          v-model="allowedUsersStr"
          :disabled="!telegramPushConfig.enabled"
          rows="2"
          placeholder="123456789, 987654321"
          class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white disabled:opacity-50"
        ></textarea>
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
          多个 ID 用逗号分隔。只有这些用户可以通过 Bot 推送节点。
          <a href="https://t.me/userinfobot" target="_blank" class="text-indigo-600 hover:text-indigo-500">
            获取你的 User ID
          </a>
        </p>
      </div>

      <!-- Webhook URL -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Webhook URL
        </label>
        <div class="mt-1 flex rounded-md shadow-xs">
          <input 
            type="text" 
            :value="webhookUrl"
            readonly
            class="flex-1 block w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-l-md sm:text-sm dark:text-white"
          >
          <button 
            @click="copyWebhookUrl"
            type="button"
            class="inline-flex items-center px-4 py-2 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-md bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-hidden"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
          在 BotFather 中使用 /setwebhook 命令设置此 URL
        </p>
      </div>

      <!-- 快速帮助 -->
      <div class="flex flex-col sm:flex-row gap-2">
        <!-- 配置步骤按钮 -->
        <button
          @click="showSetupGuide = !showSetupGuide"
          type="button"
          class="flex items-center justify-center sm:justify-start gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors flex-1"
          :class="showSetupGuide 
            ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300' 
            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'"
        >
          <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
          </svg>
          <span>配置步骤</span>
          <svg 
            class="h-4 w-4 transition-transform ml-auto sm:ml-0" 
            :class="showSetupGuide ? 'rotate-180' : ''"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <!-- 使用说明按钮 -->
        <button
          @click="showUsageGuide = !showUsageGuide"
          type="button"
          class="flex items-center justify-center sm:justify-start gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors flex-1"
          :class="showUsageGuide 
            ? 'bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300' 
            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'"
        >
          <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
          </svg>
          <span>使用说明</span>
          <svg 
            class="h-4 w-4 transition-transform ml-auto sm:ml-0" 
            :class="showUsageGuide ? 'rotate-180' : ''"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      <!-- 配置步骤内容（可折叠） -->
      <transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0 max-h-0"
        enter-to-class="opacity-100 max-h-96"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100 max-h-96"
        leave-to-class="opacity-0 max-h-0"
      >
        <div v-show="showSetupGuide" class="overflow-hidden">
          <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div class="text-sm text-blue-700 dark:text-blue-300">
              <ol class="list-decimal list-inside space-y-1.5">
                <li>在 Telegram 中找到 <a href="https://t.me/botfather" target="_blank" class="underline hover:text-blue-600">@BotFather</a>，创建新的 Bot</li>
                <li>将获得的 Bot Token 填入上方</li>
                <li>复制 Webhook URL，使用命令：<code class="bg-blue-100 dark:bg-blue-800 px-1.5 py-0.5 rounded text-xs">/setwebhook</code></li>
                <li>获取你的 <a href="https://t.me/userinfobot" target="_blank" class="underline hover:text-blue-600">Telegram User ID</a> 并添加到白名单</li>
                <li>保存设置后，向 Bot 发送节点链接即可推送</li>
              </ol>
            </div>
          </div>
        </div>
      </transition>

      <!-- 使用说明内容（可折叠） -->
      <transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0 max-h-0"
        enter-to-class="opacity-100 max-h-[600px]"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100 max-h-[600px]"
        leave-to-class="opacity-0 max-h-0"
      >
        <div v-show="showUsageGuide" class="overflow-hidden">
          <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div class="text-sm text-green-700 dark:text-green-300 space-y-3">
              <!-- Bot 命令 -->
              <div>
                <p class="font-medium mb-1">📖 Bot 命令</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-1 ml-4">
                  <div><code class="bg-green-100 dark:bg-green-800 px-1.5 py-0.5 rounded text-xs">/start</code> - 欢迎信息</div>
                  <div><code class="bg-green-100 dark:bg-green-800 px-1.5 py-0.5 rounded text-xs">/help</code> - 帮助信息</div>
                  <div><code class="bg-green-100 dark:bg-green-800 px-1.5 py-0.5 rounded text-xs">/list</code> - 节点列表</div>
                  <div><code class="bg-green-100 dark:bg-green-800 px-1.5 py-0.5 rounded text-xs">/stats</code> - 统计信息</div>
                </div>
              </div>

              <!-- 推送方式 -->
              <div>
                <p class="font-medium mb-1">📤 推送方式</p>
                <ul class="space-y-0.5 ml-4 text-xs">
                  <li>• 单个：直接发送节点链接</li>
                  <li>• 批量：一次多个（每行一个）</li>
                  <li>• 协议：SS, VMess, Trojan, Hysteria 等</li>
                </ul>
              </div>

              <!-- 注意事项 -->
              <div>
                <p class="font-medium mb-1">⚠️ 注意</p>
                <ul class="space-y-0.5 ml-4 text-xs">
                  <li>• 节点在 <strong>手动节点</strong> 页面查看</li>
                  <li>• 需在 <strong>订阅组</strong> 中勾选使用</li>
                  <li>• 限制：50/分钟，300/天</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>
