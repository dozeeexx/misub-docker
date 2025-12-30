<script setup>
import { ref, watch, computed } from 'vue';
import Modal from '../forms/Modal.vue';
import SubConverterSelector from '../forms/SubConverterSelector.vue';

const props = defineProps({
  show: Boolean,
  profile: Object,
  isNew: Boolean,
  allSubscriptions: Array,
  allManualNodes: Array,
});

const emit = defineEmits(['update:show', 'save']);

const localProfile = ref({});
const subscriptionSearchTerm = ref('');
const nodeSearchTerm = ref('');
const activeManualNodeColorFilter = ref(null);
const showAdvanced = ref(false);

// 国家/地区代码到旗帜和中文名称的映射
const countryCodeMap = {
  'hk': ['🇭🇰', '香港'],
  'tw': ['🇹🇼', '台湾', '臺灣'],
  'sg': ['🇸🇬', '新加坡', '狮城'],
  'jp': ['🇯🇵', '日本'],
  'us': ['🇺🇸', '美国', '美國'],
  'kr': ['🇰🇷', '韩国', '韓國'],
  'gb': ['🇬🇧', '英国', '英國'],
  'de': ['🇩🇪', '德国', '德國'],
  'fr': ['🇫🇷', '法国', '法國'],
  'ca': ['🇨🇦', '加拿大'],
  'au': ['🇦🇺', '澳大利亚', '澳洲', '澳大利亞'],
  'cn': ['🇨🇳', '中国', '大陸', '内地'],
  'my': ['🇲🇾', '马来西亚', '馬來西亞'],
  'th': ['🇹🇭', '泰国', '泰國'],
  'vn': ['🇻🇳', '越南'],
  'ph': ['🇵🇭', '菲律宾', '菲律賓'],
  'id': ['🇮🇩', '印度尼西亚', '印尼'],
  'in': ['🇮🇳', '印度'],
  'pk': ['🇵🇰', '巴基斯坦'],
  'bd': ['🇧🇩', '孟加拉国', '孟加拉國'],
  'ae': ['🇦🇪', '阿联酋', '阿聯酋'],
  'sa': ['🇸🇦', '沙特阿拉伯'],
  'tr': ['🇹🇷', '土耳其'],
  'ru': ['🇷🇺', '俄罗斯', '俄羅斯'],
  'br': ['🇧🇷', '巴西'],
  'mx': ['🇲🇽', '墨西哥'],
  'ar': ['🇦🇷', '阿根廷'],
  'cl': ['🇨🇱', '智利'],
  'za': ['🇿🇦', '南非'],
  'eg': ['🇪🇬', '埃及'],
  'ng': ['🇳🇬', '尼日利亚', '尼日利亞'],
  'ke': ['🇰🇪', '肯尼亚', '肯尼亞'],
  'il': ['🇮🇱', '以色列'],
  'ir': ['🇮🇷', '伊朗'],
  'iq': ['🇮🇶', '伊拉克'],
  'ua': ['🇺🇦', '乌克兰', '烏克蘭'],
  'pl': ['🇵🇱', '波兰', '波蘭'],
  'cz': ['🇨🇿', '捷克'],
  'hu': ['🇭🇺', '匈牙利'],
  'ro': ['🇷🇴', '罗马尼亚', '羅馬尼亞'],
  'gr': ['🇬🇷', '希腊', '希臘'],
  'pt': ['🇵🇹', '葡萄牙'],
  'es': ['🇪🇸', '西班牙'],
  'it': ['🇮🇹', '意大利'],
  'nl': ['🇳🇱', '荷兰', '荷蘭'],
  'be': ['🇧🇪', '比利时', '比利時'],
  'se': ['🇸🇪', '瑞典'],
  'no': ['🇳🇴', '挪威'],
  'dk': ['🇩🇰', '丹麦', '丹麥'],
  'fi': ['🇫🇮', '芬兰', '芬蘭'],
  'ch': ['🇨🇭', '瑞士'],
  'at': ['🇦🇹', '奥地利', '奧地利'],
  'ie': ['🇮🇪', '爱尔兰', '愛爾蘭'],
  'nz': ['🇳🇿', '新西兰', '紐西蘭'],
};

const filteredSubscriptions = computed(() => {
  // Only consider items with valid http/https URLs as "Subscriptions"
  const validSubs = props.allSubscriptions.filter(sub => 
    sub.url && /^https?:\/\//.test(sub.url)
  );

  if (!subscriptionSearchTerm.value) {
    return validSubs;
  }
  const lowerCaseSearchTerm = subscriptionSearchTerm.value.toLowerCase();
  const alternativeTerms = countryCodeMap[lowerCaseSearchTerm] || [];

  return validSubs.filter(sub => {
    const subNameLower = sub.name ? sub.name.toLowerCase() : '';

    if (subNameLower.includes(lowerCaseSearchTerm)) {
      return true;
    }

    for (const altTerm of alternativeTerms) {
      if (subNameLower.includes(altTerm.toLowerCase())) {
        return true;
      }
    }
    return false;
  });
});

const filteredManualNodes = computed(() => {
  let nodes = props.allManualNodes;

  if (activeManualNodeColorFilter.value) {
    nodes = nodes.filter(n => n.colorTag === activeManualNodeColorFilter.value);
  }

  if (!nodeSearchTerm.value) {
    return nodes;
  }
  const lowerCaseSearchTerm = nodeSearchTerm.value.toLowerCase();
  const alternativeTerms = countryCodeMap[lowerCaseSearchTerm] || [];

  return nodes.filter(node => {
    const nodeNameLower = node.name ? node.name.toLowerCase() : '';

    if (nodeNameLower.includes(lowerCaseSearchTerm)) {
      return true;
    }

    for (const altTerm of alternativeTerms) {
      if (nodeNameLower.includes(altTerm.toLowerCase())) {
        return true;
      }
    }
    return false;
  });
});

watch(() => props.profile, (newProfile) => {
  if (newProfile) {
    const profileCopy = JSON.parse(JSON.stringify(newProfile));
    // Format date for input[type=date]
    if (profileCopy.expiresAt) {
      try {
        profileCopy.expiresAt = new Date(profileCopy.expiresAt).toISOString().split('T')[0];
      } catch (e) {
        console.error("Error parsing expiresAt date:", e);
        profileCopy.expiresAt = '';
      }
    }
    // 初始化前缀设置
    if (!profileCopy.prefixSettings) {
      profileCopy.prefixSettings = {
        enableManualNodes: null,
        enableSubscriptions: null,
        manualNodePrefix: '',
        enableNodeEmoji: null
      };
    }
    localProfile.value = profileCopy;
  } else {
    localProfile.value = { 
      name: '', 
      enabled: true, 
      subscriptions: [], 
      manualNodes: [], 
      customId: '', 
      expiresAt: '',
      isPublic: false, // [新增]
      description: '', // [新增]
      prefixSettings: {
        enableManualNodes: null,
        enableSubscriptions: null,
        manualNodePrefix: '',
        enableNodeEmoji: null // [新增] 初始化为 null (使用全局设置)
      }
    };
  }
}, { deep: true, immediate: true });

const handleConfirm = () => {
  const profileToSave = JSON.parse(JSON.stringify(localProfile.value));
  if (profileToSave.expiresAt) {
    try {
      // Set time to the end of the selected day in local time, then convert to ISO string
      const date = new Date(profileToSave.expiresAt);
      date.setHours(23, 59, 59, 999);
      profileToSave.expiresAt = date.toISOString();
    } catch (e) {
      console.error("Error processing expiresAt date:", e);
      // Decide how to handle error: save as is, or clear it
      profileToSave.expiresAt = ''; 
    }
  }
  emit('save', profileToSave);
};

const toggleSelection = (listName, id) => {
    const list = localProfile.value[listName];
    const index = list.indexOf(id);
    if (index > -1) {
        list.splice(index, 1);
    } else {
        list.push(id);
    }
};

const handleSelectAll = (listName, sourceArray) => {
    const currentSelection = new Set(localProfile.value[listName]);
    sourceArray.forEach(item => currentSelection.add(item.id));
    localProfile.value[listName] = Array.from(currentSelection);
};

const handleDeselectAll = (listName, sourceArray) => {
    const sourceIds = sourceArray.map(item => item.id);
    localProfile.value[listName] = localProfile.value[listName].filter(id => !sourceIds.includes(id));
};

</script>

<template>
  <Modal :show="show" @update:show="emit('update:show', $event)" @confirm="handleConfirm" size="2xl">
    <template #title>
      <h3 class="text-lg font-bold text-gray-800 dark:text-white">
        {{ isNew ? '新增订阅组' : '编辑订阅组' }}
      </h3>
    </template>
    <template #body>
      <div v-if="localProfile" class="space-y-6">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label for="profile-name" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                订阅组名称
              </label>
              <input
                type="text"
                id="profile-name"
                v-model="localProfile.name"
                placeholder="例如：家庭共享"
                class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white"
              >
            </div>
            <div>
              <label for="profile-custom-id" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                自定义 ID (可选)
              </label>
              <input
                type="text"
                id="profile-custom-id"
                v-model="localProfile.customId"
                placeholder="如: home, game (限字母、数字、-、_)"
                class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white"
              >
               <p class="text-xs text-gray-400 mt-1">设置后，订阅链接会更短，如 /token/home</p>
            </div>
        </div>

        <!-- [新增] Public Display & Description -->
        <div class="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-100 dark:border-gray-700">
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center">
                    <input
                        type="checkbox"
                        id="profile-is-public"
                        v-model="localProfile.isPublic"
                        class="h-4 w-4 rounded-sm border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label for="profile-is-public" class="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        公开展示 (Public)
                    </label>
                </div>
                <span class="text-xs text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full" v-if="localProfile.isPublic">
                    将在公开页显示
                </span>
            </div>
            
            <div v-if="localProfile.isPublic" class="animate-fade-in-down">
                <label for="profile-description" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    公开页描述 / 简介
                </label>
                <textarea
                    id="profile-description"
                    v-model="localProfile.description"
                    rows="2"
                    placeholder="简要介绍此订阅组的内容，将在公开页面展示。"
                    class="block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white"
                ></textarea>
            </div>
            <div v-else class="text-xs text-gray-400">
                开启后，任何人均可通过公开页面查看此订阅组的名称和简介，并获取订阅链接。
            </div>
        </div>

        <!-- Advanced Settings Toggle -->
        <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
            <button 
                type="button" 
                @click="showAdvanced = !showAdvanced"
                class="flex items-center text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 focus:outline-hidden"
            >
                <span>高级设置</span>
                <svg :class="{'rotate-180': showAdvanced}" class="w-4 h-4 ml-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            
            <div v-show="showAdvanced" class="mt-4 space-y-4 animate-fade-in-down">
                 <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                    <label for="profile-subconverter" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        自定义后端 (可选)
                    </label>
                    <SubConverterSelector
                        id="profile-subconverter"
                        v-model="localProfile.subConverter"
                        type="backend"
                        placeholder="留空则使用全局设置"
                        :allowEmpty="true"
                    />
                    <p class="text-xs text-gray-400 mt-1">为此订阅组指定一个独立的 SubConverter 后端地址。</p>
                    </div>
                    <div>
                    <label for="profile-subconfig" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        自定义远程配置 (可选)
                    </label>
                    <SubConverterSelector
                        id="profile-subconfig"
                        v-model="localProfile.subConfig"
                        type="config"
                        placeholder="留空则使用全局设置"
                        :allowEmpty="true"
                    />
                    <p class="text-xs text-gray-400 mt-1">为此订阅组指定一个独立的 Subconverter 配置文件。</p>
                    </div>
                    <div>
                    <label for="profile-expires-at" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        到期时间 (可选)
                    </label>
                    <input
                        type="date"
                        id="profile-expires-at"
                        v-model="localProfile.expiresAt"
                        class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white"
                    >
                    <p class="text-xs text-gray-400 mt-1">设置此订阅组的到期时间，到期后将返回默认节点。</p>
                    </div>
                 </div>

                <!-- Prefix Settings -->
                <div class="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">前缀设置 (覆盖全局)</label>
                    <div class="space-y-3">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <div class="flex items-center justify-between mb-1">
                                    <span class="text-sm text-gray-600 dark:text-gray-400">手动节点前缀</span>
                                    <select 
                                        v-model="localProfile.prefixSettings.enableManualNodes" 
                                        class="text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-1.5 py-0.5 focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 dark:text-white"
                                    >
                                        <option :value="null">默认</option>
                                        <option :value="true">启用</option>
                                        <option :value="false">禁用</option>
                                    </select>
                                </div>
                                <input 
                                    v-if="localProfile.prefixSettings.enableManualNodes === true"
                                    type="text" 
                                    v-model="localProfile.prefixSettings.manualNodePrefix" 
                                    placeholder="自定义前缀"
                                    class="block w-full px-2 py-1 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 dark:text-white"
                                >
                            </div>
                            
                            <div>
                                <div class="flex items-center justify-between mb-1">
                                    <span class="text-sm text-gray-600 dark:text-gray-400">订阅节点前缀</span>
                                    <select 
                                        v-model="localProfile.prefixSettings.enableSubscriptions" 
                                        class="text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-1.5 py-0.5 focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 dark:text-white"
                                    >
                                        <option :value="null">默认</option>
                                        <option :value="true">启用</option>
                                        <option :value="false">禁用</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div>
                                <div class="flex items-center justify-between">
                                    <span class="text-sm text-gray-600 dark:text-gray-400">节点国旗 Emoji</span>
                                    <select
                                        v-model="localProfile.prefixSettings.enableNodeEmoji"
                                        class="text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-1.5 py-0.5 focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 dark:text-white"
                                    >
                                        <option :value="null">默认</option>
                                        <option :value="true">启用</option>
                                        <option :value="false">禁用</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

            <div v-if="allSubscriptions.length > 0" class="space-y-2">
              <div class="flex justify-between items-center mb-2">
                <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">选择机场订阅</h4>
                <div class="space-x-2">
                    <button @click="handleSelectAll('subscriptions', filteredSubscriptions)" class="text-xs text-indigo-600 hover:underline">全选</button>
                    <button @click="handleDeselectAll('subscriptions', filteredSubscriptions)" class="text-xs text-indigo-600 hover:underline">全不选</button>
                </div>
              </div>
              <div class="relative mb-2">
                <input
                  type="text"
                  v-model="subscriptionSearchTerm"
                  placeholder="搜索订阅..."
                  class="w-full pl-9 pr-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <div class="overflow-y-auto space-y-2 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border dark:border-gray-700 h-48">
                <div v-for="sub in filteredSubscriptions" :key="sub.id">
                  <label class="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      :checked="localProfile.subscriptions?.includes(sub.id)"
                      @change="toggleSelection('subscriptions', sub.id)"
                      class="h-4 w-4 rounded-sm border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span class="text-sm text-gray-800 dark:text-gray-200 truncate" :title="sub.name">{{ sub.name || '未命名订阅' }}</span>
                  </label>
                </div>
                <div v-if="filteredSubscriptions.length === 0" class="text-center text-gray-500 text-sm py-4">
                  没有找到匹配的订阅。
                </div>
              </div>
            </div>
            <div v-else class="text-center text-sm text-gray-500 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg flex items-center justify-center h-full">
              没有可用的机场订阅
            </div>

            <div v-if="allManualNodes.length > 0" class="space-y-2">
              <div class="flex justify-between items-center mb-2">
                <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">选择手动节点</h4>
                 <div class="space-x-2">
                    <button @click="handleSelectAll('manualNodes', filteredManualNodes)" class="text-xs text-indigo-600 hover:underline">全选</button>
                    <button @click="handleDeselectAll('manualNodes', filteredManualNodes)" class="text-xs text-indigo-600 hover:underline">全不选</button>
                </div>
              </div>
              <!-- Color Filter -->
              <div class="flex items-center gap-2 mb-2 bg-gray-50 dark:bg-gray-800/50 p-1.5 rounded-lg border border-gray-100 dark:border-gray-700/50">
                <button 
                  @click="activeManualNodeColorFilter = null"
                  class="px-3 py-1 text-xs font-medium rounded-md transition-all border !min-w-0 !min-h-0"
                  :class="!activeManualNodeColorFilter ? 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 shadow-xs text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'"
                >全部</button>
                <div class="w-px h-3 bg-gray-200 dark:bg-gray-600 mx-1"></div>
                <button 
                  v-for="color in ['red', 'orange', 'green', 'blue']" 
                  :key="color"
                  @click="activeManualNodeColorFilter = activeManualNodeColorFilter === color ? null : color"
                  class="w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-110 !min-w-0 !min-h-0"
                  :class="[
                    `bg-${color}-500`,
                    activeManualNodeColorFilter === color ? 'ring-2 ring-offset-1 ring-indigo-500 dark:ring-offset-gray-900 scale-110' : 'opacity-70 hover:opacity-100'
                  ]"
                ></button>
              </div>

              <div class="relative mb-2">
                <input
                  type="text"
                  v-model="nodeSearchTerm"
                  placeholder="搜索节点..."
                  class="w-full pl-9 pr-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
               <div class="overflow-y-auto space-y-2 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border dark:border-gray-700 h-48">
                <div v-for="node in filteredManualNodes" :key="node.id">
                  <label class="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      :checked="localProfile.manualNodes?.includes(node.id)"
                      @change="toggleSelection('manualNodes', node.id)"
                      class="h-4 w-4 rounded-sm border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span class="text-sm text-gray-800 dark:text-gray-200 truncate" :title="node.name">{{ node.name || '未命名节点' }}</span>
                  </label>
                </div>
                <div v-if="filteredManualNodes.length === 0" class="text-center text-gray-500 text-sm py-4">
                  没有找到匹配的节点。
                </div>
              </div>
            </div>
            <div v-else class="text-center text-sm text-gray-500 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg flex items-center justify-center h-full">
               没有可用的手动节点
            </div>
        </div>

      </div>
    </template>
  </Modal>
</template>