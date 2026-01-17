<script setup>
import { ref } from 'vue';
import Modal from '../forms/Modal.vue';

const props = defineProps({
  show: Boolean,
});

const emit = defineEmits(['update:show', 'import']);

const importText = ref('');
const selectedColorTag = ref(null);
const urlFocused = ref(false);

const handleConfirm = () => {
    emit('import', importText.value, selectedColorTag.value);
    emit('update:show', false);
    importText.value = '';
    selectedColorTag.value = null;
};

// Color mapping for UI display
const colorMap = {
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  green: 'bg-green-500',
  blue: 'bg-blue-500'
};
</script>

<template>
  <Modal :show="show" @update:show="emit('update:show', $event)" @confirm="handleConfirm" size="2xl">
    <template #title>
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-xl bg-indigo-500/10">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h3 class="text-lg font-bold text-gray-800 dark:text-white">
          批量导入
        </h3>
      </div>
    </template>
    
    <template #body>
      <div class="space-y-5">
        <p class="text-sm text-gray-500 dark:text-gray-400">
           每行一个订阅链接或分享节点。将自动识别节点名称。
        </p>
      
        <!-- Color Tag Selector -->
        <div class="relative">
            <div 
              class="relative border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 rounded-xl px-3 py-2 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 transition-colors h-[50px] flex items-center"
            >
              <div class="flex items-center justify-between w-full">
                <div class="flex items-center gap-2">
                  <span class="text-xs text-gray-500 dark:text-gray-400 mr-2 font-medium">自动标记颜色</span>
                  <button
                    v-for="color in ['red', 'orange', 'green', 'blue']"
                    :key="color"
                    @click="selectedColorTag = selectedColorTag === color ? null : color"
                    class="w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center hover:scale-110"
                    :class="[
                      selectedColorTag === color 
                        ? 'border-white dark:border-gray-800 ring-2 ring-offset-1 ring-offset-white dark:ring-offset-gray-900 scale-110' 
                        : 'border-transparent',
                      colorMap[color],
                      selectedColorTag === color ? `ring-${color}-500` : ''
                    ]"
                  >
                    <svg v-if="selectedColorTag === color" xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-white drop-shadow" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                    </svg>
                  </button>
                </div>
                <button
                  v-if="selectedColorTag"
                  @click="selectedColorTag = null"
                  class="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  清除
                </button>
                <span v-else class="text-xs text-gray-400">无</span>
              </div>
            </div>
          </div>

        <div class="relative group">
          <div 
            class="relative border rounded-xl transition-all duration-300 overflow-hidden bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-white/10"
            :class="[
              urlFocused 
                ? 'ring-2 ring-primary-500/50 border-primary-500 dark:border-primary-500' 
                : 'hover:border-gray-300 dark:hover:border-white/20'
            ]"
          >
            <div class="flex h-full">
               <div class="py-3 pl-3 flex items-start text-gray-400 group-focus-within:text-primary-500 transition-colors pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                   <path stroke-linecap="round" stroke-linejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <textarea 
                v-model="importText"
                rows="8"
                @focus="urlFocused = true"
                @blur="urlFocused = false"
                class="flex-1 w-full bg-transparent border-0 focus:ring-0 dark:text-white placeholder-gray-400 text-sm font-mono resize-none py-3 px-3 min-h-[160px]"
                placeholder="http://...&#10;https://...&#10;vmess://...&#10;vless://...&#10;trojan://..."
              ></textarea>
            </div>
            <!-- Focus Glow -->
            <div class="absolute inset-0 rounded-xl pointer-events-none transition-opacity duration-300 opacity-0 group-focus-within:opacity-100 ring-1 ring-primary-500/20"></div>
          </div>
        </div>
      </div>
    </template>
  </Modal>
</template>