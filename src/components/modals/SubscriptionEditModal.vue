<script setup>
import { computed, ref } from 'vue';
import { useToastStore } from '../../stores/toast.js';
import Modal from '../forms/Modal.vue';

const props = defineProps({
  show: Boolean,
  isNew: Boolean,
  editingSubscription: Object
});

const emit = defineEmits(['update:show', 'confirm']);
const { showToast } = useToastStore();

const excludeRuleTextarea = ref(null);
const excludeRuleHighlight = ref(null);

const excludeRuleLines = computed(() => {
  const text = props.editingSubscription?.exclude ?? '';
  const lines = text.split('\n');
  return lines.length ? lines : [''];
});

const excludeRuleState = computed(() => {
  const text = props.editingSubscription?.exclude ?? '';
  const rawLines = text.split('\n');
  const lines = rawLines.map(line => line.trim());
  const hasContent = lines.some(line => line);
  const dividerIndex = lines.findIndex(line => line === '---');
  const hasDivider = dividerIndex !== -1;
  const hasKeepPrefix = lines.some(line => line.toLowerCase().startsWith('keep:'));

  let tag = '未设置';
  if (hasContent) {
    if (hasDivider) tag = '混合';
    else if (hasKeepPrefix) tag = '仅包含';
    else tag = '排除';
  }

  const tagClassMap = {
    '未设置': 'bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-300',
    '排除': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200',
    '仅包含': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200',
    '混合': 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-200'
  };

  const errors = [];
  rawLines.forEach((rawLine, index) => {
    let line = rawLine.trim();
    if (!line) return;
    if (line === '---') return;

    if (line.toLowerCase().startsWith('keep:')) {
      line = line.substring('keep:'.length).trim();
      if (!line) {
        errors.push({ line: index + 1, message: 'keep: 后内容为空' });
        return;
      }
    }

    if (line.toLowerCase().startsWith('proto:')) {
      const protocols = line.substring('proto:'.length)
        .split(',')
        .map(p => p.trim())
        .filter(Boolean);
      if (protocols.length === 0) {
        errors.push({ line: index + 1, message: 'proto: 后未填写协议' });
      }
      return;
    }

    try {
      new RegExp(line);
    } catch (e) {
      errors.push({ line: index + 1, message: '正则无效' });
    }
  });

  return {
    tag,
    tagClass: tagClassMap[tag] || tagClassMap['未设置'],
    errors,
    errorsText: errors.map(item => `第${item.line}行：${item.message}`).join('；')
  };
});

const excludeRuleErrorLines = computed(() => new Set(
  excludeRuleState.value.errors.map(item => item.line)
));

const syncExcludeRuleScroll = () => {
  if (!excludeRuleTextarea.value || !excludeRuleHighlight.value) return;
  excludeRuleHighlight.value.scrollTop = excludeRuleTextarea.value.scrollTop;
  excludeRuleHighlight.value.scrollLeft = excludeRuleTextarea.value.scrollLeft;
};

const handleConfirm = () => {
  if (excludeRuleState.value.errors.length > 0) {
    showToast('包含/排除规则有误，请先修正', 'error');
    return;
  }
  emit('confirm');
};
</script>

<template>
  <Modal
    v-if="editingSubscription"
    :show="show"
    size="2xl"
    :confirm-disabled="excludeRuleState.errors.length > 0"
    confirm-button-title="请先修正规则"
    @update:show="emit('update:show', $event)"
    @confirm="handleConfirm"
  >
    <template #title>
      <h3 class="text-lg font-bold text-gray-800 dark:text-white">
        {{ isNew ? '新增订阅' : '编辑订阅' }}
      </h3>
    </template>
    <template #body>
      <div class="space-y-4">
        <div>
          <label for="sub-edit-name" class="block text-sm font-medium text-gray-700 dark:text-gray-300">订阅名称</label>
          <input
            type="text"
            id="sub-edit-name"
            v-model="editingSubscription.name"
            placeholder="（可选）不填将自动获取"
            class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white"
          >
        </div>
        <div>
          <label for="sub-edit-url" class="block text-sm font-medium text-gray-700 dark:text-gray-300">订阅链接</label>
          <input
            type="text"
            id="sub-edit-url"
            v-model="editingSubscription.url"
            placeholder="https://..."
            class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono dark:text-white"
          >
        </div>
        <div>
          <div class="flex items-center gap-2">
            <label for="sub-edit-exclude" class="block text-sm font-medium text-gray-700 dark:text-gray-300">包含/排除节点</label>
            <span :class="['text-xs px-2 py-0.5 rounded-full', excludeRuleState.tagClass]">{{ excludeRuleState.tag }}</span>
          </div>
          <div class="mt-1 flex gap-2">
            <div class="select-none text-xs sm:text-sm font-mono leading-6 pt-2 text-gray-400 dark:text-gray-500">
              <div
                v-for="(_, index) in excludeRuleLines"
                :key="index"
                :class="excludeRuleErrorLines.has(index + 1) ? 'text-red-600 dark:text-red-400' : ''"
              >
                {{ index + 1 }}
              </div>
            </div>
            <div
              :class="[
                'relative w-full min-w-0 rounded-md shadow-xs',
                excludeRuleState.errors.length
                  ? 'border border-red-400 focus-within:ring-1 focus-within:ring-red-500'
                  : 'border border-gray-300 dark:border-gray-600 focus-within:ring-1 focus-within:ring-indigo-500'
              ]"
            >
              <div
                ref="excludeRuleHighlight"
                class="absolute inset-0 overflow-auto px-3 py-2 text-transparent font-mono text-sm leading-6 whitespace-pre-wrap break-words pointer-events-none"
              >
                <div
                  v-for="(line, index) in excludeRuleLines"
                  :key="index"
                  :class="excludeRuleErrorLines.has(index + 1) ? 'bg-red-100/70 dark:bg-red-900/30' : ''"
                  class="whitespace-pre-wrap break-words"
                >{{ line || ' ' }}</div>
              </div>
              <textarea
                id="sub-edit-exclude"
                ref="excludeRuleTextarea"
                v-model="editingSubscription.exclude"
                placeholder="[排除模式(默认)]&#10;proto:vless,trojan&#10;(过期|官网)&#10;---&#10;[包含模式(只保留匹配项)]&#10;keep:(香港|HK)&#10;keep:proto:ss"
                rows="5"
                class="relative z-10 block w-full min-w-0 px-3 py-2 bg-transparent focus:outline-hidden sm:text-sm font-mono dark:text-white leading-6"
                @scroll="syncExcludeRuleScroll"
                @input="syncExcludeRuleScroll"
              ></textarea>
            </div>
          </div>
          <div v-if="excludeRuleState.errors.length" class="mt-2 text-xs text-red-600 dark:text-red-400">
            规则有误：{{ excludeRuleState.errorsText }}
          </div>
          <details class="mt-2 text-xs text-gray-500 dark:text-gray-400 sm:hidden">
            <summary class="cursor-pointer select-none">规则说明</summary>
            <div class="mt-2 space-y-1">
              <p>每行一条规则，忽略空行，大小写不敏感，支持正则表达式。</p>
              <p><code class="font-mono">proto:</code> 用于协议匹配（如 <code class="font-mono">proto:ss,vmess</code>）。</p>
              <p><code class="font-mono">---</code> 上方为排除，下方为包含；没有分隔符时，出现 <code class="font-mono">keep:</code> 则仅保留匹配项。</p>
              <p>名称匹配示例：<code class="font-mono">(香港|HK)</code>、<code class="font-mono">US_\\d+</code>。</p>
              <p>混合示例：上方排除 <code class="font-mono">proto:trojan</code>，下方仅保留 <code class="font-mono">keep:(日本|JP)</code>。</p>
            </div>
          </details>
          <div class="mt-2 text-xs text-gray-500 dark:text-gray-400 space-y-1 hidden sm:block">
            <p>每行一条规则，忽略空行，大小写不敏感，支持正则表达式。</p>
            <p><code class="font-mono">proto:</code> 用于协议匹配（如 <code class="font-mono">proto:ss,vmess</code>）。</p>
            <p><code class="font-mono">---</code> 上方为排除，下方为包含；没有分隔符时，出现 <code class="font-mono">keep:</code> 则仅保留匹配项。</p>
            <p>名称匹配示例：<code class="font-mono">(香港|HK)</code>、<code class="font-mono">US_\\d+</code>。</p>
            <p>混合示例：上方排除 <code class="font-mono">proto:trojan</code>，下方仅保留 <code class="font-mono">keep:(日本|JP)</code>。</p>
          </div>
        </div>
        <div>
          <label for="sub-edit-ua" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            自定义 User-Agent
            <span class="text-xs text-gray-500 ml-2">(可选,留空使用默认)</span>
          </label>
          <select
            id="sub-edit-ua"
            v-model="editingSubscription.customUserAgent"
            class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md dark:text-white"
          >
            <option value="">使用默认 UA</option>
            <option value="clash.meta">Clash Meta</option>
            <option value="v2rayN/7.23">v2rayN</option>
            <option value="Shadowrocket/1.9.0">Shadowrocket</option>
            <option value="Mozilla/5.0">Mozilla</option>
          </select>
          <p v-if="editingSubscription.customUserAgent" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            当前 UA: {{ editingSubscription.customUserAgent }}
          </p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">备注</label>
          <textarea
            v-model="editingSubscription.notes"
            placeholder="例如: 官网: example.com | 价格: ¥20/月 | 到期: 2024-12-31"
            rows="2"
            class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md dark:text-white"
          ></textarea>
        </div>
      </div>
    </template>
  </Modal>
</template>
