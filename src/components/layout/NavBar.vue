<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useThemeStore } from '../../stores/theme.js';
import { useUIStore } from '../../stores/ui.js';
import ThemeToggle from '../features/ThemeToggle.vue';
import PWAInstallPrompt from '../features/PWAInstallPrompt.vue';

const route = useRoute();
const { theme, toggleTheme } = useThemeStore();
const uiStore = useUIStore();

const props = defineProps({
  isLoggedIn: Boolean
});

const emit = defineEmits(['logout']);

const navItems = [
  { name: '仪表盘', path: '/', icon: 'squares-2x2' },
  { name: '机场订阅', path: '/groups', icon: 'rectangle-stack' },
  { name: '手工节点', path: '/nodes', icon: 'cpu-chip' },
  { name: '我的订阅', path: '/subscriptions', icon: 'cloud-arrow-down' },
  { name: '设置', path: '/settings', icon: 'cog-6-tooth' },
];
</script>

<template>
  <header class="bg-gradient-to-b from-white/95 via-white/90 to-white/95 dark:from-gray-950/95 dark:via-gray-950/90 dark:to-gray-950/95 backdrop-blur-xl sticky top-0 z-50 border-b border-gray-200/30 dark:border-white/5 supports-[backdrop-filter]:bg-white/80 supports-[backdrop-filter]:dark:bg-gray-950/80 transition-all duration-300">
    <!-- iOS状态栏背景遮罩层 -->
    <div class="ios-status-bar-overlay"></div>
    
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="pt-safe-top">
        <div class="flex justify-between items-center h-16 md:h-20">
          <!-- Logo -->
          <div class="flex items-center shrink-0">
            <svg width="32" height="32" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" class="text-indigo-600 dark:text-indigo-400">
              <path fill="currentColor" d="M64 128a64 64 0 1 1 64-64a64.07 64.07 0 0 1-64 64Zm0-122a58 58 0 1 0 58 58A58.07 58.07 0 0 0 64 6Z"/>
              <path fill="currentColor" d="M64 100a36 36 0 1 1 36-36a36 36 0 0 1-36 36Zm0-66a30 30 0 1 0 30 30a30 30 0 0 0-30-30Z"/>
              <path fill="currentColor" d="M64 78a14 14 0 1 1 14-14a14 14 0 0 1-14 14Zm0-22a8 8 0 1 0 8 8a8 8 0 0 0-8-8Z"/>
            </svg>
            <span class="ml-3 text-xl font-bold text-gray-800 dark:text-white hidden md:block">MISUB</span>
          </div>
          
          <!-- Navigation - Center (Desktop) -->
          <nav v-if="isLoggedIn" class="hidden md:flex items-center space-x-1 lg:space-x-2 overflow-x-auto no-scrollbar mx-4">
            <router-link 
              v-for="item in navItems" 
              :key="item.path" 
              :to="item.path"
              class="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center whitespace-nowrap"
              :class="route.path === item.path ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300 ring-1 ring-indigo-200 dark:ring-indigo-500/20' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'"
            >
              <span>{{ item.name }}</span>
            </router-link>
          </nav>

          <!-- Right Actions -->
          <div class="flex items-center space-x-2 sm:space-x-3 shrink-0">
            <template v-if="isLoggedIn">
               <PWAInstallPrompt />
               <ThemeToggle :theme="theme" @toggle="toggleTheme" />
               <button @click="uiStore.toggleLayout()" class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white smooth-all hover:scale-110 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" title="切换经典布局">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                     <path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                  </svg>
               </button>
               <button @click="emit('logout')" class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white smooth-all hover:scale-110 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" title="登出">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
               </button>
            </template>
          </div>
        </div>
      </div>
      
      <!-- Mobile Navigation (Horizontal Scroll) -->
      <div v-if="isLoggedIn" class="md:hidden border-t border-gray-100 dark:border-gray-800 overflow-x-auto no-scrollbar pt-safe-top">
         <div class="flex items-center p-2 space-x-2 min-w-max">
            <router-link 
              v-for="item in navItems" 
              :key="item.path" 
              :to="item.path"
              class="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex flex-col items-center justify-center min-w-[70px]"
              :class="route.path === item.path ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10' : 'text-gray-500 dark:text-gray-400'"
            >
              <span class="text-xs mt-1">{{ item.name }}</span>
            </router-link>
         </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.pt-safe-top {
  padding-top: env(safe-area-inset-top, 0px);
}
.ios-status-bar-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: calc(env(safe-area-inset-top, 0px) + 2px);
  background: inherit;
  z-index: 10;
  pointer-events: none;
}
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
