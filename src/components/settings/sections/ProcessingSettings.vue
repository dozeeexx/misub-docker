<script setup>
import { computed } from 'vue';
import NodeTransformSettings from '../NodeTransformSettings.vue';

const props = defineProps({
  settings: {
    type: Object,
    required: true
  },
  prefixConfig: {
    type: Object,
    required: true
  },
  nodeTransform: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['update:nodeTransform']);
</script>

<template>
  <div class="space-y-6">
    <h3 class="text-lg font-medium text-gray-900 dark:text-white border-b pb-2 dark:border-gray-700">节点处理配置</h3>
    
    <!-- Prefixes -->
    <div>
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">节点前缀设置</label>
      <div class="space-y-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
          <div class="flex items-center justify-between">
            <div><p class="text-sm font-medium text-gray-700 dark:text-gray-300">全局前缀开关</p></div>
            <label class="toggle-switch"><input type="checkbox" v-model="settings.prependSubName"><span class="slider"></span></label>
          </div>
          <div v-if="settings.prependSubName" class="mt-4 space-y-3 border-t border-gray-200 dark:border-gray-600 pt-3">
              <div class="flex items-center justify-between">
                <div><p class="text-sm font-medium text-gray-700 dark:text-gray-300">手动节点前缀</p></div>
                <label class="toggle-switch"><input type="checkbox" v-model="prefixConfig.enableManualNodes"><span class="slider"></span></label>
              </div>
              <div v-if="prefixConfig.enableManualNodes" class="ml-4">
                <input type="text" v-model="prefixConfig.manualNodePrefix" class="block w-full text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 dark:text-white px-2 py-1" placeholder="手动节点">
              </div>
              <div class="flex items-center justify-between">
                <div><p class="text-sm font-medium text-gray-700 dark:text-gray-300">机场订阅前缀</p></div>
                <label class="toggle-switch"><input type="checkbox" v-model="prefixConfig.enableSubscriptions"><span class="slider"></span></label>
              </div>
              <div class="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-600">
                <div><p class="text-sm font-medium text-gray-700 dark:text-gray-300">节点国旗 Emoji</p></div>
                <label class="toggle-switch"><input type="checkbox" v-model="prefixConfig.enableNodeEmoji"><span class="slider"></span></label>
              </div>
          </div>
      </div>
    </div>

    <!-- Transforms -->
    <div>
       <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">节点转换管道</label>
       <div class="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
           <NodeTransformSettings :model-value="nodeTransform" @update:model-value="val => emit('update:nodeTransform', val)" />
       </div>
    </div>

    <!-- Labs -->
    <div>
        <div class="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
            <div>
               <p class="text-sm font-medium text-gray-700 dark:text-gray-300">显示流量统计节点</p>
               <p class="text-xs text-gray-500 dark:text-gray-400">虚拟节点显示剩余流量</p>
            </div>
            <label class="toggle-switch"><input type="checkbox" v-model="settings.enableTrafficNode"><span class="slider"></span></label>
        </div>
    </div>
  </div>
</template>

<style scoped>
/* Toggle Switch CSS - Reused */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.slider {
  position: absolute;
  cursor: pointer;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: #ccc;
  transition: .4s;
  border-radius: 34px;
}
.dark .slider { background-color: #4b5563; }
.slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}
input:checked + .slider { background-color: #4f46e5; }
.dark input:checked + .slider { background-color: #16a34a; }
input:checked + .slider:before { transform: translateX(20px); }
</style>
