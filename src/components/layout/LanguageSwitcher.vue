<script setup>
import { computed } from 'vue';
import { useI18n } from '../../i18n/index.js';

const { locale, supportedLocales, setLocale, t, currentLocaleLabel } = useI18n();

const selectLabel = computed(() => t('app.language'));

function handleChange(event) {
  setLocale(event.target.value);
}
</script>

<template>
  <label class="inline-flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300" :title="selectLabel">
    <span class="sr-only">{{ selectLabel }}</span>
    <select
      class="h-9 rounded-full border border-gray-200/80 bg-white/80 px-2.5 text-xs font-medium text-gray-700 shadow-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-200"
      :aria-label="selectLabel"
      :value="locale"
      @change="handleChange"
    >
      <option v-for="item in supportedLocales" :key="item.code" :value="item.code">
        {{ item.label }}
      </option>
    </select>
    <span class="sr-only">{{ currentLocaleLabel }}</span>
  </label>
</template>
