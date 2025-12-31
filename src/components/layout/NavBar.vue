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
            <span class="ml-3 text-xl font-bold text-gray-800 dark:text-white">MISUB</span>
          </div>
          
          <!-- Navigation - Center (Desktop) -->
          <div class="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <nav v-if="isLoggedIn" class="flex items-center p-1.5 bg-gray-100/80 dark:bg-gray-800/80 rounded-full border border-gray-200/50 dark:border-white/10 backdrop-blur-md shadow-sm">
              <router-link 
                v-for="item in navItems" 
                :key="item.path" 
                :to="item.path"
                class="px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 relative whitespace-nowrap"
                :class="[
                  route.path === item.path 
                    ? 'bg-gray-900 text-white shadow-md dark:bg-gray-100 dark:text-gray-900' 
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-white/60 dark:hover:bg-white/10'
                ]"
              >
                <span>{{ item.name }}</span>
              </router-link>
            </nav>
          </div>

          <!-- Right Actions -->
          <div class="flex items-center space-x-2 sm:space-x-3 shrink-0">
             <ThemeToggle :theme="theme" @toggle="toggleTheme" />
             
             <template v-if="isLoggedIn">
               <PWAInstallPrompt />
               <button @click="uiStore.toggleLayout()" class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white smooth-all hover:scale-110 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" title="切换经典布局">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                     <path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                  </svg>
               </button>
               <button @click="emit('logout')" class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white smooth-all hover:scale-110 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" title="登出">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
               </button>
            </template>
            
            <template v-else>
                 <a href="https://github.com/imzyb/MiSub" target="_blank" class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white smooth-all hover:scale-110 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" title="GitHub">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                 </a>
                 <router-link to="/login" class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 rounded-lg transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                    登录
                 </router-link>
            </template>
          </div>
        </div>
      </div>
      
      
    </div>
  </header>

      <!-- Mobile Navigation (Bottom Fixed for Modern Feel) -->
      <nav v-if="isLoggedIn" class="md:hidden fixed bottom-0 left-0 right-0 z-50">
          <div class="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-t border-gray-200/50 dark:border-white/10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] pb-safe-bottom">
              <div class="flex justify-around items-center h-16">
                <router-link 
                  v-for="item in navItems" 
                  :key="item.path" 
                  :to="item.path"
                  class="flex flex-col items-center justify-center w-full h-full transition-all duration-200"
                  :class="route.path === item.path ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'"
                >
                  <svg v-if="item.name === '仪表盘'" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 transition-transform duration-200" :class="route.path === item.path ? 'scale-110' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                  <svg v-else-if="item.name === '机场订阅'" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 transition-transform duration-200" :class="route.path === item.path ? 'scale-110' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                  <svg v-else-if="item.name === '手工节点'" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 transition-transform duration-200" :class="route.path === item.path ? 'scale-110' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>
                  <svg v-else-if="item.name === '我的订阅'" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 transition-transform duration-200" :class="route.path === item.path ? 'scale-110' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" /></svg>
                  <svg v-else-if="item.name === '设置'" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 transition-transform duration-200" :class="route.path === item.path ? 'scale-110' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  
                  <span class="text-[10px] mt-1 font-medium">{{ item.name }}</span>
                </router-link>
              </div>
          </div>
      </nav>
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
.pb-safe-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
