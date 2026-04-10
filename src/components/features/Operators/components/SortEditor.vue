<script setup>
import { computed } from 'vue';

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['update:modelValue']);

const params = computed({
  get: () => ({
    keys: [],
    ...props.modelValue
  }),
  set: (val) => emit('update:modelValue', val)
});

const addKey = () => {
  params.value.keys = [...params.value.keys, { key: 'name', order: 'asc', customOrder: [] }];
};

const removeKey = (index) => {
  const newList = [...params.value.keys];
  newList.splice(index, 1);
  params.value = { ...params.value, keys: newList };
};

const moveKey = (index, dir) => {
  const newList = [...params.value.keys];
  const target = index + dir;
  if (target < 0 || target >= newList.length) return;
  [newList[index], newList[target]] = [newList[target], newList[index]];
  params.value = { ...params.value, keys: newList };
};

const availableKeys = [
  { value: 'name', label: '节点名称' },
  { value: 'region', label: '地区' },
  { value: 'protocol', label: '协议' },
  { value: 'server', label: '服务器' },
  { value: 'port', label: '端口' }
];

</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <label class="text-[11px] font-bold text-gray-400 uppercase tracking-tight">排序权重 (Weights)</label>
      <button @click="addKey" class="text-[10px] text-indigo-600 font-bold">+ 添加条件</button>
    </div>

    <div class="space-y-1.5">
      <div v-for="(item, idx) in params.keys" :key="idx" 
        class="flex items-center gap-2 p-2 bg-gray-50/50 dark:bg-gray-900/40 rounded-xl border border-gray-100 dark:border-gray-800 transition-all">
        
        <div class="flex flex-col">
          <button @click="moveKey(idx, -1)" class="text-gray-300 hover:text-indigo-500 disabled:opacity-20" :disabled="idx === 0">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M5 15l7-7 7 7" /></svg>
          </button>
          <button @click="moveKey(idx, 1)" class="text-gray-300 hover:text-indigo-500 disabled:opacity-20" :disabled="idx === params.keys.length - 1">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 9l-7 7-7-7" /></svg>
          </button>
        </div>

        <select v-model="item.key" class="flex-1 bg-transparent border-none p-0 text-[11px] font-medium focus:ring-0 outline-none">
          <option v-for="k in availableKeys" :key="k.value" :value="k.value">{{ k.label }}</option>
        </select>

        <select v-model="item.order" class="w-14 bg-transparent border-none p-0 text-[11px] text-gray-500 focus:ring-0 outline-none">
          <option value="asc">升序</option>
          <option value="desc">降序</option>
        </select>

        <button @click="removeKey(idx)" class="p-1 text-gray-300 hover:text-rose-500">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div v-if="params.keys.length === 0" class="text-center py-2 text-[10px] text-gray-400 italic">
        未设置权重，将按默认顺序排序
      </div>
    </div>
  </div>
</template>
