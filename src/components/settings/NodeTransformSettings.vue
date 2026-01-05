<script setup>
import { ref, watch, computed } from 'vue';
import DOMPurify from 'dompurify';
import RulePreview from './NodeTransformSettings/RulePreview.vue';
import RuleEditor from './NodeTransformSettings/RuleEditor.vue';

const isDev = import.meta.env.DEV;

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['update:modelValue']);

// --- 基础配置 ---
const config = ref({
  enabled: false,
  rename: {
    regex: { enabled: false, rules: [] },
    template: {
      enabled: false,
      template: '{emoji}{region}-{protocol}-{index}',
      indexStart: 1,
      indexPad: 2,
      indexScope: 'regionProtocol',
      regionAlias: {},
      protocolAlias: { hysteria2: 'hy2' }
    }
  },
  dedup: {
    enabled: false,
    mode: 'serverPort',
    includeProtocol: false,
    prefer: { protocolOrder: ['vless', 'trojan', 'vmess', 'hysteria2', 'ss', 'ssr'] }
  },
  sort: {
    enabled: false,
    nameIgnoreEmoji: true,
    keys: []
  }
});

// --- 预览数据 ---
const DEFAULT_MOCK_NODES = [
  { name: '🇺🇸 美国 [高速] 01 @100M', region: 'US', protocol: 'vmess', server: 'us1.gw', port: '443' },
  { name: 'Hong Kong 01 | IPLC [VIP]', region: 'HK', protocol: 'trojan', server: 'hk1.gw', port: '8443' },
  { name: '🇯🇵 日本 BGP [专线]', region: 'JP', protocol: 'vless', server: 'jp1.gw', port: '443' },
  { name: '新加坡 SG-02 [流媒体]', region: 'SG', protocol: 'shadowsocks', server: 'sg2.gw', port: '8388' },
  { name: '🇨🇳 台湾 Hysteria2 [0.5倍率]', region: 'TW', protocol: 'hysteria2', server: 'tw1.gw', port: '443' },
  { name: '🇰🇷 South Korea SK [原生]', region: 'KR', protocol: 'ss', server: 'kr1.gw', port: '443' },
  { name: '🇩🇪 德国法兰克福 CN2', region: 'DE', protocol: 'vmess', server: 'de1.gw', port: '443' },
  { name: '⛔️ 到期时间: 2099-12-31', region: 'US', protocol: 'trojan', server: 'info.gw', port: '443' }
];
const customNodeInput = ref('');
const customMockNode = ref(null);

const activeMockNodes = computed(() => {
  if (customMockNode.value) {
    return [customMockNode.value, ...DEFAULT_MOCK_NODES.slice(0, 7)];
  }
  return DEFAULT_MOCK_NODES;
});

const addCustomNode = () => {
  if (!customNodeInput.value.trim()) {
    customMockNode.value = null;
    return;
  }
  customMockNode.value = {
    name: customNodeInput.value,
    region: 'US', // 模拟数据，实际无法探测
    protocol: 'vmess',
    server: 'custom.gw',
    port: '443'
  };
};

const previewResult = computed(() => {
  if (!config.value.enabled) return activeMockNodes.value.map(n => n.name);

  return activeMockNodes.value.map((node, index) => {
    let newName = node.name;

    // 1. 正则重命名
    if (config.value.rename.regex.enabled) {
      for (const rule of config.value.rename.regex.rules) {
        try {
          if (!rule.pattern) continue;
          let patternStr = rule.pattern;
          let flags = rule.flags || 'g';
          const regex = new RegExp(patternStr, flags);
          newName = newName.replace(regex, rule.replacement || '');
        } catch (e) {
          if (isDev) {
            console.debug('[NodeTransformSettings] Invalid regex rule:', rule, e);
          }
        }
      }
    }

    // 2. 模板重命名
    if (config.value.rename.template.enabled) {
      const tpl = config.value.rename.template.template || '';
      const regionCode = node.region;  // 地区代码，如 'US'
      const regionZh = REGION_NAMES[regionCode] || regionCode;  // 中文地区名，如 '美国'
      const emoji = getEmoji(regionCode);
      const protocol = node.protocol;
      const idx = String(index + config.value.rename.template.indexStart).padStart(config.value.rename.template.indexPad, '0');

      let processed = tpl
        .replace(/{name}/g, newName)
        .replace(/{region}/g, regionCode)  // {region} 返回地区代码
        .replace(/{emoji}/g, emoji)
        .replace(/{protocol}/g, protocol)
        .replace(/{index}/g, idx)
        .replace(/{server}/g, node.server)
        .replace(/{port}/g, node.port || '')

        // Modifiers
        .replace(/{region:UPPER}/g, regionCode.toUpperCase())  // {region:UPPER} 返回大写地区代码
        .replace(/{region:lower}/g, regionCode.toLowerCase())
        .replace(/{region:zh}/g, regionZh)  // {region:zh} 返回中文地区名
        .replace(/{protocol:UPPER}/g, protocol.toUpperCase())
        .replace(/{protocol:Title}/g, protocol.charAt(0).toUpperCase() + protocol.slice(1))
        .replace(/{name:UPPER}/g, newName.toUpperCase())
        .replace(/{name:lower}/g, newName.toLowerCase());

      newName = processed;
    }

    return newName;
  });
});

// 地区代码 -> 中文名称映射
const REGION_NAMES = {
  'US': '美国', 'HK': '香港', 'JP': '日本', 'SG': '新加坡', 'TW': '台湾', 'KR': '韩国',
  'DE': '德国', 'GB': '英国', 'UK': '英国', 'TR': '土耳其', 'FR': '法国', 'CA': '加拿大', 'AU': '澳大利亚',
  'NL': '荷兰', 'RU': '俄罗斯', 'IN': '印度', 'MY': '马来西亚', 'TH': '泰国', 'VN': '越南',
  'PH': '菲律宾', 'ID': '印尼', 'CH': '瑞士', 'IT': '意大利', 'ES': '西班牙', 'BR': '巴西',
  'AR': '阿根廷', 'MX': '墨西哥', 'ZA': '南非', 'EG': '埃及', 'IL': '以色列', 'AE': '阿联酋',
  'SA': '沙特', 'PL': '波兰', 'CZ': '捷克', 'HU': '匈牙利', 'RO': '罗马尼亚', 'BG': '保加利亚',
  'GR': '希腊', 'PT': '葡萄牙', 'SE': '瑞典', 'NO': '挪威', 'DK': '丹麦', 'FI': '芬兰', 'AT': '奥地利'
};

// 获取地区 Emoji
function getEmoji(regionCode) {
  const map = {
    US: '🇺🇸', HK: '🇭🇰', JP: '🇯🇵', SG: '🇸🇬', TW: '🇨🇳', KR: '🇰🇷',
    GB: '🇬🇧', UK: '🇬🇧', DE: '🇩🇪', FR: '🇫🇷', CA: '🇨🇦', AU: '🇦🇺',
    NL: '🇳🇱', RU: '🇷🇺', IN: '🇮🇳', TR: '🇹🇷', MY: '🇲🇾', TH: '🇹🇭',
    VN: '🇻🇳', PH: '🇵🇭', ID: '🇮🇩', CH: '🇨🇭', IT: '🇮🇹', ES: '🇪🇸',
    BR: '🇧🇷', AR: '🇦🇷', MX: '🇲🇽', ZA: '🇿🇦', EG: '🇪🇬', IL: '🇮🇱',
    AE: '🇦🇪', SA: '🇸🇦', PL: '🇵🇱', CZ: '🇨🇿', HU: '🇭🇺', RO: '🇷🇴',
    BG: '🇧🇬', GR: '🇬🇷', PT: '🇵🇹', SE: '🇸🇪', NO: '🇳🇴', DK: '🇩🇰', FI: '🇫🇮', AT: '🇦🇹'
  };
  return map[regionCode] || '🌍';
}

// --- 规则构建器 ---
const ruleBuilder = ref({
  action: 'remove',
  targetType: 'preset',
  preset: '',
  customInput: '',
  replacement: ''
});

const PRESETS = {
  brackets: { label: '[...] (...) {...} 【...】', pattern: '\\[.*?\\]|\\(.*?\\)|\\{.*?\\}|【.*?】' },
  emoji: { label: '🙂 (Emoji)', pattern: '\\p{Emoji_Presentation}' },
  url: { label: 'example.com (域名/网址)', pattern: '([a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,}' },
  chinese: { label: '中文字符', pattern: '[\\u4e00-\\u9fa5]+' },
  ad: { label: 'VIP|群组|频道|官网|高速|专线|流媒体|倍率', pattern: 'VIP|群组|频道|官网|高速|专线|流媒体|倍率' },
  params: { label: '?foo=bar (网址参数)', pattern: '\\?.*' },
  space: { label: 'Space (多余空格)', pattern: '\\s{2,}' },
  trim: { label: 'Trim (首尾空白)', pattern: '^\\s+|\\s+$' },
  // Expanded Presets
  traffic: { label: '1.5x | 3倍 | 0.x (流量倍率)', pattern: '(\\d+\\.?\\d*|\\.\\d+)\\s*(x|X|倍率?)', flags: 'gi' },
  provider: { label: '专线|BGP|IPLC|IEPL|Relay... (线路)', pattern: '(专线|BGP|IPLC|IEPL|Relay|Premium|Ultra|High Speed)', flags: 'gi' },
  separator: { label: '- | _ | — (无用分隔符)', pattern: '[-|_|—|\\|]+' },
  ip: { label: '127.0.0.1 (IPv4)', pattern: '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b' }
};

const TEMPLATE_PRESETS = [
  { label: '标准', value: '{emoji} {region:zh}-{region:UPPER}-{index}', desc: '🇺🇸 美国-US-01' },
  { label: '极简', value: '{region} {index}', desc: 'US 01' },
  { label: '详细', value: '{emoji} {region} | {protocol} | {name}', desc: '🇺🇸 US | VMESS | 原始名称' },
  { label: '保留', value: '{emoji} {name}', desc: '🇺🇸 原始名称' },
  // Expanded Presets
  { label: '纯净', value: '{emoji} {region:zh} {index}', desc: '🇺🇸 美国 01' },
  { label: '协议', value: '{protocol:UPPER} {index}', desc: 'VMESS 01' },
  { label: '国别', value: '{emoji} {region} {protocol}', desc: '🇺🇸 US VMESS' },
  { label: '标签', value: '[{region:zh}] {name}', desc: '[美国] 原始名称' }
];

const applyTemplate = (tpl) => {
  config.value.rename.template.template = tpl;
};

const sanitizePlainText = (value) => DOMPurify.sanitize(value, {
  ALLOWED_TAGS: [],
  ALLOWED_ATTR: []
});

const sanitizeHighlightedHtml = (value) => DOMPurify.sanitize(value, {
  ALLOWED_TAGS: ['span'],
  ALLOWED_ATTR: ['class']
});

const getHighlightedName = (name) => {
  const safeName = sanitizePlainText(String(name ?? ''));
  // 如果规则构建器没有内容，直接返回原名
  if (!ruleBuilder.value.customInput && ruleBuilder.value.targetType !== 'preset') return safeName;

  let pattern = '';
  if (ruleBuilder.value.targetType === 'preset') {
    const p = PRESETS[ruleBuilder.value.preset];
    pattern = p ? p.pattern : '';
  } else {
    const raw = ruleBuilder.value.customInput;
    if (raw) {
      if (raw.includes('|')) {
        pattern = raw.split('|').map(p => p.trim()).filter(Boolean).map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
      } else {
        pattern = raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }
    }
  }

  if (!pattern) return safeName;

  try {
    let flags = 'g';
    if (ruleBuilder.value.targetType === 'preset') {
      const p = PRESETS[ruleBuilder.value.preset];
      if (p && p.flags) flags = p.flags;
      else if (ruleBuilder.value.preset === 'emoji') flags = 'gu';
    }

    const regex = new RegExp(`(${pattern})`, flags);
    // Highlight matches with red strikethrough
    const highlighted = safeName.replace(regex, '<span class="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 line-through decoration-red-500">$1</span>');
    return sanitizeHighlightedHtml(highlighted);
  } catch (e) {
    return safeName;
  }
};

const getRuleLabel = (rule) => {
  let label = '';
  if (rule.targetType === 'preset') {
    label = PRESETS[rule.preset]?.label || rule.preset;
  } else {
    label = rule.customInput;
  }

  switch (rule.action) {
    case 'remove': return `删除 ${label}`;
    case 'replace': return `替换 ${label} 为 "${rule.replacement}"`;
    case 'prefix': return `添加前缀 "${rule.replacement}"`;
    case 'suffix': return `添加后缀 "${rule.replacement}"`;
    default: return `未知规则`;
  }
};

const addVisualRule = () => {
  let pattern = '';
  let replacement = '';
  let flags = 'g';

  if (ruleBuilder.value.action === 'remove') {
    replacement = '';
  } else if (ruleBuilder.value.action === 'replace') {
    replacement = ruleBuilder.value.replacement;
  } else if (ruleBuilder.value.action === 'prefix') {
    // ... handled below
  } else if (ruleBuilder.value.action === 'suffix') {
    // ... handled below
  }

  // 构建 regex pattern
  if (['remove', 'replace'].includes(ruleBuilder.value.action)) {
    if (ruleBuilder.value.targetType === 'preset') {
      const p = PRESETS[ruleBuilder.value.preset];
      pattern = p ? p.pattern : '';
      if (p && p.flags) flags = p.flags;
      else if (ruleBuilder.value.preset === 'emoji') flags = 'gu';

      // Special handling for replacement for some presets
      if (ruleBuilder.value.preset === 'space' && ruleBuilder.value.action === 'replace') replacement = ' ';
    } else {
      const raw = ruleBuilder.value.customInput;
      if (!raw) return;
      // Support multiple keywords separated by |
      if (raw.includes('|')) {
        pattern = raw.split('|').map(p => p.trim()).filter(Boolean).map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
      } else {
        pattern = raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }
    }
  }

  if (!pattern && ruleBuilder.value.action !== 'prefix' && ruleBuilder.value.action !== 'suffix') return;

  // 前后缀逻辑修正
  if (ruleBuilder.value.action === 'prefix') {
    pattern = '^';
    replacement = ruleBuilder.value.replacement;
  } else if (ruleBuilder.value.action === 'suffix') {
    pattern = '$';
    replacement = ruleBuilder.value.replacement;
  }

  config.value.rename.regex.rules.push({
    action: ruleBuilder.value.action,
    pattern,
    replacement: ruleBuilder.value.action === 'remove' ? '' : (replacement || ruleBuilder.value.replacement),
    label: getRuleLabel(ruleBuilder.value),
    flags // Save flags to rule
  });

  ruleBuilder.value.customInput = '';
  ruleBuilder.value.replacement = '';
};

const removeRegexRule = (index) => {
  config.value.rename.regex.rules.splice(index, 1);
};

const moveRule = (index, direction) => {
  const rules = config.value.rename.regex.rules;
  if (direction === -1 && index > 0) {
    [rules[index], rules[index - 1]] = [rules[index - 1], rules[index]];
  } else if (direction === 1 && index < rules.length - 1) {
    [rules[index], rules[index + 1]] = [rules[index + 1], rules[index]];
  }
};

// 协议优先级顺序的双向绑定
const protocolOrderText = computed({
  get: () => (config.value.dedup.prefer?.protocolOrder ?? []).join(', '),
  set: (val) => {
    const order = String(val ?? '')
      .split(/[,\n]/)
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);
    config.value.dedup.prefer.protocolOrder = order;
  }
});

// --- Sync Logic ---
let lastEmittedJson = '';
const buildConfig = (val) => ({
  enabled: val?.enabled ?? false,
  rename: val?.rename ? JSON.parse(JSON.stringify(val.rename)) : { regex: { enabled: false, rules: [] }, template: { enabled: false } },
  dedup: val?.dedup ? JSON.parse(JSON.stringify(val.dedup)) : { enabled: false, mode: 'serverPort' },
  sort: val?.sort ? JSON.parse(JSON.stringify(val.sort)) : { enabled: false }
});

watch(() => props.modelValue, (val) => {
  if (val && typeof val === 'object') {
    const newJson = JSON.stringify(buildConfig(val));
    if (newJson !== lastEmittedJson) {
      const parsed = JSON.parse(newJson);
      if (!parsed.rename.regex) parsed.rename.regex = { enabled: false, rules: [] };
      if (!parsed.rename.template) parsed.rename.template = { enabled: false, template: '{emoji}{region}-{protocol}-{index}' };
      config.value = parsed;
      lastEmittedJson = newJson;
    }
  }
}, { immediate: true, deep: true });

watch(config, (val) => {
  const newJson = JSON.stringify(val);
  if (newJson !== lastEmittedJson) {
    lastEmittedJson = newJson;
    emit('update:modelValue', JSON.parse(newJson));
  }
}, { deep: true });

const insertTemplateTag = (tag) => {
  config.value.rename.template.template += tag;
};
</script>

<template>
  <div class="space-y-6">
    <!-- 顶部总开关 -->
    <div class="flex items-center justify-between">
      <div class="flex flex-col gap-1">
        <p class="text-base font-semibold text-gray-800 dark:text-gray-100">启用节点净化管道</p>
        <p class="text-xs text-gray-500 dark:text-gray-400">就像过滤器一样，对节点名称进行清洗、重命名和重新排序</p>
        <!-- Pipeline Guide -->
        <div
          class="mt-2 flex items-center text-[10px] text-gray-400 gap-1 bg-gray-50 dark:bg-gray-800/50 w-fit px-2 py-1 rounded border border-gray-100 dark:border-gray-700">
          <span>ℹ️ 处理流程:</span>
          <span class="font-mono text-indigo-500">1.魔术清理</span>
          <span>→</span>
          <span class="font-mono text-indigo-500">2.智能重命名</span>
          <span>→</span>
          <span class="font-mono text-indigo-500">3.去重 & 排序</span>
        </div>
      </div>
      <label class="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" v-model="config.enabled" class="sr-only peer">
        <div
          class="w-11 h-6 bg-gray-200 peer-focus:outline-hidden rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600 dark:peer-checked:bg-indigo-600">
        </div>
      </label>
    </div>

    <div v-if="config.enabled" class="space-y-6 animate-fade-in-down">
      <RulePreview
        :custom-node-input="customNodeInput"
        :active-mock-nodes="activeMockNodes"
        :preview-result="previewResult"
        :get-highlighted-name="getHighlightedName"
        @update:custom-node-input="customNodeInput = $event"
        @add-custom-node="addCustomNode"
      />

      <RuleEditor
        :config="config"
        :rule-builder="ruleBuilder"
        :presets="PRESETS"
        :template-presets="TEMPLATE_PRESETS"
        :protocol-order-text="protocolOrderText"
        :add-visual-rule="addVisualRule"
        :remove-regex-rule="removeRegexRule"
        :move-rule="moveRule"
        :apply-template="applyTemplate"
        :insert-template-tag="insertTemplateTag"
        @update:protocol-order-text="protocolOrderText = $event"
      />
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in-down {
  animation: fadeInDown 0.3s ease-out;
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
