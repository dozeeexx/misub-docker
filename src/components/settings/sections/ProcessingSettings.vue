<script setup>
const props = defineProps({
  settings: {
    type: Object,
    required: true
  }
});
</script>

<template>
  <div class="space-y-6">
    <h3 class="text-lg font-medium text-gray-900 dark:text-white border-b pb-2 dark:border-gray-700">节点处理配置</h3>
    
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
