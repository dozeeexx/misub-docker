// FILE: src/composables/useManualNodes.js
import { ref, computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useDataStore } from '../stores/useDataStore';
import { useToastStore } from '../stores/toast';
import { extractNodeName } from '../lib/utils.js';

export function useManualNodes(markDirty) {
  const { showToast } = useToastStore();
  const dataStore = useDataStore();
  const { subscriptions: allSubscriptions } = storeToRefs(dataStore);

  // Manual Nodes are items in subscriptions that are NOT http/https
  // We filter from the shared store state
  const manualNodes = computed(() => {
    return (allSubscriptions.value || []).filter(item => !item.url || !/^https?:\/\//.test(item.url));
  });

  const manualNodesCurrentPage = ref(1);
  const manualNodesPerPage = 24;
  const searchTerm = ref('');

  // 国家/地区代码到旗帜和中文名称的映射
  const countryCodeMap = {
    'hk': ['🇭🇰', '香港', 'HK'],
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

  const activeColorFilter = ref(null); // null = all, or color string

  const filteredManualNodes = computed(() => {
    let nodes = manualNodes.value;

    // Apply Color Filter
    if (activeColorFilter.value) {
      nodes = nodes.filter(n => n.colorTag === activeColorFilter.value);
    }

    if (!searchTerm.value) {
      return nodes;
    }
    const searchQuery = searchTerm.value.toLowerCase().trim();
    const alternativeTerms = countryCodeMap[searchQuery] || [];

    return nodes.filter(node => {
      if (!node.name) return false;
      const nodeName = node.name.toLowerCase();
      if (nodeName.includes(searchQuery)) return true;
      for (const altTerm of alternativeTerms) {
        if (nodeName.includes(altTerm.toLowerCase())) return true;
      }
      return false;
    });
  });

  const manualNodesTotalPages = computed(() => Math.ceil(filteredManualNodes.value.length / manualNodesPerPage));

  const paginatedManualNodes = computed(() => {
    const start = (manualNodesCurrentPage.value - 1) * manualNodesPerPage;
    const end = start + manualNodesPerPage;
    return filteredManualNodes.value.slice(start, end);
  });

  const enabledManualNodes = computed(() => manualNodes.value.filter(n => n.enabled));

  function changeManualNodesPage(page) {
    if (page < 1 || page > manualNodesTotalPages.value) return;
    manualNodesCurrentPage.value = page;
  }

  function setColorFilter(color) {
    activeColorFilter.value = color;
    manualNodesCurrentPage.value = 1; // Reset to page 1
  }

  function batchUpdateColor(nodeIds, color) {
    if (!nodeIds || nodeIds.length === 0) return;
    const idsSet = new Set(nodeIds);
    const updates = manualNodes.value
      .filter(n => idsSet.has(n.id))
      .map(n => {
        // Only update if changed
        if (n.colorTag === color) return null;
        return { id: n.id, updates: { ...n, colorTag: color } };
      })
      .filter(u => u);

    if (updates.length > 0) {
      updates.forEach(({ id, updates }) => {
        dataStore.updateSubscription(id, updates);
      });
      markDirty();
      showToast(`已标记 ${updates.length} 个节点`, 'success');
    }
  }

  function batchDeleteNodes(nodeIds) {
    if (!nodeIds || nodeIds.length === 0) return;
    // Confirmation moved to UI layer

    nodeIds.forEach(id => {
      dataStore.removeSubscription(id);
    });

    // Adjust pagination if needed
    if (paginatedManualNodes.value.length === 0 && manualNodesCurrentPage.value > 1) {
      manualNodesCurrentPage.value--;
    }

    markDirty();
    showToast(`已删除 ${nodeIds.length} 个节点`, 'success');
  }

  function addNode(node) {
    if (!node.name) {
      node.name = extractNodeName(node.url);
    }
    // Add to shared store
    dataStore.addSubscription(node);
    manualNodesCurrentPage.value = 1;
    markDirty();
  }

  function updateNode(updatedNode) {
    // Update in shared store
    dataStore.updateSubscription(updatedNode.id, updatedNode);
    markDirty();
  }

  function deleteNode(nodeId) {
    dataStore.removeSubscription(nodeId);
    if (paginatedManualNodes.value.length === 0 && manualNodesCurrentPage.value > 1) {
      manualNodesCurrentPage.value--;
    }
    markDirty();
  }

  function deleteAllNodes() {
    // Only remove proper manual nodes (not subscriptions)
    const idsToRemove = manualNodes.value.map(n => n.id);
    idsToRemove.forEach(id => dataStore.removeSubscription(id));

    manualNodesCurrentPage.value = 1;
    markDirty();
  }

  function addNodesFromBulk(nodes) {
    // Reverse insert
    for (let i = nodes.length - 1; i >= 0; i--) {
      dataStore.addSubscription(nodes[i]);
    }
    markDirty();
  }

  const getUniqueKey = (url) => {
    try {
      if (url.startsWith('vmess://')) {
        const base64Part = url.substring('vmess://'.length);
        const decodedString = atob(base64Part);
        const cleanedString = decodedString.replace(/\s/g, '');
        const nodeConfig = JSON.parse(cleanedString);
        delete nodeConfig.ps;
        delete nodeConfig.remark;
        return 'vmess://' + JSON.stringify(Object.keys(nodeConfig).sort().reduce(
          (obj, key) => {
            obj[key] = nodeConfig[key];
            return obj;
          },
          {}
        ));
      }
      const hashIndex = url.indexOf('#');
      return hashIndex !== -1 ? url.substring(0, hashIndex) : url;
    } catch (e) {
      return url;
    }
  };

  function deduplicateNodes() {
    const originalCount = manualNodes.value.length;
    // We only scan current manual nodes
    const nodes = manualNodes.value;
    const seenKeys = new Set();
    const idsToKeep = new Set();

    // Identify duplicates locally
    for (const node of nodes) {
      const uniqueKey = getUniqueKey(node.url);
      if (!seenKeys.has(uniqueKey)) {
        seenKeys.add(uniqueKey);
        idsToKeep.add(node.id);
      }
    }

    // Calculate which IDs to remove (from the manual nodes set)
    const idsToRemove = nodes
      .filter(n => !idsToKeep.has(n.id))
      .map(n => n.id);

    if (idsToRemove.length > 0) {
      idsToRemove.forEach(id => dataStore.removeSubscription(id));
      showToast(`成功移除 ${idsToRemove.length} 个重复节点，请记得保存。`, 'success');
      markDirty();
    } else {
      showToast('没有发现重复的节点。', 'info');
    }

    manualNodesCurrentPage.value = 1;
  }

  function autoSortNodes() {
    // Sort logic requires replacing the list.
    // Since manual nodes are part of a larger list (subscriptions), we need to extract them, sort them, 
    // and then potentially re-insert them or just update their order relative to themselves?
    // The store's 'subscriptions' array is mixed.
    // If we want to sort ONLY manual nodes but keep subscriptions in place... 
    // It's complex because we don't track indices separately easily.
    // Approach: Extract all Manual Nodes, Sort them, Extract all Subscriptions (keep order),
    // Then Combine: [Subscriptions..., SortedManualNodes...]
    // This effectively moves all manual nodes to the bottom. This is acceptable/expected behavior.

    const subs = allSubscriptions.value.filter(s => s.url && /^https?:\/\//.test(s.url));
    const nodes = [...manualNodes.value]; // Copy manual nodes

    const regionKeywords = { HK: [/香港/, /HK/, /Hong Kong/i], TW: [/台湾/, /TW/, /Taiwan/i], SG: [/新加坡/, /SG/, /狮城/, /Singapore/i], JP: [/日本/, /JP/, /Japan/i], US: [/美国/, /US/, /United States/i], KR: [/韩国/, /KR/, /Korea/i], GB: [/英国/, /GB/, /UK/, /United Kingdom/i], DE: [/德国/, /DE/, /Germany/i], FR: [/法国/, /FR/, /France/i], CA: [/加拿大/, /CA/, /Canada/i], AU: [/澳大利亚/, /AU/, /Australia/i], };
    const regionOrder = ['HK', 'TW', 'SG', 'JP', 'US', 'KR', 'GB', 'DE', 'FR', 'CA', 'AU'];
    const getRegionCode = (name) => { for (const code in regionKeywords) { for (const keyword of regionKeywords[code]) { if (keyword.test(name)) return code; } } return 'ZZ'; };

    nodes.sort((a, b) => {
      const regionA = getRegionCode(a.name);
      const regionB = getRegionCode(b.name);
      // ... same sort logic ...
      const indexA = regionOrder.indexOf(regionA);
      const indexB = regionOrder.indexOf(regionB);
      const effectiveIndexA = indexA === -1 ? Infinity : indexA;
      const effectiveIndexB = indexB === -1 ? Infinity : indexB;

      // Primary Sort: Group
      const groupA = a.group || '';
      const groupB = b.group || '';
      if (groupA !== groupB) {
        if (!groupA) return 1; // Empty group last
        if (!groupB) return -1;
        return groupA.localeCompare(groupB, 'zh-CN');
      }

      if (effectiveIndexA !== effectiveIndexB) return effectiveIndexA - effectiveIndexB;
      return a.name.localeCompare(b.name, 'zh-CN');
    });

    // Update store with new order: Manual Nodes first, then Subscriptions
    dataStore.overwriteSubscriptions([...nodes, ...subs]);

    manualNodesCurrentPage.value = 1;
    markDirty();
  }

  watch(searchTerm, (newValue, oldValue) => {
    if (newValue !== oldValue) {
      manualNodesCurrentPage.value = 1;
    }
  });

  function reorderManualNodes(newOrder) {
    // 1. Get all Subscriptions (to preserve them)
    const currentSubscriptions = (allSubscriptions.value || []).filter(item => item.url && /^https?:\/\//.test(item.url));

    // 2. Combine Existing Subscriptions + New Ordered Manual Nodes
    // Logic: Manual Nodes at top, Subscriptions at bottom
    const mergedList = [...newOrder, ...currentSubscriptions];

    // 3. Update Store
    dataStore.overwriteSubscriptions(mergedList);

    // 4. Mark Dirty
    markDirty();
  }

  const manualNodeGroups = computed(() => {
    const groups = new Set();
    manualNodes.value.forEach(node => {
      if (node.group) {
        groups.add(node.group);
      }
    });
    return Array.from(groups).sort();
  });

  const groupedManualNodes = computed(() => {
    const groups = {};
    // Initialize groups
    manualNodeGroups.value.forEach(group => {
      groups[group] = [];
    });
    groups['默认'] = []; // Default group for ungrouped nodes

    // Distribute nodes matches the current filter/search
    // Use filteredManualNodes if we want to search within groups?
    // Yes, usually we want to see search results grouped.

    const nodesToDisplay = filteredManualNodes.value;

    nodesToDisplay.forEach(node => {
      const groupName = node.group || '默认';
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(node);
    });

    // Remove empty groups if they are not the target of a move (UI logic usually)
    // For display, we might want to hide empty groups if search is active?
    // Let's keep it simple: return all groups that have nodes AFTER filtering, 
    // PLUS all existing groups (so empty groups show up? No, usually not).

    // Reformatted: Only return groups that have matching nodes
    const result = {};
    Object.keys(groups).forEach(key => {
      if (groups[key].length > 0) {
        result[key] = groups[key];
      }
    });

    return result;
  });

  function renameGroup(oldName, newName) {
    if (!oldName || !newName || oldName === newName) return;

    const nodesInGroup = manualNodes.value.filter(n => n.group === oldName);
    nodesInGroup.forEach(node => {
      dataStore.updateSubscription(node.id, { ...node, group: newName });
    });
    markDirty();
  }

  function deleteGroup(groupName) {
    if (!groupName) return;
    // Ungroup nodes (move to default)
    const nodesInGroup = manualNodes.value.filter(n => n.group === groupName);
    nodesInGroup.forEach(node => {
      // Creating a copy logic is safe here as updateSubscription handles it
      const { group, ...rest } = node;
      dataStore.updateSubscription(node.id, { ...rest, group: '' }); // Set to empty string or remove property
    });
    markDirty();
  }

  return {
    manualNodes, // Returns computed filtered list
    manualNodeGroups,
    groupedManualNodes,
    manualNodesCurrentPage,
    manualNodesTotalPages,
    paginatedManualNodes,
    enabledManualNodesCount: computed(() => enabledManualNodes.value.length),
    searchTerm,
    activeColorFilter, // New
    changeManualNodesPage,
    addNode,
    updateNode,
    deleteNode,
    deleteAllNodes,
    addNodesFromBulk,
    autoSortNodes,
    deduplicateNodes,
    reorderManualNodes, // Added
    renameGroup,
    deleteGroup,
    setColorFilter, // New
    batchUpdateColor, // New
    batchDeleteNodes // New
  };
}