<script setup>
import { defineAsyncComponent, onMounted, watch } from 'vue';
import { useThemeStore } from './stores/theme';
import { useSessionStore } from './stores/session';
import { useToastStore } from './stores/toast';
import { useDataStore } from './stores/useDataStore';
import { useUIStore } from './stores/ui';
import { storeToRefs } from 'pinia';
import NavBar from './components/layout/NavBar.vue';

// Lazy components
const Login = defineAsyncComponent(() => import('./components/modals/Login.vue'));
const Toast = defineAsyncComponent(() => import('./components/ui/Toast.vue'));
const Footer = defineAsyncComponent(() => import('./components/layout/Footer.vue'));
const PWAUpdatePrompt = defineAsyncComponent(() => import('./components/features/PWAUpdatePrompt.vue'));
const PWADevTools = defineAsyncComponent(() => import('./components/features/PWADevTools.vue'));
const Dashboard = defineAsyncComponent(() => import('./components/features/Dashboard/Dashboard.vue'));
const Header = defineAsyncComponent(() => import('./components/layout/Header.vue'));

const themeStore = useThemeStore();
const { theme } = storeToRefs(themeStore);
const { initTheme } = themeStore;

const sessionStore = useSessionStore();
const { sessionState } = storeToRefs(sessionStore);
const { checkSession, login, logout } = sessionStore;

const toastStore = useToastStore();
const { toast: toastState } = storeToRefs(toastStore);

const dataStore = useDataStore();
const { isDirty, saveState } = storeToRefs(dataStore);

const uiStore = useUIStore();
const { layoutMode } = storeToRefs(uiStore);

onMounted(async () => {


  initTheme();
  await checkSession();
  
  if (sessionState.value === 'loggedIn') {
      await dataStore.fetchData();
  }
});

watch(sessionState, async (newVal) => {
    if (newVal === 'loggedIn') {
        await dataStore.fetchData();
    }
});

const handleSave = async () => {
   await dataStore.saveData();
};
const handleDiscard = async () => {
   await dataStore.fetchData(true);
   toastStore.showToast('已放弃所有未保存的更改');
};

</script>

<template>
  <div 
    :class="theme" 
    class="min-h-screen flex flex-col text-gray-800 dark:text-gray-200 transition-colors duration-300 bg-gray-100 dark:bg-gray-950"
  >
    <NavBar v-if="layoutMode === 'modern'" :is-logged-in="sessionState === 'loggedIn'" @logout="logout" />
    <Header v-else :is-logged-in="sessionState === 'loggedIn'" @logout="logout" />

    <main 
      class="grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"
      :class="{
        'flex items-center justify-center': sessionState !== 'loggedIn' && sessionState !== 'loading',
      }"
    >
      <div v-if="sessionState === 'loading'" class="flex justify-center p-8">Loading...</div>
      
      <template v-else-if="sessionState === 'loggedIn'">
          <Transition name="slide-fade">
            <div v-if="layoutMode === 'modern' && (isDirty || saveState === 'success')" 
                class="sticky top-20 z-40 mb-6 p-4 rounded-lg shadow-lg flex items-center justify-between transition-all duration-300 backdrop-blur-md"
                :class="saveState === 'success' ? 'bg-teal-500/10 ring-1 ring-teal-500/20' : 'bg-white/80 dark:bg-gray-800/80 ring-1 ring-indigo-500/30'">
                <p class="text-sm font-medium" 
                :class="saveState === 'success' ? 'text-teal-700 dark:text-teal-300' : 'text-indigo-700 dark:text-indigo-300'">
                {{ saveState === 'success' ? '保存成功' : '您有未保存的更改' }}
                </p>
                <div class="flex items-center gap-3">
                    <button v-if="saveState !== 'success'" @click="handleDiscard" class="text-sm text-gray-600 dark:text-gray-400 hover:underline">放弃</button>
                    <button @click="handleSave" :disabled="saveState !== 'idle'" class="px-4 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-sm transition-colors disabled:opacity-50">
                        {{ saveState === 'saving' ? '保存中...' : (saveState === 'success' ? '已保存' : '保存更改') }}
                    </button>
                </div>
            </div>
          </Transition>

          <router-view v-if="layoutMode === 'modern'" v-slot="{ Component }">
            <transition name="fade" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>

          <Dashboard v-else />
      </template>
      
      <Login v-else :login="login" />

    </main>
    
    <Toast :show="toastState.id" :message="toastState.message" :type="toastState.type" />
    <PWAUpdatePrompt />
    <PWADevTools />
    <Footer />
  </div>
</template>

<style>
:root {
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
}
.ios-content-offset {
    padding-top: calc(var(--safe-top));
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.slide-fade-enter-active, .slide-fade-leave-active { transition: all 0.3s ease; }
.slide-fade-enter-from, .slide-fade-leave-to { transform: translateY(-10px); opacity: 0; }
</style>
