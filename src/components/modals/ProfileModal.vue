<script setup>
import { ref, watch, computed } from 'vue';
import Modal from '../forms/Modal.vue';
import ProfileForm from './ProfileModal/ProfileForm.vue';
import SubscriptionSelector from './ProfileModal/SubscriptionSelector.vue';
import NodeSelector from './ProfileModal/NodeSelector.vue';
import { useManualNodes } from '../../composables/useManualNodes.js';
import { useDataStore } from '../../stores/useDataStore.js';

const dataStore = useDataStore();
const { manualNodeGroups } = useManualNodes(dataStore.markDirty);

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
const activeManualNodeGroupFilter = ref(null);
const showAdvanced = ref(false);
const uiText = {
  prefixTitle: '\u8282\u70b9\u524d\u7f00\u8bbe\u7f6e',
  manualPrefixLabel: '\u624b\u52a8\u8282\u70b9\u524d\u7f00',
  manualPrefixToggle: '\u624b\u52a8\u8282\u70b9\u524d\u7f00',
  subscriptionPrefixToggle: '\u673a\u573a\u8ba2\u9605\u524d\u7f00',
  enable: '\u542f\u7528',
  disable: '\u7981\u7528',
  nodeTransformTitle: '\u8282\u70b9\u51c0\u5316\u7ba1\u9053'
};
const prefixToggleOptions = [
  { label: '\u9ed8\u8ba4(\u5168\u5c40)', value: null },
  { label: '\u542f\u7528', value: true },
  { label: '\u7981\u7528', value: false }
];

const createDefaultNodeTransform = () => ({
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
    keys: [
      { key: 'region', order: 'asc', customOrder: ['??', '??', '??', '???', '??', '??', '??', '??', '??', '???'] },
      { key: 'protocol', order: 'asc', customOrder: ['vless', 'trojan', 'vmess', 'hysteria2', 'ss', 'ssr'] },
      { key: 'name', order: 'asc' }
    ]
  }
});


// 国家/地区代码到旗帜和中文名称的映射
const countryCodeMap = {
  'hk': ['🇭🇰', '香港'],
  'tw': ['🇨🇳', '台湾', '臺灣'],
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

      if (activeManualNodeGroupFilter.value) {
    if (activeManualNodeGroupFilter.value === '默认') {
      nodes = nodes.filter(n => !n.group);
    } else {
      nodes = nodes.filter(n => n.group === activeManualNodeGroupFilter.value);
    }
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
    if (!profileCopy.prefixSettings || typeof profileCopy.prefixSettings !== 'object') {
      profileCopy.prefixSettings = {};
    }
    profileCopy.prefixSettings.enableManualNodes =
      profileCopy.prefixSettings.enableManualNodes ?? null;
    profileCopy.prefixSettings.enableSubscriptions =
      profileCopy.prefixSettings.enableSubscriptions ?? null;
    profileCopy.prefixSettings.manualNodePrefix =
      profileCopy.prefixSettings.manualNodePrefix ?? '';
    if (Object.prototype.hasOwnProperty.call(profileCopy.prefixSettings, 'enableNodeEmoji')) {
      delete profileCopy.prefixSettings.enableNodeEmoji;
    }
    profileCopy.nodeTransform = profileCopy.nodeTransform ?? null;
    localProfile.value = profileCopy;
  } else {
    localProfile.value = { 
      name: '', 
      enabled: true, 
      subscriptions: [], 
      manualNodes: [], 
      customId: '', 
      expiresAt: '',
      isPublic: true, // [新增] 默认为 true
      description: '', // [新增]
      prefixSettings: {
        enableManualNodes: null,
        enableSubscriptions: null,
        manualNodePrefix: ''
      },
      nodeTransform: null
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
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-xl bg-indigo-500/10">
          <!-- Folder Icon for Profile -->
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </div>
        <h3 class="text-lg font-bold text-gray-800 dark:text-white">
          {{ isNew ? '新增订阅组' : '编辑订阅组' }}
        </h3>
      </div>
    </template>
    <template #body>
      <div v-if="localProfile" class="space-y-6">
        <ProfileForm
          :local-profile="localProfile"
          :show-advanced="showAdvanced"
          :ui-text="uiText"
          :prefix-toggle-options="prefixToggleOptions"
          :create-default-node-transform="createDefaultNodeTransform"
          @toggle-advanced="showAdvanced = !showAdvanced"
        />

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

          <SubscriptionSelector
            :subscriptions="allSubscriptions"
            :filtered-subscriptions="filteredSubscriptions"
            :search-term="subscriptionSearchTerm"
            :selected-ids="localProfile.subscriptions || []"
            @update:search-term="subscriptionSearchTerm = $event"
            @toggle-selection="toggleSelection('subscriptions', $event)"
            @select-all="handleSelectAll('subscriptions', filteredSubscriptions)"
            @deselect-all="handleDeselectAll('subscriptions', filteredSubscriptions)"
          />

          <NodeSelector
            :nodes="allManualNodes"
            :filtered-nodes="filteredManualNodes"
            :search-term="nodeSearchTerm"
            :active-group-filter="activeManualNodeGroupFilter"
            :groups="manualNodeGroups"
            :selected-ids="localProfile.manualNodes || []"
            @update:search-term="nodeSearchTerm = $event"
            @update:group-filter="activeManualNodeGroupFilter = $event"
            @toggle-selection="toggleSelection('manualNodes', $event)"
            @select-all="handleSelectAll('manualNodes', filteredManualNodes)"
            @deselect-all="handleDeselectAll('manualNodes', filteredManualNodes)"
          />
        </div>

      </div>
    </template>
  </Modal>
</template>
