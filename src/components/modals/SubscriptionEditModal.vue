<script setup>
import { computed, ref, watch } from 'vue';
import { useToastStore } from '../../stores/toast.js';
import Modal from '../forms/Modal.vue';

const props = defineProps({
  show: Boolean,
  isNew: Boolean,
  editingSubscription: Object
});

const emit = defineEmits(['update:show', 'confirm']);
const { showToast } = useToastStore();

// === 可视化规则编辑器 ===
const isAdvancedMode = ref(false);
const isRuleExpanded = ref(false); // 折叠状态
const ruleMode = ref('exclude'); // 'exclude' | 'keep'
const customKeyword = ref('');

// 预设标签
const presetRegions = [
  { label: '香港', pattern: '(香港|HK|Hong Kong)', icon: '🇭🇰' },
  { label: '台湾', pattern: '(台湾|TW|Taiwan)', icon: '🇹🇼' },
  { label: '日本', pattern: '(日本|JP|Japan)', icon: '🇯🇵' },
  { label: '新加坡', pattern: '(新加坡|SG|Singapore)', icon: '🇸🇬' },
  { label: '美国', pattern: '(美国|US|USA)', icon: '🇺🇸' },
  { label: '韩国', pattern: '(韩国|KR|Korea)', icon: '🇰🇷' },
  { label: '德国', pattern: '(德国|DE|Germany)', icon: '🇩🇪' },
  { label: '英国', pattern: '(英国|UK|Britain)', icon: '🇬🇧' },
];

const presetProtocols = [
  { label: 'SS', pattern: 'proto:ss' },
  { label: 'VMess', pattern: 'proto:vmess' },
  { label: 'VLESS', pattern: 'proto:vless' },
  { label: 'Trojan', pattern: 'proto:trojan' },
  { label: 'Hysteria', pattern: 'proto:hysteria' },
];

const presetKeywords = [
  { label: '官网', pattern: '官网' },
  { label: '过期', pattern: '过期' },
  { label: '剩余', pattern: '(剩余|流量)' },
  { label: '倍率', pattern: '倍率' },
  { label: '测试', pattern: '测试' },
  { label: '维护', pattern: '维护' },
];

// 已选择的规则（内置+自定义）
const selectedRules = ref([]);

// 检查标签是否已选中
const isSelected = (pattern) => {
  return selectedRules.value.some(rule => rule.pattern === pattern);
};

// 切换标签选择
const toggleTag = (tag, type) => {
  const index = selectedRules.value.findIndex(rule => rule.pattern === tag.pattern);
  if (index !== -1) {
    selectedRules.value.splice(index, 1);
  } else {
    selectedRules.value.push({
      ...tag,
      type // 'region' | 'protocol' | 'keyword' | 'custom'
    });
  }
  syncToText();
};

// 添加自定义关键字
const addCustomKeyword = () => {
  const keyword = customKeyword.value.trim();
  if (!keyword) return;

  // 检查是否已存在
  if (selectedRules.value.some(rule => rule.pattern === keyword || rule.label === keyword)) {
    showToast('该关键字已添加', 'warning');
    return;
  }

  selectedRules.value.push({
    label: keyword,
    pattern: keyword,
    type: 'custom'
  });
  customKeyword.value = '';
  syncToText();
};

// 移除规则
const removeRule = (index) => {
  selectedRules.value.splice(index, 1);
  syncToText();
};

// 将可视化选择同步到文本格式
const syncToText = () => {
  if (!props.editingSubscription) return;

  const rules = selectedRules.value.map(rule => {
    if (ruleMode.value === 'keep') {
      return rule.pattern.startsWith('proto:')
        ? `keep:${rule.pattern}`
        : `keep:${rule.pattern}`;
    }
    return rule.pattern;
  });

  props.editingSubscription.exclude = rules.join('\n');
};

// 从文本解析到可视化状态
const parseFromText = () => {
  if (!props.editingSubscription?.exclude) {
    selectedRules.value = [];
    ruleMode.value = 'exclude';
    return;
  }

  const text = props.editingSubscription.exclude;
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // 检测模式
  const hasKeep = lines.some(l => l.toLowerCase().startsWith('keep:'));
  ruleMode.value = hasKeep ? 'keep' : 'exclude';

  // 如果包含 --- 分隔符或复杂混合规则，使用高级模式
  if (lines.includes('---')) {
    isAdvancedMode.value = true;
    return;
  }

  selectedRules.value = [];

  lines.forEach(line => {
    let pattern = line;
    if (pattern.toLowerCase().startsWith('keep:')) {
      pattern = pattern.substring(5).trim();
    }

    // 尝试匹配预设标签
    const allPresets = [...presetRegions, ...presetProtocols, ...presetKeywords];
    const preset = allPresets.find(p => p.pattern === pattern);

    if (preset) {
      const type = presetRegions.includes(preset) ? 'region'
        : presetProtocols.includes(preset) ? 'protocol' : 'keyword';
      selectedRules.value.push({ ...preset, type });
    } else {
      // 作为自定义关键字
      selectedRules.value.push({
        label: pattern,
        pattern: pattern,
        type: 'custom'
      });
    }
  });
};

// 切换模式时更新文本
watch(ruleMode, () => {
  syncToText();
});

// 监听弹窗显示，解析现有规则
watch(() => props.show, (newVal) => {
  if (newVal) {
    parseFromText();
  }
});

// === 高级模式相关（保留原有逻辑） ===
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
  if (isAdvancedMode.value && excludeRuleState.value.errors.length > 0) {
    showToast('包含/排除规则有误，请先修正', 'error');
    return;
  }
  emit('confirm');
};

// 切换到高级模式
const switchToAdvanced = () => {
  isAdvancedMode.value = true;
};

// 切换到可视化模式
const switchToVisual = () => {
  isAdvancedMode.value = false;
  parseFromText();
};
</script>

<template>
  <Modal v-if="editingSubscription" :show="show" size="2xl"
    :confirm-disabled="isAdvancedMode && excludeRuleState.errors.length > 0" confirm-button-title="请先修正规则"
    @update:show="emit('update:show', $event)" @confirm="handleConfirm">
    <template #title>
      <h3 class="text-lg font-bold text-gray-800 dark:text-white">
        {{ isNew ? '新增订阅' : '编辑订阅' }}
      </h3>
    </template>
    <template #body>
      <div class="space-y-4">
        <!-- 订阅名称 -->
        <div>
          <label for="sub-edit-name" class="block text-sm font-medium text-gray-700 dark:text-gray-300">订阅名称</label>
          <input type="text" id="sub-edit-name" v-model="editingSubscription.name" placeholder="（可选）不填将自动获取"
            class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white">
        </div>

        <!-- 订阅链接 -->
        <div>
          <label for="sub-edit-url" class="block text-sm font-medium text-gray-700 dark:text-gray-300">订阅链接</label>
          <input type="text" id="sub-edit-url" v-model="editingSubscription.url" placeholder="https://..."
            class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono dark:text-white">
        </div>

        <!-- 包含/排除节点 -->
        <div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <!-- 折叠头部 -->
          <div @click="isRuleExpanded = !isRuleExpanded"
            class="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
            <div class="flex items-center gap-2">
              <svg class="w-4 h-4 text-gray-500 transition-transform duration-200"
                :class="{ 'rotate-90': isRuleExpanded }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
              <label class="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">包含/排除节点</label>
              <span v-if="selectedRules.length > 0"
                class="px-1.5 py-0.5 text-xs font-medium rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
                {{ selectedRules.length }}
              </span>
            </div>
            <div class="flex items-center gap-2" @click.stop>
              <button v-if="!isAdvancedMode" @click="switchToAdvanced"
                class="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                高级模式
              </button>
              <button v-else @click="switchToVisual"
                class="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                可视化模式
              </button>
            </div>
          </div>

          <!-- 内容区域 -->
          <Transition name="collapse">
            <div v-show="isRuleExpanded" class="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
              <!-- 可视化模式 -->
              <div v-if="!isAdvancedMode" class="space-y-3">
                <!-- 模式选择 -->
                <div class="flex gap-2">
                  <button @click="ruleMode = 'exclude'" :class="[
                    'flex-1 sm:flex-none px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all !min-h-0 !min-w-0',
                    ruleMode === 'exclude'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  ]">
                    排除模式
                  </button>
                  <button @click="ruleMode = 'keep'" :class="[
                    'flex-1 sm:flex-none px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all !min-h-0 !min-w-0',
                    ruleMode === 'keep'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  ]">
                    仅包含模式
                  </button>
                </div>

                <!-- 地区标签 -->
                <div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 mb-1.5">📍 地区</div>
                  <div class="flex flex-wrap gap-1.5">
                    <button v-for="tag in presetRegions" :key="tag.pattern" @click="toggleTag(tag, 'region')" :class="[
                      'px-2.5 py-1 text-xs sm:text-sm font-medium rounded-md transition-all !min-h-0 !min-w-0',
                      isSelected(tag.pattern)
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200 ring-1 ring-indigo-300 dark:ring-indigo-700'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    ]">
                      {{ tag.icon }} {{ tag.label }}
                    </button>
                  </div>
                </div>

                <!-- 协议标签 -->
                <div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 mb-1.5">📡 协议</div>
                  <div class="flex flex-wrap gap-1.5">
                    <button v-for="tag in presetProtocols" :key="tag.pattern" @click="toggleTag(tag, 'protocol')"
                      :class="[
                        'px-2.5 py-1 text-xs sm:text-sm font-medium rounded-md transition-all !min-h-0 !min-w-0',
                        isSelected(tag.pattern)
                          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200 ring-1 ring-indigo-300 dark:ring-indigo-700'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      ]">
                      {{ tag.label }}
                    </button>
                  </div>
                </div>

                <!-- 关键词标签 -->
                <div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 mb-1.5">🏷️ 关键词</div>
                  <div class="flex flex-wrap gap-1.5">
                    <button v-for="tag in presetKeywords" :key="tag.pattern" @click="toggleTag(tag, 'keyword')" :class="[
                      'px-2.5 py-1 text-xs sm:text-sm font-medium rounded-md transition-all !min-h-0 !min-w-0',
                      isSelected(tag.pattern)
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200 ring-1 ring-indigo-300 dark:ring-indigo-700'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    ]">
                      {{ tag.label }}
                    </button>
                  </div>
                </div>

                <!-- 自定义关键字输入 -->
                <div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 mb-1.5">✏️ 自定义关键字</div>
                  <div class="flex gap-2">
                    <input type="text" v-model="customKeyword" @keyup.enter="addCustomKeyword" placeholder="输入关键字，回车添加"
                      class="flex-1 px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 dark:text-white">
                    <button @click="addCustomKeyword"
                      class="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors !min-h-0 !min-w-0">
                      添加
                    </button>
                  </div>
                </div>

                <!-- 已选规则展示 -->
                <div v-if="selectedRules.length > 0">
                  <div class="text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                    📋 已选规则 ({{ selectedRules.length }})
                    <span class="ml-1" :class="ruleMode === 'keep' ? 'text-emerald-600' : 'text-amber-600'">
                      - {{ ruleMode === 'keep' ? '仅保留匹配项' : '排除匹配项' }}
                    </span>
                  </div>
                  <div class="flex flex-wrap gap-1.5 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <span v-for="(rule, index) in selectedRules" :key="index" :class="[
                      'inline-flex items-center gap-1 px-2.5 py-1 text-xs sm:text-sm font-medium rounded-md !min-h-0 !min-w-0',
                      rule.type === 'region' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200' :
                        rule.type === 'protocol' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200' :
                          rule.type === 'custom' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-200' :
                            'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200'
                    ]">
                      {{ rule.icon || '' }}{{ rule.label }}
                      <button @click="removeRule(index)" class="hover:text-red-500 transition-colors !min-h-0 !min-w-0">
                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  </div>
                </div>

                <!-- 提示 -->
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ ruleMode === 'keep' ? '仅保留包含所选关键字的节点' : '排除包含所选关键字的节点' }}
                </p>
              </div>

              <!-- 高级模式（简化版文本编辑器） -->
              <div v-else>
                <div class="flex items-center gap-2 mb-2">
                  <span :class="['text-xs px-2 py-0.5 rounded-full', excludeRuleState.tagClass]">{{ excludeRuleState.tag
                  }}</span>
                </div>
                <textarea id="sub-edit-exclude" v-model="editingSubscription.exclude"
                  placeholder="[排除模式(默认)]&#10;proto:vless,trojan&#10;(过期|官网)&#10;---&#10;[包含模式(只保留匹配项)]&#10;keep:(香港|HK)&#10;keep:proto:ss"
                  rows="8" :class="[
                    'w-full px-3 py-2 rounded-md sm:text-sm font-mono dark:text-white leading-6 resize-none bg-white dark:bg-gray-800',
                    excludeRuleState.errors.length
                      ? 'border border-red-400 focus:ring-1 focus:ring-red-500 focus:outline-hidden'
                      : 'border border-gray-300 dark:border-gray-600 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden'
                  ]"></textarea>
                <div v-if="excludeRuleState.errors.length" class="mt-2 text-xs text-red-600 dark:text-red-400">
                  规则有误：{{ excludeRuleState.errorsText }}
                </div>
                <div class="mt-2 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                  <p>每行一条规则，支持正则表达式。<code class="font-mono">proto:</code> 用于协议匹配。</p>
                  <p><code class="font-mono">keep:</code> 表示仅保留匹配项，<code class="font-mono">---</code> 分隔排除和包含规则。</p>
                </div>
              </div>
            </div>
          </Transition>
        </div>

        <!-- User-Agent -->
        <div>
          <label for="sub-edit-ua" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            自定义 User-Agent
            <span class="text-xs text-gray-500 ml-2">(可选,留空使用默认)</span>
          </label>
          <select id="sub-edit-ua" v-model="editingSubscription.customUserAgent"
            class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md dark:text-white">
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

        <!-- 备注 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">备注</label>
          <textarea v-model="editingSubscription.notes" placeholder="例如: 官网: example.com | 价格: ¥20/月 | 到期: 2024-12-31"
            rows="2"
            class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md dark:text-white"></textarea>
        </div>
      </div>
    </template>
  </Modal>
</template>

<style scoped>
/* 折叠动画 */
.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  max-height: 0;
}

.collapse-enter-to,
.collapse-leave-from {
  opacity: 1;
  max-height: 600px;
}
</style>
