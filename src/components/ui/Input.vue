<script setup>
import { computed } from 'vue';

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  label: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: 'text'
  },
  error: {
    type: String,
    default: ''
  },
  icon: {
    type: String,
    default: null
  },
  disabled: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue']);

const updateValue = (event) => {
  emit('update:modelValue', event.target.value);
};
</script>

<template>
  <div class="w-full">
    <label v-if="label" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">
      {{ label }}
    </label>
    <div class="relative group">
      <!-- Icon Wrapper -->
      <div v-if="icon" class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary-500 transition-colors">
        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
           <!-- Dynamic Icon Rendering could be here, or use slot -->
           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="icon" />
        </svg>
      </div>

      <input
        :value="modelValue"
        @input="updateValue"
        :type="type"
        :placeholder="placeholder"
        :disabled="disabled"
        class="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl py-3 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 dark:focus:border-primary-500 focus:outline-none transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        :class="[
            icon ? 'pl-10 pr-4' : 'px-4',
            error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : ''
        ]"
      />
      
      <!-- Focus Glow -->
      <div class="absolute inset-0 rounded-xl pointer-events-none transition-opacity duration-300 opacity-0 group-focus-within:opacity-100 ring-1 ring-primary-500/20"></div>
    </div>
    
    <p v-if="error" class="mt-1 text-xs text-red-500 ml-1">
      {{ error }}
    </p>
  </div>
</template>
