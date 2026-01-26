<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useThemeStore } from '../../stores/theme.js';
import { useUIStore } from '../../stores/ui.js';
import ThemeToggle from '../features/ThemeToggle.vue';
import BaseIcon from '../ui/BaseIcon.vue';

const route = useRoute();
const { theme, toggleTheme } = useThemeStore();
const uiStore = useUIStore();

defineProps({
  isLoggedIn: Boolean
});

const emit = defineEmits(['logout']);

// Icon paths (Heroicons)
const ICONS = {
  dashboard: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
  groups: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
  nodes: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z',
  subscriptions: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10',
  settings: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  layout: 'M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12',
  logout: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1'
};

const navItems = [
  { name: '仪表盘', path: '/', iconPath: ICONS.dashboard },
  { name: '机场订阅', path: '/groups', iconPath: ICONS.groups },
  { name: '手工节点', path: '/nodes', iconPath: ICONS.nodes },
  { name: '我的订阅', path: '/subscriptions', iconPath: ICONS.subscriptions },
  { name: '设置', path: '/settings', iconPath: ICONS.settings },
];
</script>

<template>
  <!-- Mobile Top Header (Moved to top for Sticky behavior) -->
  <header class="md:hidden pointer-events-auto sticky top-0 z-50 flex items-center justify-between px-4 py-3 w-full bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/5 transition-all duration-300">
      <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
              <svg width="18" height="18" viewBox="0 0 128 128" fill="currentColor">
                  <path d="M64 128a64 64 0 1 1 64-64a64.07 64.07 0 0 1-64 64Zm0-122a58 58 0 1 0 58 58A58.07 58.07 0 0 0 64 6Z"/>
                  <path d="M64 100a36 36 0 1 1 36-36a36 36 0 0 1-36 36Zm0-66a30 30 0 1 0 30 30a30 30 0 0 0-30-30Z"/>
              </svg>
          </div>
          <span class="text-lg font-display font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
              MiSub
          </span>
      </div>
      
      <div class="flex items-center gap-2">
            <ThemeToggle :theme="theme" @toggle="toggleTheme" />
            <button 
              @click="uiStore.toggleLayout()" 
              class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400 transition-colors"
              aria-label="切换布局"
            >
              <BaseIcon :path="ICONS.layout" className="h-5 w-5" />
            </button>
            <button 
              @click="emit('logout')" 
              class="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-colors"
              aria-label="退出登录"
            >
              <BaseIcon :path="ICONS.logout" className="h-5 w-5" />
            </button>
      </div>
  </header>

  <div class="pointer-events-none sticky top-0 z-50 w-full flex justify-center pt-4 px-4">
    <!-- Desktop Floating Island -->
    <header class="pointer-events-auto hidden md:flex items-center gap-2 p-2 rounded-full glass-panel shadow-2xl shadow-primary-500/10 border-white/40 dark:border-white/10 transition-all duration-500 hover:shadow-primary-500/20 max-w-4xl w-full justify-between bg-white/70 dark:bg-gray-900/70 backdrop-blur-2xl">
      
      <!-- Logo Area -->
      <div class="flex items-center pl-4 pr-6 shrink-0 gap-2 border-r border-gray-200 dark:border-white/10">
        <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
           <svg width="20" height="20" viewBox="0 0 128 128" fill="currentColor">
              <path d="M64 128a64 64 0 1 1 64-64a64.07 64.07 0 0 1-64 64Zm0-122a58 58 0 1 0 58 58A58.07 58.07 0 0 0 64 6Z"/>
              <path d="M64 100a36 36 0 1 1 36-36a36 36 0 0 1-36 36Zm0-66a30 30 0 1 0 30 30a30 30 0 0 0-30-30Z"/>
           </svg>
        </div>
        <span class="text-lg font-display font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
          MiSub
        </span>
      </div>

      <!-- Navigation Links -->
      <nav class="flex items-center gap-1">
        <router-link 
          v-for="item in navItems" 
          :key="item.path" 
          :to="item.path"
          class="relative px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 group"
          :class="[
            route.path === item.path 
              ? 'text-white font-semibold' 
              : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-white/10'
          ]"
        >
          <!-- Active Background Pill -->
          <div v-if="route.path === item.path" class="absolute inset-0 bg-primary-600 rounded-full shadow-lg shadow-primary-500/30 -z-10 animate-spring-in"></div>
          
          <span class="relative z-10">{{ item.name }}</span>
        </router-link>
      </nav>

      <!-- Right Actions -->
      <div class="flex items-center pl-4 ml-2 gap-2 border-l border-gray-200 dark:border-white/10">
        <ThemeToggle :theme="theme" @toggle="toggleTheme" />
        
        <div class="h-4 w-px bg-gray-200 dark:bg-white/10 mx-1"></div>

        <button 
          @click="uiStore.toggleLayout()" 
          class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/50" 
          title="Switch Layout"
          aria-label="切换布局"
        >
           <BaseIcon :path="ICONS.layout" className="h-5 w-5" />
        </button>
        
        <button 
          @click="emit('logout')" 
          class="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-500 hover:text-red-500 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50" 
          title="Logout"
          aria-label="退出登录"
        >
           <BaseIcon :path="ICONS.logout" className="h-5 w-5" />
        </button>
      </div>

    </header>

    <!-- Mobile Bottom Navigation -->
    <nav v-if="isLoggedIn" class="md:hidden pointer-events-auto mobile-nav-glass fixed bottom-0 inset-x-0 pb-safe-bottom z-[60]">
        <div class="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
          <router-link 
            v-for="item in navItems" 
            :key="item.path" 
            :to="item.path"
            class="flex flex-col items-center justify-center w-full h-full gap-1 rounded-xl transition-all duration-300 tap-effect"
            :class="route.path === item.path ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'"
          >
            <!-- Icons -->
            <div class="relative">
                <BaseIcon 
                  :path="item.iconPath" 
                  className="w-6 h-6 transition-transform duration-300"
                  :class="route.path === item.path ? 'scale-110' : ''"
                />
            </div>
            
            <span class="text-[10px] font-medium tracking-tight">{{ item.name }}</span>
          </router-link>
        </div>
    </nav>
  </div>
</template>

<style scoped>
@keyframes spring-in {
  0% { transform: scale(0.9); opacity: 0; }
  60% { transform: scale(1.05); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
.animate-spring-in {
  animation: spring-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

.pt-safe-top {
  padding-top: env(safe-area-inset-top, 20px);
}
.pb-safe-bottom {
  padding-bottom: env(safe-area-inset-bottom, 20px);
}
</style>
