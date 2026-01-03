<script setup>
import { computed } from 'vue';

const props = defineProps({
  editingSubscription: {
    type: Object,
    required: true
  },
  isRuleExpanded: {
    type: Boolean,
    default: false
  },
  isAdvancedMode: {
    type: Boolean,
    default: false
  },
  ruleMode: {
    type: String,
    default: 'exclude'
  },
  customKeyword: {
    type: String,
    default: ''
  },
  selectedRules: {
    type: Array,
    default: () => []
  },
  presetRegions: {
    type: Array,
    default: () => []
  },
  presetProtocols: {
    type: Array,
    default: () => []
  },
  presetKeywords: {
    type: Array,
    default: () => []
  },
  excludeRuleState: {
    type: Object,
    required: true
  },
  toggleTag: {
    type: Function,
    required: true
  },
  isSelected: {
    type: Function,
    required: true
  },
  addCustomKeyword: {
    type: Function,
    required: true
  },
  removeRule: {
    type: Function,
    required: true
  },
  switchToAdvanced: {
    type: Function,
    required: true
  },
  switchToVisual: {
    type: Function,
    required: true
  }
});

const emit = defineEmits(['toggle-expand', 'update:ruleMode', 'update:customKeyword']);

const ruleModeModel = computed({
  get: () => props.ruleMode,
  set: (val) => emit('update:ruleMode', val)
});

const customKeywordModel = computed({
  get: () => props.customKeyword,
  set: (val) => emit('update:customKeyword', val)
});
</script>

<template>
  <!-- 包含/排除节点 -->
  <div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
    <!-- 折叠头部 -->
    <div @click="emit('toggle-expand')"
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
            <button @click="ruleModeModel = 'exclude'" :class="[
              'flex-1 sm:flex-none px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all !min-h-0 !min-w-0',
              ruleModeModel === 'exclude'
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            ]">
              排除模式
            </button>
            <button @click="ruleModeModel = 'keep'" :class="[
              'flex-1 sm:flex-none px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all !min-h-0 !min-w-0',
              ruleModeModel === 'keep'
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
            <div class="flex flex-col sm:flex-row gap-2">
              <input type="text" v-model="customKeywordModel" @keyup.enter="addCustomKeyword" placeholder="输入关键字，回车添加"
                class="w-full sm:flex-1 min-w-0 px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 dark:text-white">
              <button @click="addCustomKeyword"
                class="w-full sm:w-auto flex-shrink-0 whitespace-nowrap px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors !min-h-0 !min-w-0">
                添加
              </button>
            </div>
          </div>

          <!-- 已选规则展示 -->
          <div v-if="selectedRules.length > 0">
            <div class="text-xs text-gray-500 dark:text-gray-400 mb-1.5">
              📋 已选规则 ({{ selectedRules.length }})
              <span class="ml-1" :class="ruleModeModel === 'keep' ? 'text-emerald-600' : 'text-amber-600'">
                - {{ ruleModeModel === 'keep' ? '仅保留匹配项' : '排除匹配项' }}
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
            {{ ruleModeModel === 'keep' ? '仅保留包含所选关键字的节点' : '排除包含所选关键字的节点' }}
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
</template>

<style scoped>
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
