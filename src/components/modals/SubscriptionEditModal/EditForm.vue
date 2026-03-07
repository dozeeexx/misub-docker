<script setup>
const props = defineProps({
  editingSubscription: {
    type: Object,
    required: true
  }
});
import Input from '../../ui/Input.vue';
import { ref, watch } from 'vue';

// 使用独立的本地状态，防止用户清空输入框时开关自动跳回关闭状态
const useFetchProxy = ref(false);

// 当弹窗传入新订阅信息时，初始化开关状态
watch(() => props.editingSubscription, (newSub) => {
  if (newSub) {
    useFetchProxy.value = !!newSub.fetchProxy;
  }
}, { immediate: true });

// 当用户主动关闭开关时，清理绑定的代理地址
watch(useFetchProxy, (val) => {
  if (!val && props.editingSubscription) {
    props.editingSubscription.fetchProxy = '';
  }
});
</script>

<template>
  <!-- 订阅名称 -->
  <div>
    <Input 
      id="sub-edit-name" 
      v-model="editingSubscription.name" 
      label="订阅名称"
      placeholder="（可选）不填将自动获取"
    />
  </div>

  <!-- 订阅链接 -->
  <div>
    <Input 
      id="sub-edit-url" 
      v-model="editingSubscription.url" 
      label="订阅链接"
      placeholder="https://..."
      class="font-mono"
    />
  </div>

  <!-- 专属拉取代理 -->
  <div class="pt-2 border-t border-gray-100 dark:border-gray-700">
    <div class="flex items-center justify-between mb-2">
      <div>
         <span class="text-sm font-medium text-gray-700 dark:text-gray-200">使用专属拉取代理 (Fetch Proxy)</span>
         <p class="text-xs text-gray-500 mt-0.5">当该机场封锁了 CF IP 时开启</p>
      </div>
      <label class="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" v-model="useFetchProxy" class="sr-only peer">
        <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-500"></div>
      </label>
    </div>

    <!-- 代理输入框 (动画展开) -->
    <div v-if="useFetchProxy" class="mt-3 space-y-2 animate-fade-in">
      <Input
        id="sub-edit-proxy" 
        v-model="editingSubscription.fetchProxy"
        placeholder="例如: https://my-proxy.vercel.app/api?url="
        class="font-mono text-sm"
      />
      <p class="text-[11px] text-indigo-600 dark:text-indigo-400">
        所有针对此订阅拉取的链接都会拼接在此前缀之后。
      </p>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.2s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-3px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
