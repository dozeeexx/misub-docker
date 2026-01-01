<script setup>
import { ref, computed, watch, onMounted } from 'vue';

const props = defineProps({
  show: Boolean,
  // 订阅信息
  subscriptionId: String,
  subscriptionName: String,
  subscriptionUrl: String,
  profileId: String,
  profileName: String,
  apiEndpoint: {
    type: String,
    default: '/api/subscription_nodes'
  }
});

const emit = defineEmits(['update:show']);

// 响应式数据
const loading = ref(false);
const error = ref('');
const allNodes = ref([]); // 存储所有节点
const currentPage = ref(1);
const pageSize = ref(24);
const viewMode = ref('list'); // 'list' 或 'card'
const showProcessed = ref(false); // 是否显示处理后的节点名称

// 响应式视图模式 - 移动端强制卡片视图
const effectiveViewMode = computed(() => {
  // 检测是否为移动端或中小屏桌面端
  const isSmallScreen = window.innerWidth < 1024; // lg 断点
  if (isSmallScreen) {
    return 'card'; // 移动端和中小屏强制使用卡片视图
  }
  return viewMode.value;
});

// 筛选条件
const protocolFilter = ref('all');
const regionFilter = ref('all');
const searchQuery = ref('');

// 统计信息
const protocolStats = ref({});
const regionStats = ref({});
const availableProtocols = ref([]);
const availableRegions = ref([]);

// 复制状态
const copiedNodeId = ref('');

// 计算属性
const title = computed(() => {
  if (props.profileName) {
    return `订阅组节点预览 - ${props.profileName}`;
  }
  return `订阅节点预览 - ${props.subscriptionName || '未知订阅'}`;
});

// 过滤后的节点
const filteredNodes = computed(() => {
  let result = allNodes.value;

  // 协议过滤
  if (protocolFilter.value && protocolFilter.value !== 'all') {
    result = result.filter(node => node.protocol === protocolFilter.value);
  }

  // 地区过滤
  if (regionFilter.value && regionFilter.value !== 'all') {
    result = result.filter(node => node.region === regionFilter.value);
  }

  // 搜索过滤
  if (searchQuery.value && searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim();
    result = result.filter(node =>
      node.name.toLowerCase().includes(query) ||
      node.protocol.toLowerCase().includes(query) ||
      node.region.toLowerCase().includes(query)
    );
  }

  return result;
});

// 当前页显示的节点
const paginatedNodes = computed(() => {
  const result = filteredNodes.value;
  const startIndex = (currentPage.value - 1) * pageSize.value;
  const endIndex = startIndex + pageSize.value;
  return result.slice(startIndex, endIndex);
});

// 分页信息
const totalPages = computed(() => {
  return Math.ceil(filteredNodes.value.length / pageSize.value);
});

// 总节点数（过滤后）
const filteredTotalCount = computed(() => {
  return filteredNodes.value.length;
});

// 监听弹窗显示状态
watch(() => props.show, (newVal) => {
  if (newVal) {
    loadNodes();
  } else {
    // 重置状态
    currentPage.value = 1;
    protocolFilter.value = 'all';
    regionFilter.value = 'all';
    searchQuery.value = '';
    showProcessed.value = false;  // 重置处理开关
    error.value = '';
    allNodes.value = [];
  }
});

onMounted(() => {
  if (props.show) {
    loadNodes();
  }
  window.addEventListener('keydown', handleKeydown);
});

// 监听筛选条件变化，重置页码
watch([protocolFilter, regionFilter, searchQuery], () => {
  currentPage.value = 1;
});

// 监听 showProcessed 变化，重新加载节点
watch(showProcessed, () => {
  loadNodes();
});

// 加载节点数据
const loadNodes = async () => {
  if (!props.show) return;

  loading.value = true;
  error.value = '';

  try {
    const requestData = {
      userAgent: 'v2rayN/7.23'
    };

    if (props.profileId) {
      requestData.profileId = props.profileId;
      // 仅在订阅组模式下传递 applyTransform 参数
      requestData.applyTransform = showProcessed.value;
    } else if (props.subscriptionId) {
      requestData.subscriptionId = props.subscriptionId;
    } else if (props.subscriptionUrl) {
      requestData.url = props.subscriptionUrl;
    } else {
      throw new Error('缺少必要的参数');
    }

    console.log('[Preview] Sending request to:', props.apiEndpoint, requestData);

    const response = await fetch(props.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(requestData),
    });

    console.log('[Preview] Response status:', response.status);

    if (!response.ok) {
      if (response.status === 401) {
        // 尝试重新获取数据来检查认证状态
        try {
          const testResponse = await fetch('/api/data');
          if (testResponse.status === 401) {
            throw new Error('认证失败，请重新登录后再试');
          } else {
            throw new Error('认证异常，请刷新页面后重试');
          }
        } catch (testErr) {
          throw new Error('认证失败，请重新登录后再试');
        }
      }
      const errorText = await response.text();
      console.error('[Preview] Error text:', errorText);
      throw new Error(`请求失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[Preview] Data received:', data);

    if (!data.success) {
      throw new Error(data.error || '获取节点失败');
    }

    allNodes.value = data.nodes || [];
    protocolStats.value = data.stats?.protocols || {};
    regionStats.value = data.stats?.regions || {};

    // 更新可用筛选选项
    // 协议类型按常见程度排序
    const protocolOrder = ['vmess', 'vless', 'trojan', 'ss', 'ssr', 'hysteria2', 'tuic', 'socks5', 'anytls', 'unknown'];
    availableProtocols.value = Object.keys(protocolStats.value).sort((a, b) => {
      const aIndex = protocolOrder.indexOf(a.toLowerCase());
      const bIndex = protocolOrder.indexOf(b.toLowerCase());
      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

    // 地区按常见地区优先排序
    const regionOrder = ['香港', '台湾', '新加坡', '日本', '美国', '韩国', '英国', '德国', '法国', '加拿大', '澳大利亚', '其他'];
    availableRegions.value = Object.keys(regionStats.value).sort((a, b) => {
      const aIndex = regionOrder.indexOf(a);
      const bIndex = regionOrder.indexOf(b);
      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

    // 重置页码
    currentPage.value = 1;

  } catch (err) {
    // 提供更友好的错误信息
    if (err.message.includes('认证失败')) {
      error.value = '认证失败，请重新登录后再试';
    } else if (err.message.includes('网络')) {
      error.value = '网络连接失败，请检查网络连接';
    } else {
      error.value = err.message || '加载节点失败';
    }

    allNodes.value = [];
  } finally {
    loading.value = false;
  }
};

// 复制节点链接
const copyNodeUrl = async (node, nodeId) => {
  try {
    await navigator.clipboard.writeText(node.url);
    copiedNodeId.value = nodeId;
    setTimeout(() => {
      copiedNodeId.value = '';
    }, 2000);
  } catch (err) {
    // 降级方案
    const textArea = document.createElement('textarea');
    textArea.value = node.url;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    copiedNodeId.value = nodeId;
    setTimeout(() => {
      copiedNodeId.value = '';
    }, 2000);
  }
};

// 获取协议类型的显示样式
const getProtocolStyle = (protocol) => {
  const styles = {
    vmess: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    vless: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    trojan: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    ss: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    ssr: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    hysteria2: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
    hy2: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
    tuic: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    socks5: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    anytls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    unknown: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  };
  return styles[protocol] || styles.unknown;
};

// 获取地区 Emoji
const getRegionEmoji = (region) => {
  if (!region) return '🌐';
  
  // 常见国家/地区映射
  const regionMap = {
    'HK': '🇭🇰', 'Hong Kong': '🇭🇰', '香港': '🇭🇰',
    'TW': '🇹🇼', 'Taiwan': '🇹🇼', '台湾': '🇹🇼',
    'JP': '🇯🇵', 'Japan': '🇯🇵', '日本': '🇯🇵',
    'US': '🇺🇸', 'United States': '🇺🇸', '美国': '🇺🇸',
    'SG': '🇸🇬', 'Singapore': '🇸🇬', '新加坡': '🇸🇬',
    'KR': '🇰🇷', 'Korea': '🇰🇷', '韩国': '🇰🇷',
    'UK': '🇬🇧', 'United Kingdom': '🇬🇧', '英国': '🇬🇧',
    'DE': '🇩🇪', 'Germany': '🇩🇪', '德国': '🇩🇪',
    'FR': '🇫🇷', 'France': '🇫🇷', '法国': '🇫🇷',
    'RU': '🇷🇺', 'Russia': '🇷🇺', '俄罗斯': '🇷🇺',
    'CA': '🇨🇦', 'Canada': '🇨🇦', '加拿大': '🇨🇦',
    'MO': '🇲🇴', 'Macao': '🇲🇴', '澳门': '🇲🇴',
    'CN': '🇨🇳', 'China': '🇨🇳', '中国': '🇨🇳',
    'IN': '🇮🇳', 'India': '🇮🇳', '印度': '🇮🇳',
    'NL': '🇳🇱', 'Netherlands': '🇳🇱', '荷兰': '🇳🇱',
    'AU': '🇦🇺', 'Australia': '🇦🇺', '澳大利亚': '🇦🇺',
    'TH': '🇹🇭', 'Thailand': '🇹🇭', '泰国': '🇹🇭',
    'VN': '🇻🇳', 'Vietnam': '🇻🇳', '越南': '🇻🇳',
    'ID': '🇮🇩', 'Indonesia': '🇮🇩', '印尼': '🇮🇩',
    'MY': '🇲🇾', 'Malaysia': '🇲🇾', '马来西亚': '🇲🇾',
    'PH': '🇵🇭', 'Philippines': '🇵🇭', '菲律宾': '🇵🇭',
    'TR': '🇹🇷', 'Turkey': '🇹🇷', '土耳其': '🇹🇷',
  };

  if (regionMap[region]) return regionMap[region];
  
  // 尝试在字符串中查找 Emoji
  const emojiMatch = region.match(/(\p{Emoji_Presentation}|\p{Extended_Pictographic})/u);
  if (emojiMatch) return emojiMatch[0];

  return '🌐';
};

// 解析节点信息
const parseNodeInfo = (node) => {
  const result = {
    name: node.name,
    server: node.server || '',
    port: node.port || '',
    protocol: node.protocol,
    region: node.region
  };

  // 如果后端已经返回了服务器和端口，直接使用，不再前端解析
  if (result.server && result.port) {
      return result;
  }

  try {
    const url = new URL(node.url);
    result.server = url.hostname || '';
    result.port = url.port || '';

    // 对于vmess协议，需要特殊处理
    if (node.protocol === 'vmess') {
      try {
        const base64Part = node.url.substring('vmess://'.length);
        const binaryString = atob(base64Part);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const jsonString = new TextDecoder('utf-8').decode(bytes);
        const nodeConfig = JSON.parse(jsonString);
        result.server = nodeConfig.add || result.server;
        result.port = nodeConfig.port || result.port;
      } catch (e) {
        // 如果解析失败，使用URL解析的结果
      }
    }
  } catch (e) {
    // 如果URL解析失败，尝试从字符串中提取
    const match = node.url.match(/@([^:\/]+):(\d+)/);
    if (match) {
      result.server = match[1];
      result.port = match[2];
    }
  }

  return result;
};

// 分页控件
const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
};

// 生成页码数组
const getPageNumbers = () => {
  const pages = [];
  const current = currentPage.value;
  const total = totalPages.value;

  if (total <= 7) {
    for (let i = 1; i <= total; i++) {
      pages.push(i);
    }
  } else {
    if (current <= 3) {
      for (let i = 1; i <= 5; i++) {
        pages.push(i);
      }
      pages.push('...');
      pages.push(total);
    } else if (current >= total - 2) {
      pages.push(1);
      pages.push('...');
      for (let i = total - 4; i <= total; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      pages.push('...');
      for (let i = current - 1; i <= current + 1; i++) {
        pages.push(i);
      }
      pages.push('...');
      pages.push(total);
    }
  }

  return pages;
};

// 键盘事件处理
const handleKeydown = (e) => {
  if (e.key === 'Escape') {
    emit('update:show', false);
  }
};
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
    @click="$emit('update:show', false)"
  >
    <div
      class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full text-left ring-1 ring-black/5 dark:ring-white/10 flex flex-col max-h-[95vh] max-w-none mx-4 sm:mx-auto sm:max-w-5xl"
      @click.stop
    >
      <!-- 标题栏 -->
      <div class="p-6 pb-4 shrink-0 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between">
          <h3 class="text-xl font-bold text-gray-900 dark:text-white">
            {{ title }}
          </h3>
          <button
            @click="$emit('update:show', false)"
            class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <svg class="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- 统计信息 -->
      <div v-if="!loading && !error && Object.keys(protocolStats).length > 0" class="px-4 sm:px-6 py-2 sm:py-4 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
        <!-- 桌面端统计布局 -->
        <div class="hidden lg:grid grid-cols-4 gap-4">
          <div class="text-center">
            <div class="text-2xl font-bold text-gray-900 dark:text-white">{{ allNodes.length }}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400">总节点数</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-gray-900 dark:text-white">{{ Object.keys(protocolStats).length }}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400">协议类型</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-gray-900 dark:text-white">{{ Object.keys(regionStats).length }}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400">地区数量</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-gray-900 dark:text-white">{{ totalPages }}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400">总页数</div>
          </div>
        </div>

        <!-- 移动端统计布局 (彩色标签) -->
        <div class="lg:hidden grid grid-cols-4 gap-2 text-xs">
          <div class="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded px-2 py-1 text-center">
            <div class="font-bold">{{ allNodes.length }}</div>
            <div class="scale-90 opacity-80">节点</div>
          </div>
          <div class="bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded px-2 py-1 text-center">
             <div class="font-bold">{{ Object.keys(protocolStats).length }}</div>
             <div class="scale-90 opacity-80">协议</div>
          </div>
          <div class="bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded px-2 py-1 text-center">
             <div class="font-bold">{{ Object.keys(regionStats).length }}</div>
             <div class="scale-90 opacity-80">地区</div>
          </div>
          <div class="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded px-2 py-1 text-center">
             <div class="font-bold">{{ totalPages }}</div>
             <div class="scale-90 opacity-80">页数</div>
          </div>
        </div>
      </div>

      <!-- 筛选控件 - 统一响应式布局 -->
      <div v-if="!loading && !error && Object.keys(protocolStats).length > 0" class="px-3 sm:px-6 py-2 sm:py-4 border-b border-gray-200 dark:border-gray-700">
        <!-- 响应式网格布局 -->
        <!-- 移动端：Grid (1列用于搜索，2列用于筛选)，桌面端维持原样 -->
        <div class="flex flex-col lg:grid lg:grid-cols-4 gap-3 sm:gap-4 lg:items-end">

          <!-- 搜索 (移动端置顶) -->
          <div class="w-full">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
              节点搜索
            </label>
            <div class="flex gap-2">
              <div class="relative flex-1">
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="搜索..."
                  class="w-full px-2 sm:px-3 py-1.5 sm:py-2 pr-8 sm:pr-10 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <div class="absolute inset-y-0 right-0 flex items-center pr-2 sm:pr-3">
                  <svg class="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                  </svg>
                </div>
              </div>

              <!-- 处理模式 toggler (仅移动端、订阅组且非公开页显示) -->
              <button
                v-if="profileId && apiEndpoint !== '/api/public/preview'"
                @click="showProcessed = !showProcessed"
                :class="showProcessed ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600'"
                class="lg:hidden flex-shrink-0 w-9 border rounded-lg hover:opacity-90 transition-colors flex items-center justify-center"
                title="切换显示原始/处理后节点名称"
              >
                <!-- 原材料 Icon -->
                <svg v-if="!showProcessed" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                </svg>
                <!-- 魔法棒 Icon -->
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
              </button>
            </div>
          </div>

          <!-- 筛选器组 (移动端并排) -->
          <div class="grid grid-cols-2 gap-3 lg:contents">
            <!-- 协议筛选 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                协议类型
              </label>
              <select
                v-model="protocolFilter"
                class="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">全部</option>
                <option v-for="protocol in availableProtocols" :key="protocol" :value="protocol">
                  {{ protocol.toUpperCase() }}
                </option>
              </select>
            </div>

            <!-- 地区筛选 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                地区筛选
              </label>
              <select
                v-model="regionFilter"
                class="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">全部</option>
                <option v-for="region in availableRegions" :key="region" :value="region">
                  {{ region }}
                </option>
              </select>
            </div>
          </div>



          <!-- 视图切换 & 规则处理 (Desktop Combined) -->
          <div class="hidden lg:flex gap-6">
            <!-- 视图切换 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                显示模式
              </label>
              <div class="flex items-center gap-1 sm:gap-2">
                <button
                  @click="viewMode = 'list'"
                  :class="viewMode === 'list' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'"
                  class="w-9 h-9 rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
                  title="列表视图"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16"></path>
                  </svg>
                </button>
                <button
                  @click="viewMode = 'card'"
                  :class="viewMode === 'card' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'"
                  class="w-9 h-9 rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
                  title="卡片视图"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z"></path>
                  </svg>
                </button>
              </div>
            </div>

            <!-- 规则处理 -->
            <div v-if="profileId && apiEndpoint !== '/api/public/preview'">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                规则处理
              </label>
              <div class="flex items-center gap-1 sm:gap-2">
                <button
                  @click="showProcessed = !showProcessed"
                  :class="showProcessed ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'"
                  class="w-9 h-9 rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
                  title="切换显示模式：原始 / 处理后"
                >
                   <!-- 魔法棒 Icon (处理后) -->
                   <svg v-if="showProcessed" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                  </svg>
                   <!-- 原材料 Icon (原始) -->
                   <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 节点列表 -->
      <div class="flex-1 overflow-hidden" style="min-height: 0;">
        <div class="h-full overflow-y-auto px-4 sm:px-6 py-4" style="max-height: calc(95vh - 320px);">
          <!-- 加载状态 -->
          <div v-if="loading" class="flex items-center justify-center h-64">
            <div class="text-center">
              <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p class="mt-4 text-sm text-gray-500 dark:text-gray-400">正在加载节点信息...</p>
            </div>
          </div>

          <!-- 错误状态 -->
          <div v-else-if="error" class="flex items-center justify-center h-64">
            <div class="text-center">
              <svg class="mx-auto h-12 w-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p class="mt-4 text-sm text-red-600 dark:text-red-400">{{ error }}</p>
              <button
                @click="loadNodes"
                class="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
              >
                重试
              </button>
            </div>
          </div>

          <!-- 无数据状态 -->
          <div v-else-if="paginatedNodes.length === 0" class="flex items-center justify-center h-64">
            <div class="text-center">
              <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p class="mt-4 text-sm text-gray-500 dark:text-gray-400">未找到符合条件的节点</p>
            </div>
          </div>

          <!-- 节点列表/卡片视图 -->
          <div v-else class="h-full flex flex-col">
            <!-- 简洁列表视图 (仅大屏桌面端) -->
            <div v-if="effectiveViewMode === 'list'" class="hidden lg:flex flex-1 overflow-hidden">
              <div class="h-full overflow-y-auto">
                <!-- 简单的表格 -->
                <div class="w-full flex justify-center px-6">
                  <div style="width: 950px;">
                  <!-- 表头 -->
                  <div class="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <div class="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-medium text-gray-600 dark:text-gray-400 min-h-[3rem] flex items-center" style="width: 950px;">
                      <div class="col-span-4">节点名称</div>
                      <div class="col-span-3 hidden sm:block">服务器</div>
                      <div class="col-span-2 hidden md:block text-center">端口</div>
                      <div class="col-span-1 hidden sm:block">类型</div>
                      <div class="col-span-1 hidden sm:block">地区</div>
                      <div class="col-span-1">操作</div>
                    </div>
                  </div>

                  <!-- 数据行 -->
                  <div class="bg-white dark:bg-gray-800" style="width: 950px;">
                    <div
                      v-for="(node, index) in paginatedNodes"
                      :key="`${node.url}_${index}`"
                      class="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div class="grid grid-cols-12 gap-2 px-4 py-3 items-center min-h-[3rem]" style="width: 950px;">
                        <!-- 节点名称 -->
                        <div class="col-span-4">
                          <span class="text-sm text-gray-900 dark:text-white block overflow-hidden" :title="parseNodeInfo(node).name" style="text-overflow: ellipsis; white-space: nowrap;">
                            {{ parseNodeInfo(node).name }}
                          </span>
                        </div>

                        <!-- 服务器 (桌面端) -->
                        <div class="col-span-3 hidden sm:block">
                          <span class="text-sm text-gray-600 dark:text-gray-400 font-mono block overflow-hidden" :title="parseNodeInfo(node).server" style="text-overflow: ellipsis; white-space: nowrap;">
                            {{ parseNodeInfo(node).server }}
                          </span>
                        </div>

                        <!-- 端口 (桌面端) -->
                        <div class="col-span-2 hidden md:block text-center">
                          <span class="text-sm text-gray-600 dark:text-gray-400 font-mono block" style="min-width: 50px;">
                            {{ parseNodeInfo(node).port }}
                          </span>
                        </div>

                        <!-- 类型 (桌面端) -->
                        <div class="col-span-1 hidden sm:block">
                          <span
                            class="inline-flex items-center justify-center px-2 py-1 rounded text-xs font-medium"
                            :class="getProtocolStyle(parseNodeInfo(node).protocol)"
                            style="min-width: 60px;"
                          >
                            {{ parseNodeInfo(node).protocol.toUpperCase() }}
                          </span>
                        </div>

                        <!-- 地区 (桌面端) -->
                        <div class="col-span-1 hidden sm:block">
                          <span class="inline-flex items-center justify-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200" style="min-width: 60px;">
                            {{ parseNodeInfo(node).region }}
                          </span>
                        </div>

                        <!-- 操作 (所有设备) -->
                        <div class="col-span-1 flex justify-center">
                          <button
                            @click="copyNodeUrl(node, node.url)"
                            class="inline-flex items-center justify-center w-8 h-8 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-150"
                            :class="{ 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20': copiedNodeId === node.url }"
                          >
                            <svg
                              v-if="copiedNodeId !== node.url"
                              class="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <svg
                              v-else
                              class="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 卡片视图 container -->
            <div v-else class="flex-1 overflow-y-auto">
              <!-- 移动端 Mini List-Card 视图 -->
              <div class="block lg:hidden">
                <div 
                  v-for="(node, index) in paginatedNodes" 
                  :key="`${node.url}_${index}`"
                  class="flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800"
                  style="height: 64px;"
                >
                  <!-- 左侧：图标与信息 -->
                  <div class="flex items-center gap-3 flex-1 min-w-0 pr-2">
                    
                    <!-- 中间：名称与标签 -->
                    <div class="flex flex-col min-w-0">
                      <div class="flex items-center gap-2">
                        <span class="text-sm font-bold text-gray-900 dark:text-white truncate">
                          {{ parseNodeInfo(node).name }}
                        </span>
                      </div>
                      <div class="flex items-center gap-2 mt-1">
                        <span
                          class="text-[10px] bg-gray-100 dark:bg-gray-700/50 px-1.5 py-0.5 rounded uppercase font-bold"
                          :class="getProtocolStyle(parseNodeInfo(node).protocol)"
                        >
                          {{ parseNodeInfo(node).protocol }}
                        </span>
                         <span class="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                          {{ parseNodeInfo(node).server }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- 右侧：操作按钮 -->
                  <button
                    @click="copyNodeUrl(node, node.url)"
                    class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors bg-gray-50 dark:bg-gray-700/50 text-gray-400 active:bg-indigo-50 active:text-indigo-600"
                    :class="{ 'text-green-600 bg-green-50': copiedNodeId === node.url }"
                  >
                    <svg v-if="copiedNodeId !== node.url" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 01-2-2V5a2 2 0 012-2h4.586"></path>
                    </svg>
                    <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </button>
                </div>
              </div>

              <!-- 桌面端常规卡片视图 -->
              <div class="hidden lg:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-1">
                <div
                  v-for="(node, index) in paginatedNodes"
                  :key="`${node.url}_${index}`"
                  class="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-4 hover:shadow-md transition-shadow"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="flex-1 min-w-0">
                      <!-- 节点名称和协议标签 -->
                      <div class="flex items-center gap-2 mb-2">
                        <h4 class="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {{ parseNodeInfo(node).name }}
                        </h4>
                        <span
                          class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                          :class="getProtocolStyle(parseNodeInfo(node).protocol)"
                        >
                          {{ parseNodeInfo(node).protocol.toUpperCase() }}
                        </span>
                      </div>

                      <!-- 地区标签 -->
                      <div class="mb-2">
                        <span
                          class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        >
                          {{ parseNodeInfo(node).region }}
                        </span>
                      </div>

                      <!-- 服务器信息 -->
                      <div class="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                        <div class="font-mono truncate">{{ parseNodeInfo(node).server }}</div>
                        <div class="font-mono">端口: {{ parseNodeInfo(node).port }}</div>
                      </div>
                    </div>

                    <!-- 复制按钮 -->
                    <button
                      @click="copyNodeUrl(node, node.url)"
                      class="flex-shrink-0 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors group"
                      :class="{ 'bg-green-100 dark:bg-green-900': copiedNodeId === node.url }"
                    >
                      <svg
                        v-if="copiedNodeId !== node.url"
                        class="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <svg
                        v-else
                        class="w-4 h-4 text-green-600 dark:text-green-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 分页控件 - 移动端简化版本 -->
      <div v-if="!loading && !error && totalPages > 1" class="p-4 sm:p-6 pt-2 sm:pt-4 border-t border-gray-200 dark:border-gray-700 shrink-0">
        <!-- 桌面端完整分页 -->
        <div v-if="currentPage > 0" class="hidden sm:flex items-center justify-between">
          <div class="text-sm text-gray-700 dark:text-gray-300">
            显示第 {{ ((currentPage - 1) * pageSize) + 1 }} - {{ Math.min(currentPage * pageSize, filteredTotalCount) }} 项，共 {{ filteredTotalCount }} 项
          </div>
          <div class="flex items-center space-x-2">
            <!-- 上一页 -->
            <button
              @click="goToPage(currentPage - 1)"
              :disabled="currentPage <= 1"
              class="px-3 py-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              上一页
            </button>

            <!-- 页码 -->
            <div class="flex space-x-1">
              <button
                v-for="page in getPageNumbers()"
                :key="page"
                @click="page !== '...' && goToPage(page)"
                :class="{
                  'px-3 py-1 rounded-md border text-sm font-medium transition-colors': true,
                  'bg-indigo-600 border-indigo-600 text-white': page === currentPage,
                  'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600': page !== currentPage && page !== '...',
                  'opacity-50 cursor-not-allowed': page === '...'
                }"
                :disabled="page === '...'"
              >
                {{ page }}
              </button>
            </div>

            <!-- 下一页 -->
            <button
              @click="goToPage(currentPage + 1)"
              :disabled="currentPage >= totalPages"
              class="px-3 py-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              下一页
            </button>
          </div>
        </div>

        <!-- 移动端简化分页 -->
        <div class="sm:hidden">
          <div class="flex items-center justify-between mb-3">
            <div class="text-sm text-gray-700 dark:text-gray-300">
              {{ currentPage }} / {{ totalPages }} 页
            </div>
            <div class="text-sm text-gray-500 dark:text-gray-400">
              共 {{ filteredTotalCount }} 项
            </div>
          </div>
          <div class="flex items-center justify-center space-x-4">
            <button
              @click="goToPage(currentPage - 1)"
              :disabled="currentPage <= 1"
              class="flex-1 max-w-[100px] px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              上一页
            </button>
            <span class="px-3 py-1 text-sm font-medium text-gray-600 dark:text-gray-400">
              {{ currentPage }}
            </span>
            <button
              @click="goToPage(currentPage + 1)"
              :disabled="currentPage >= totalPages"
              class="flex-1 max-w-[100px] px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              下一页
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>