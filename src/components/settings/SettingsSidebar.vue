<script setup>
const props = defineProps({
  activeTab: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['update:activeTab']);

const tabs = [
    { id: 'basic', label: '基础设置', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
    { id: 'service', label: '服务集成', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },

    { id: 'web', label: 'Web访问', icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9' },
    { id: 'client', label: '客户端管理', icon: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z' },
    { id: 'system', label: '系统设置', icon: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01' },
];
</script>

<template>
  <nav class="grid grid-cols-2 gap-2 p-1 md:flex md:flex-col md:space-y-1 md:gap-0 md:p-0">
    <button 
        v-for="tab in tabs" 
        :key="tab.id"
        @click="emit('update:activeTab', tab.id)"
        class="w-full flex items-center justify-center md:justify-start px-3 py-2.5 md:px-3 md:py-2 text-sm font-medium rounded-lg md:rounded-md transition-all duration-200"
        :class="activeTab === tab.id 
            ? 'bg-indigo-600 text-white md:bg-indigo-50 md:text-indigo-700 dark:bg-indigo-600 dark:text-white md:dark:bg-indigo-900/50 md:dark:text-indigo-300 shadow-md md:shadow-none' 
            : 'text-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 md:hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200 border border-gray-100 dark:border-gray-700 md:border-0'"
    >
      <svg class="mr-2 md:mr-3 flex-shrink-0 h-5 w-5 md:h-6 md:w-6" :class="activeTab === tab.id ? 'text-white md:text-indigo-500 md:dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'" 
           xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path v-if="tab.id === 'basic'" stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path v-if="tab.id === 'basic'" stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        
        <path v-if="tab.id === 'service'" stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        

        <path v-if="tab.id === 'web'" stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        
        <path v-if="tab.id === 'client'" stroke-linecap="round" stroke-linejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />

        <path v-if="tab.id === 'system'" stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
      </svg>
      {{ tab.label }}
    </button>
  </nav>
</template>
