<script setup>
const props = defineProps({
  editingSubscription: {
    type: Object,
    required: true
  }
});
import Input from '../../ui/Input.vue';
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
</template>
