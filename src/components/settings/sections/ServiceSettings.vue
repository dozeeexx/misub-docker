<script setup>
import SubConverterCard from './ServiceSettings/SubConverterCard.vue';
import TelegramCard from './ServiceSettings/TelegramCard.vue';

defineProps({
  settings: {
    type: Object,
    required: true
  }
});
</script>

<template>
  <div class="space-y-6">
    <SubConverterCard :settings="settings" />
    <TelegramCard :settings="settings" />
  </div>
</template>
