<script setup>
const props = defineProps({
  editingSubscription: {
    type: Object,
    required: true
  }
});
</script>

<template>
  <!-- User-Agent -->
  <div>
    <label for="sub-edit-ua" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
      自定义 User-Agent
      <span class="text-xs text-gray-500 ml-2">(可选,留空使用默认)</span>
    </label>
    <select id="sub-edit-ua" v-model="editingSubscription.customUserAgent"
      class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 misub-radius-md dark:text-white">
      <option value="">使用默认 UA</option>
      <option value="MiSub">MiSub</option>
      <option value="clash-verge/v2.4.3">Clash Verge</option>
      <option value="clash.meta">Clash Meta</option>
      <option value="v2rayN/7.23">v2rayN</option>
      <option value="Shadowrocket/1.9.0">Shadowrocket</option>
      <option value="Mozilla/5.0">Mozilla</option>
    </select>
    <p v-if="editingSubscription.customUserAgent" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
      当前 UA: {{ editingSubscription.customUserAgent }}
    </p>
  </div>

  <!-- 备注 -->
  <div>
    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">备注</label>
    <textarea v-model="editingSubscription.notes" placeholder="例如: 官网: example.com | 价格: ¥20/月 | 到期: 2024-12-31"
      rows="2"
      class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 misub-radius-md dark:text-white"></textarea>
  </div>

  <!-- 保护性缓存节点 -->
  <div class="rounded-lg border border-amber-200 bg-amber-50/70 p-3 dark:border-amber-900/60 dark:bg-amber-950/20">
    <label class="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
      <input type="checkbox" v-model="editingSubscription.enableNodeCache"
        class="mt-0.5 h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500" />
      <span>
        <span class="font-medium text-gray-800 dark:text-gray-200">保护性缓存节点</span>
        <span class="ml-2 text-xs text-amber-700 dark:text-amber-300">适用于订阅保护机场</span>
        <span class="mt-1 block text-xs leading-5 text-gray-500 dark:text-gray-400">
          开启后，成功拉取真实节点时会缓存该机场节点；后续遇到 403、超时、空列表或仅返回流量/到期伪节点时，使用上次成功缓存，避免节点清零。默认关闭，不影响普通机场。
        </span>
      </span>
    </label>
  </div>

  <!-- 兼容 + 号为空格 -->
  <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
    <input type="checkbox" v-model="editingSubscription.plusAsSpace"
      class="h-4 w-4 rounded border-gray-300 text-slate-700 focus:ring-slate-500" />
    节点名称中的 + 视为空格
  </label>
</template>
