<script setup>
import { computed } from 'vue';

const props = defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: (value) => ['primary', 'secondary', 'danger', 'ghost'].includes(value)
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg'].includes(value)
  },
  loading: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  icon: {
    type: String,
    default: null
  }
});

const emit = defineEmits(['click']);

const variantClasses = computed(() => {
  const variants = {
    primary: 'bg-primary-600 hover:bg-primary-500 text-white shadow-md shadow-primary-500/20 border border-white/20',
    secondary: 'glass text-gray-800 dark:text-white hover:bg-white/50 dark:hover:bg-white/10 border border-white/30 dark:border-white/10',
    danger: 'bg-red-500/90 hover:bg-red-500 text-white shadow-lg shadow-red-500/20 border border-white/20',
    ghost: 'hover:bg-white/20 dark:hover:bg-white/5 text-gray-600 dark:text-gray-300'
  };
  return variants[props.variant];
});

const sizeClasses = computed(() => {
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-8 py-3.5 text-base'
  };
  return sizes[props.size];
});

const handleClick = (event) => {
  if (!props.disabled && !props.loading) {
    emit('click', event);
  }
};
</script>

<template>
  <button
    @click="handleClick"
    :disabled="disabled || loading"
    class="relative inline-flex items-center justify-center gap-2 font-semibold smooth-all rounded-xl tap-effect disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group tracking-wide transition-all duration-300"
    :class="[
      variantClasses,
      sizeClasses
    ]"
  >
    <!-- 🌌 Cosmic Liquid Effect for Primary -->
    <div 
      v-if="variant === 'primary' && !disabled"
      class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
    >
      <div class="absolute inset-0 bg-gradient-to-r from-cyan-400/20 via-purple-500/20 to-indigo-500/20 mix-blend-overlay"></div>
      <div class="absolute -top-[100%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-b from-transparent via-white/20 to-transparent rotate-45 animate-shimmer"></div>
    </div>

    <!-- Inner Highlight -->
    <div class="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/20 pointer-events-none"></div>

    <!-- Loading State -->
    <svg 
      v-if="loading" 
      class="w-4 h-4 animate-spin relative z-10" 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    
    <!-- Icon -->
    <svg 
      v-else-if="icon" 
      class="w-4 h-4 relative z-10 transition-transform group-hover:scale-110" 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" :d="icon" />
    </svg>
    
    <!-- Content -->
    <span class="relative z-10">
      <slot />
    </span>
  </button>
</template>

<style scoped>
@keyframes shimmer {
  0% { transform: translateY(-100%) translateX(0%); }
  100% { transform: translateY(100%) translateX(0%); }
}

.animate-shimmer {
  animation: shimmer 2s infinite ease-in-out;
}
</style>