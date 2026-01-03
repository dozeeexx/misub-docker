<script setup>
import ProfileCard from './ProfileCard.vue';

const props = defineProps({
  profiles: {
    type: Array,
    default: () => []
  },
  isQrExpanded: {
    type: Function,
    required: true
  }
});

const emit = defineEmits([
  'quick-import',
  'toggle-qr',
  'preview',
  'copy-link',
  'download-qr',
  'register-canvas'
]);
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
    <ProfileCard
      v-for="profile in profiles"
      :key="profile.id"
      :profile="profile"
      :is-qr-expanded="isQrExpanded(profile.id)"
      @quick-import="emit('quick-import', profile)"
      @toggle-qr="emit('toggle-qr', profile)"
      @preview="emit('preview', profile)"
      @copy-link="emit('copy-link', profile)"
      @download-qr="emit('download-qr', profile)"
      @register-canvas="(id, el) => emit('register-canvas', id, el)"
    />
  </div>
</template>
