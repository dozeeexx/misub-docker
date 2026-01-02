<script setup>
import { ref, watch, computed } from 'vue';

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
  { name: '🇹🇼 台湾 Hysteria2 [0.5倍率]', region: 'TW', protocol: 'hysteria2', server: 'tw1.gw', port: '443' },
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
        } catch (e) { }
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
    US: '🇺🇸', HK: '🇭🇰', JP: '🇯🇵', SG: '🇸🇬', TW: '🇹🇼', KR: '🇰🇷',
    GB: '🇬🇧', UK: '🇬🇧', DE: '🇩🇪', FR: '🇫🇷', CA: '🇨🇦', AU: '🇦🇺',
    NL: '🇳🇱', RU: '🇷🇺', IN: '🇮🇳', TR: '🇹🇷', MY: '🇲🇾', TH: '🇹🇭',
    VN: '🇻🇳', PH: '🇵🇭', ID: '🇮🇩', CH: '🇨🇭', IT: '🇮🇹', ES: '🇪🇸',
    BR: '🇧🇷', AR: '🇦🇷', MX: '🇲🇽', ZA: '🇿🇦', EG: '🇪🇬', IL: '🇮🇱',
    AE: '🇦🇪', SA: '🇸🇦', PL: '🇵🇱', CZ: '🇨🇿', HU: '🇭🇺', RO: '🇷🇴',
    BG: '🇧🇬', GR: '🇬🇷', PT: '🇵🇹', SE: '🇸🇪', NO: '🇳🇴', DK: '🇩🇰', FI: '🇫🇮', AT: '🇦🇹'
  };
  return map[regionCode] || '🏁';
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

const getHighlightedName = (name) => {
  // 如果规则构建器没有内容，直接返回原名
  if (!ruleBuilder.value.customInput && ruleBuilder.value.targetType !== 'preset') return name;

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

  if (!pattern) return name;

  try {
    let flags = 'g';
    if (ruleBuilder.value.targetType === 'preset') {
      const p = PRESETS[ruleBuilder.value.preset];
      if (p && p.flags) flags = p.flags;
      else if (ruleBuilder.value.preset === 'emoji') flags = 'gu';
    }

    const regex = new RegExp(`(${pattern})`, flags);
    // Highlight matches with red strikethrough
    return name.replace(regex, '<span class="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 line-through decoration-red-500">$1</span>');
  } catch (e) {
    return name;
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
          class="w-11 h-6 bg-gray-200 peer-focus:outline-hidden rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600">
        </div>
      </label>
    </div>

    <div v-if="config.enabled" class="space-y-6 animate-fade-in-down">

      <!-- 1. 实时预览实验室 -->
      <div
        class="bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800 rounded-xl overflow-hidden">
        <div class="px-4 py-2 bg-indigo-100/50 dark:bg-indigo-900/30 flex justify-between items-center">
          <span class="text-xs font-bold text-indigo-800 dark:text-indigo-300 tracking-wider uppercase">✨ 效果实时预览 (Live
            Preview)</span>
        </div>
        <div class="p-3 border-b border-indigo-100 dark:border-indigo-800/50">
          <div class="flex gap-2">
            <input v-model="customNodeInput" @input="addCustomNode" placeholder="👉 粘贴一个你的节点名称在这里进行测试..."
              class="flex-1 text-xs border-0 bg-white dark:bg-gray-800/50 rounded-md ring-1 ring-indigo-200 dark:ring-indigo-800 focus:ring-indigo-500 px-2 py-1.5 dark:text-white">
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4 p-4 text-xs sm:text-sm">
          <div class="space-y-2 opacity-60">
            <p class="font-bold text-gray-500 text-xs mb-1">原始名称 (Before)</p>
            <div v-for="(node, i) in activeMockNodes" :key="i"
              class="truncate font-mono p-1 bg-white dark:bg-gray-800 rounded" v-html="getHighlightedName(node.name)">
            </div>
          </div>
          <div class="space-y-2 relative">
            <p class="font-bold text-indigo-600 dark:text-indigo-400 text-xs mb-1">处理结果 (After)</p>
            <div v-for="(result, i) in previewResult" :key="'r' + i"
              class="truncate font-mono p-1 bg-white dark:bg-gray-800 rounded shadow-sm ring-1 ring-indigo-100 dark:ring-indigo-900 text-gray-900 dark:text-white transition-all duration-300">
              {{ result }}
            </div>
            <!-- 箭头 -->
            <div class="absolute left-[-16px] top-8 bottom-0 flex flex-col justify-around text-indigo-300">
              <span v-for="i in activeMockNodes.length" :key="i">➝</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. 积木式规则构建器 (Regex) -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <h4 class="text-sm font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
            <span>🪄 魔术清理</span>
            <span class="text-xs font-normal text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">Regex
              引擎</span>
          </h4>
          <label class="inline-flex items-center text-xs text-gray-500 dark:text-gray-400">
            <input type="checkbox" v-model="config.rename.regex.enabled"
              class="mr-1 rounded text-indigo-600 focus:ring-indigo-500">
            启用清理
          </label>
        </div>

        <div v-if="config.rename.regex.enabled"
          class="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
          <!-- 规则添加器 -->
          <div class="flex flex-col sm:flex-row gap-2 mb-4">
            <!-- 动作 -->
            <select v-model="ruleBuilder.action"
              class="text-sm bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 rounded-lg focus:ring-indigo-500 px-2 py-1.5 focus:border-indigo-500 dark:text-white">
              <option value="remove">🗑️ 删除/包含</option>
              <option value="replace">✏️ 替换为</option>
              <option value="prefix">⏮️ 添加前缀</option>
              <option value="suffix">⏭️ 添加后缀</option>
            </select>

            <!-- 对象 -->
            <div class="flex-1 flex gap-2">
              <select v-if="['remove', 'replace'].includes(ruleBuilder.action)" v-model="ruleBuilder.targetType"
                class="text-sm bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 rounded-lg w-20 px-2 py-1.5 dark:text-white">
                <option value="preset">⚡️ 预设</option>
                <option value="custom">✍️ 手填</option>
              </select>

              <!-- 动态输入区 -->
              <div class="flex-1 flex gap-2 w-full items-center">
                <template v-if="['remove', 'replace'].includes(ruleBuilder.action)">
                  <!-- 预设选择 -->
                  <select v-if="ruleBuilder.targetType === 'preset'" v-model="ruleBuilder.preset"
                    class="flex-1 text-sm bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 dark:text-white">
                    <option value="" disabled>请选择预设...</option>
                    <option v-for="(v, k) in PRESETS" :key="k" :value="k">{{ v.label }}</option>
                  </select>
                  <!-- 自定义输入 -->
                  <!-- 自定义输入 -->
                  <div v-else class="flex-1 relative group">
                    <input v-model="ruleBuilder.customInput" placeholder="输入关键字..."
                      class="w-full text-sm bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 dark:text-white">
                    <p
                      class="absolute -bottom-5 left-1 text-[10px] text-gray-400 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-white dark:bg-gray-800 px-1 rounded shadow-sm border border-gray-100 dark:border-gray-700">
                      💡 提示: 支持用 <code class="bg-gray-100 dark:bg-gray-600 px-1 rounded">|</code> 分隔多个词 (例如: 倍率|VIP)</p>
                  </div>
                </template>

                <!-- 替换内容输入 -->
                <input v-if="['replace', 'prefix', 'suffix'].includes(ruleBuilder.action)"
                  v-model="ruleBuilder.replacement" placeholder="输入文字..."
                  class="flex-1 text-sm bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 dark:text-white">
              </div>
            </div>

            <div class="flex-shrink-0">
              <button @click="addVisualRule" type="button"
                class="w-full sm:w-auto px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors">
                添加
              </button>
            </div>
          </div>

          <!-- 规则列表 -->
          <div class="space-y-2 max-h-48 overflow-y-auto">
            <div v-for="(rule, idx) in config.rename.regex.rules" :key="rule.pattern + '_' + idx"
              class="flex items-center gap-2 text-xs bg-white dark:bg-gray-700 p-2 rounded-lg border border-gray-200 dark:border-gray-600 group hover:shadow-sm transition-shadow">

              <!-- 排序按钮 -->
              <div class="flex flex-col gap-0.5 opacity-30 group-hover:opacity-100 transition-opacity">
                <button @click="moveRule(idx, -1)" :disabled="idx === 0"
                  class="hover:text-indigo-600 disabled:opacity-30"><svg class="w-3 h-3" fill="none"
                    stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 15l7-7 7 7"></path>
                  </svg></button>
                <button @click="moveRule(idx, 1)" :disabled="idx === config.rename.regex.rules.length - 1"
                  class="hover:text-indigo-600 disabled:opacity-30"><svg class="w-3 h-3" fill="none"
                    stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path>
                  </svg></button>
              </div>

              <span
                class="bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-300 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold">{{
                  rule._meta?.action || 'Regex' }}</span>

              <span class="flex-1 truncate font-mono text-gray-700 dark:text-gray-200">
                <span v-if="rule._meta">
                  {{ rule._meta.targetDisplay }}
                  <span
                    v-if="rule.replacement && rule._meta.action !== 'remove' && rule._meta.action !== 'prefix' && rule._meta.action !== 'suffix'"
                    class="text-gray-400 mx-1">➝</span>
                  <span v-if="rule.replacement && rule._meta.action !== 'remove'">{{ rule.replacement }}</span>
                </span>
                <span v-else class="text-gray-400">{{ rule.pattern }} <span v-if="rule.replacement">➝
                    {{ rule.replacement }}</span></span>
              </span>

              <button type="button" @click="removeRegexRule(idx)"
                class="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-1 rounded transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16">
                  </path>
                </svg>
              </button>
            </div>
            <div v-if="config.rename.regex.rules.length === 0"
              class="text-center text-gray-400 text-xs py-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
              列表为空，请在上方添加规则
            </div>
          </div>
        </div>
      </div>

      <!-- 3. 智能重命名 (Template) -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <h4 class="text-sm font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
            <span>🏷️ 智能重命名</span>
            <span
              class="text-xs font-normal text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">Template
              引擎</span>
          </h4>
          <label class="inline-flex items-center text-xs text-gray-500 dark:text-gray-400">
            <input type="checkbox" v-model="config.rename.template.enabled"
              class="mr-1 rounded text-indigo-600 focus:ring-indigo-500">
            启用重命名
          </label>
        </div>

        <div v-if="config.rename.template.enabled"
          class="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
          <!-- 快捷模板 -->
          <div class="flex flex-wrap gap-2 mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
            <span class="text-xs text-gray-500 self-center mr-1">⚡️ 快捷模板:</span>
            <button v-for="preset in TEMPLATE_PRESETS" :key="preset.label" @click="applyTemplate(preset.value)"
              :title="preset.desc"
              class="px-2 py-1 text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 transition-colors">{{
              preset.label }}</button>
          </div>

          <!-- 变量行 -->
          <div class="flex flex-wrap items-center text-xs gap-2 mb-2">
            <span
              class="text-xs font-semibold text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">变量</span>
            <button v-for="tag in ['{emoji}', '{region}', '{protocol}', '{index}', '{name}', '{server}']" :key="tag"
              @click="insertTemplateTag(tag)" :title="tag === '{name}' ? '这是第1步清理后的剩余名称' : ''"
              class="px-2 py-1 bg-white dark:bg-gray-700 border border-indigo-200 dark:border-gray-600 rounded-md text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-gray-600 transition-colors">+
              {{ tag }}</button>
          </div>

          <!-- 修饰行 -->
          <div class="flex flex-wrap items-center text-xs gap-2 mb-3">
            <span
              class="text-xs font-semibold text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">修饰</span>

            <!-- 地区修饰 -->
            <div class="flex gap-1">
              <button @click="insertTemplateTag('{region:UPPER}')"
                class="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                title="大写地区 (US)">US</button>
              <button @click="insertTemplateTag('{region:lower}')"
                class="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                title="小写地区 (us)">us</button>
              <button @click="insertTemplateTag('{region:zh}')"
                class="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 text-indigo-600 dark:text-indigo-400 font-medium"
                title="中文地区 (美国)">中</button>
            </div>

            <span class="w-px h-3 bg-gray-300 dark:bg-gray-600 mx-1"></span>

            <!-- 协议修饰 -->
            <div class="flex gap-1">
              <button @click="insertTemplateTag('{protocol:UPPER}')"
                class="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                title="大写协议 (VMESS)">PRO</button>
              <button @click="insertTemplateTag('{protocol:Title}')"
                class="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                title="首字母大写 (Vmess)">Pro</button>
            </div>

            <span class="w-px h-3 bg-gray-300 dark:bg-gray-600 mx-1"></span>

            <!-- 分隔符 -->
            <div class="flex gap-1">
              <button @click="insertTemplateTag(' - ')"
                class="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600">-</button>
              <button @click="insertTemplateTag(' | ')"
                class="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600">|</button>
              <button @click="insertTemplateTag(' ')"
                class="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                title="空格">␣</button>
            </div>
          </div>

          <div class="relative">
            <input v-model="config.rename.template.template"
              class="block w-full text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg py-2 pl-3 pr-10 focus:ring-indigo-500 focus:border-indigo-500 dark:text-white"
              placeholder="点击上方标签构建模板...">
          </div>

          <!-- 高级选项 -->
          <div class="mt-3 grid grid-cols-2 gap-4">
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500 dark:text-gray-400">序号起始:</span>
              <input type="number" v-model.number="config.rename.template.indexStart"
                class="w-16 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 dark:text-white">
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500 dark:text-gray-400">序号补零:</span>
              <input type="number" v-model.number="config.rename.template.indexPad"
                class="w-16 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 dark:text-white"
                title="例如设为2，则1显示为01">
            </div>
          </div>
        </div>
      </div>

      <!-- 4. 智能去重 (Reverted to Original) -->
      <div class="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between mb-2">
          <h4 class="text-sm font-bold text-gray-700 dark:text-gray-200">👯 智能去重</h4>
          <label class="inline-flex items-center text-xs text-gray-500 dark:text-gray-400">
            <input type="checkbox" v-model="config.dedup.enabled"
              class="mr-1 rounded text-indigo-600 focus:ring-indigo-500">
            启用去重
          </label>
        </div>
        <div v-if="config.dedup.enabled"
          class="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
          <div class="flex items-center gap-2 mb-3">
            <span class="text-xs text-gray-600 dark:text-gray-400">去重模式:</span>
            <select v-model="config.dedup.mode"
              class="flex-1 px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white">
              <option value="serverPort">服务器+端口 (推荐)</option>
              <option value="url">完整 URL</option>
            </select>
          </div>
          <div v-if="config.dedup.mode === 'serverPort'" class="space-y-3">
            <label class="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <input type="checkbox" v-model="config.dedup.includeProtocol"
                class="rounded text-indigo-600 focus:ring-indigo-500">
              去重时区分协议
            </label>
            <div class="space-y-1">
              <span class="text-xs text-gray-600 dark:text-gray-400">协议优先级（逗号分隔，越靠前越优先保留）:</span>
              <input v-model="protocolOrderText"
                class="w-full px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="vless, trojan, vmess, hysteria2, ss, ssr">
            </div>
          </div>
          <p class="text-[10px] text-gray-400 mt-2">
            {{ config.dedup.mode === 'serverPort'
              ? '基于服务器地址和端口去重，可识别不同协议的相同节点'
              : '基于完整 URL 去重，仅移除完全相同的节点' }}
          </p>
        </div>
      </div>

      <!-- 5. 节点排序 (Reverted to Original) -->
      <div class="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between mb-2">
          <h4 class="text-sm font-bold text-gray-700 dark:text-gray-200">📶 节点排序</h4>
          <label class="inline-flex items-center text-xs text-gray-500 dark:text-gray-400">
            <input type="checkbox" v-model="config.sort.enabled"
              class="mr-1 rounded text-indigo-600 focus:ring-indigo-500">
            启用排序
          </label>
        </div>
        <div v-if="config.sort.enabled"
          class="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700 space-y-2">
          <p class="text-xs text-gray-400">默认排序规则: 地区(香港→台湾→日本...) → 协议 → 名称</p>
          <label class="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <input type="checkbox" v-model="config.sort.nameIgnoreEmoji"
              class="rounded text-indigo-600 focus:ring-indigo-500">
            排序时忽略国旗 Emoji
          </label>
        </div>
      </div>

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
