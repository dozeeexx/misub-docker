<script setup>
import { computed, ref } from 'vue';
import Switch from '../../../ui/Switch.vue';

const props = defineProps({
  settings: {
    type: Object,
    required: true
  }
});

const telegramPushConfig = computed({
  get() {
    return props.settings.telegram_push_config || {
      enabled: true,
      bot_token: '',
      webhook_secret: '',
      allowed_user_ids: [],
      allow_all_users: false
    };
  },
  set(value) {
    props.settings.telegram_push_config = value;
  }
});

const allowedUsersStr = computed({
  get() {
    return (telegramPushConfig.value.allowed_user_ids || []).join(', ');
  },
  set(value) {
    const ids = value.split(',').map(id => id.trim()).filter(Boolean);
    telegramPushConfig.value = {
      ...telegramPushConfig.value,
      allowed_user_ids: ids
    };
  }
});

const webhookUrl = computed(() => `${window.location.origin}/api/telegram/webhook`);

const setWebhookUrl = computed(() => {
  const botToken = telegramPushConfig.value.bot_token?.trim();
  const secret = telegramPushConfig.value.webhook_secret?.trim();

  if (!botToken || !secret) {
    return '';
  }

  return `https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(webhookUrl.value)}&secret_token=${encodeURIComponent(secret)}`;
});

function copyText(value) {
  if (value) {
    navigator.clipboard.writeText(value);
  }
}

const showSetupGuide = ref(false);
const showUsageGuide = ref(false);
const isTesting = ref(false);
const testResult = ref(null);

async function testNotification() {
  isTesting.value = true;
  testResult.value = null;

  try {
    const response = await fetch('/api/test_notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        botToken: props.settings.BotToken,
        chatId: props.settings.ChatID
      })
    });

    const data = await response.json();
    if (data.success) {
      testResult.value = { success: true, message: '测试成功，消息已发送。' };
    } else {
      testResult.value = {
        success: false,
        message: data.error || '测试失败',
        detail: data.detail
      };
    }
  } catch (error) {
    testResult.value = {
      success: false,
      message: error.message || '请求失败'
    };
  } finally {
    isTesting.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <section class="bg-white/90 dark:bg-gray-900/70 misub-radius-lg p-6 border border-gray-100/80 dark:border-white/10 shadow-sm space-y-4">
      <div class="flex items-center justify-between gap-4">
        <div>
          <h3 class="text-base font-semibold text-gray-900 dark:text-white">Telegram 通知 Bot</h3>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">用于发送普通通知，复用现有 `BotToken` / `ChatID` 配置。</p>
        </div>
      </div>

      <div class="flex flex-col sm:flex-row sm:items-center gap-3">
        <button
          type="button"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium misub-radius-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          :disabled="isTesting || !settings.BotToken || !settings.ChatID"
          @click="testNotification"
        >
          <svg v-if="isTesting" class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>{{ isTesting ? '测试中...' : '发送测试通知' }}</span>
        </button>

        <div
          v-if="testResult"
          class="text-sm"
          :class="testResult.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'"
        >
          <span>{{ testResult.message }}</span>
          <details v-if="testResult.detail" class="mt-2 text-xs font-mono bg-gray-100 dark:bg-gray-900 p-2 rounded max-h-32 overflow-auto">
            <summary class="cursor-pointer text-gray-500">查看详情</summary>
            <pre>{{ JSON.stringify(testResult.detail, null, 2) }}</pre>
          </details>
        </div>
      </div>
    </section>

    <section class="bg-white/90 dark:bg-gray-900/70 misub-radius-lg p-6 border border-gray-100/80 dark:border-white/10 shadow-sm space-y-6">
      <div class="flex items-center justify-between gap-4">
        <div>
          <h3 class="text-base font-semibold text-gray-900 dark:text-white">Telegram Push Bot</h3>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">用于通过 Telegram 导入、管理节点和订阅。</p>
        </div>
        <Switch v-model="telegramPushConfig.enabled" />
      </div>

      <div v-if="telegramPushConfig.enabled" class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Push Bot Token</label>
            <input
              v-model="telegramPushConfig.bot_token"
              type="text"
              placeholder="123456:ABC-DEF..."
              class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 misub-radius-md shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white"
            >
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">独立的 Bot，用于接收用户发送的节点和订阅链接。</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Webhook Secret（必填）</label>
            <input
              v-model="telegramPushConfig.webhook_secret"
              type="text"
              placeholder="random-secret-token"
              class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 misub-radius-md shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white"
            >
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">用于校验请求来源。后端在未配置时会直接拒绝 webhook 请求。</p>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">允许的用户 ID（白名单）</label>
          <textarea
            v-model="allowedUsersStr"
            rows="2"
            placeholder="123456789, 987654321"
            class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 misub-radius-md shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white"
          />
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            多个 ID 用逗号分隔。默认情况下，白名单为空会拒绝所有请求。
            <a href="https://t.me/userinfobot" target="_blank" class="text-indigo-600 hover:text-indigo-500">获取你的 User ID</a>
          </p>
        </div>

        <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 misub-radius-md p-4">
          <div class="flex items-start justify-between gap-4">
            <div>
              <label class="block text-sm font-medium text-amber-900 dark:text-amber-200">公开访问（高风险）</label>
              <p class="mt-1 text-xs text-amber-800 dark:text-amber-300">只在你明确需要允许任意 Telegram 用户访问时再开启。开启后，空白名单不会再拦截请求。</p>
            </div>
            <Switch v-model="telegramPushConfig.allow_all_users" />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Webhook URL</label>
          <div class="mt-1 flex misub-radius-md shadow-xs">
            <input
              :value="webhookUrl"
              type="text"
              readonly
              class="flex-1 block w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-l-md sm:text-sm dark:text-white"
            >
            <button
              type="button"
              class="inline-flex items-center px-4 py-2 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-md bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-hidden"
              @click="copyText(webhookUrl)"
            >
              复制
            </button>
          </div>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Telegram 会把更新推送到这个地址。</p>
        </div>

        <div v-if="setWebhookUrl">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">setWebhook 链接</label>
          <div class="mt-1 flex misub-radius-md shadow-xs">
            <input
              :value="setWebhookUrl"
              type="text"
              readonly
              class="flex-1 block w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-l-md sm:text-sm dark:text-white font-mono text-xs"
            >
            <button
              type="button"
              class="inline-flex items-center px-4 py-2 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-md bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-hidden"
              @click="copyText(setWebhookUrl)"
            >
              复制
            </button>
          </div>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">复制后在浏览器中访问，返回 `{"ok":true}` 即表示设置成功。</p>
        </div>

        <div v-else class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 misub-radius-md p-3">
          <p class="text-xs text-yellow-700 dark:text-yellow-300">填写 `Push Bot Token` 和 `Webhook Secret` 后会自动生成 setWebhook 链接。</p>
        </div>

        <div class="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            class="flex items-center justify-center sm:justify-start gap-2 px-4 py-2 text-sm font-medium misub-radius-md border transition-colors flex-1"
            :class="showSetupGuide
              ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'"
            @click="showSetupGuide = !showSetupGuide"
          >
            <span>配置步骤</span>
          </button>

          <button
            type="button"
            class="flex items-center justify-center sm:justify-start gap-2 px-4 py-2 text-sm font-medium misub-radius-md border transition-colors flex-1"
            :class="showUsageGuide
              ? 'bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300'
              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'"
            @click="showUsageGuide = !showUsageGuide"
          >
            <span>使用说明</span>
          </button>
        </div>

        <div v-if="showSetupGuide" class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 misub-radius-md p-4">
          <ol class="list-decimal list-inside space-y-2 text-sm text-blue-700 dark:text-blue-300">
            <li>在 BotFather 创建一个独立的 Push Bot，填入上方 `Push Bot Token`。</li>
            <li>生成一段随机字符串填入 `Webhook Secret`。</li>
            <li>填写允许访问的 Telegram 用户 ID；如果不填，后端会拒绝所有请求。</li>
            <li>复制上方生成的 `setWebhook` 链接并访问一次。</li>
          </ol>
        </div>

        <div v-if="showUsageGuide" class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 misub-radius-md p-4">
          <div class="space-y-2 text-sm text-green-700 dark:text-green-300">
            <p>常用命令：`/start`、`/help`、`/menu`、`/list`、`/stats`、`/bind`、`/unbind`。</p>
            <p>也可以直接向 Bot 发送节点链接或订阅链接进行导入。</p>
            <p>绑定现在按 Telegram 用户隔离，不同用户的订阅组不会再相互覆盖。</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
