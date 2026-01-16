<script setup>
import { defineAsyncComponent, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router'; // [NEW]
import { useThemeStore } from './stores/theme';
import { useSessionStore } from './stores/session';
import { useToastStore } from './stores/toast';
import { useDataStore } from './stores/useDataStore';
import { useUIStore } from './stores/ui';
import { storeToRefs } from 'pinia';
import NavBar from './components/layout/NavBar.vue';

// Lazy components
const Login = defineAsyncComponent(() => import('./components/modals/Login.vue'));
const NotFound = defineAsyncComponent(() => import('./views/NotFound.vue')); // [NEW] Use for secure fallback
const Toast = defineAsyncComponent(() => import('./components/ui/Toast.vue'));
const Footer = defineAsyncComponent(() => import('./components/layout/Footer.vue'));
const PWAUpdatePrompt = defineAsyncComponent(() => import('./components/features/PWAUpdatePrompt.vue'));
const PWADevTools = defineAsyncComponent(() => import('./components/features/PWADevTools.vue'));
const Dashboard = defineAsyncComponent(() => import('./components/features/Dashboard/Dashboard.vue'));
const Header = defineAsyncComponent(() => import('./components/layout/Header.vue'));

const route = useRoute(); // [NEW]
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
    <!-- Show NavBar if logged in and modern mode OR if public route and modern mode -->
    <!-- Show NavBar ONLY if logged in and modern mode -->
    <NavBar 
      v-if="sessionState === 'loggedIn' && layoutMode === 'modern'" 
      :is-logged-in="true" 
      @logout="logout" 
    />
    <!-- Show Header otherwise (Logged in & legacy mode OR Not logged in & public route) -->
    <Header 
      v-else-if="sessionState === 'loggedIn' || route.meta.isPublic" 
      :is-logged-in="sessionState === 'loggedIn'" 
      @logout="logout" 
    />
    
    <!-- IF NOT LOGGED IN, BUT PUBLIC ROUTE (like /explore or /): SHOW HEADER (optional) or just nothing? 
         The PublicProfilesView has its own header design usually. 
         Let's keep it clean. If public route, we might not want the main app header if the view handles it.
         But wait, PublicProfilesView doesn't have a navigation header in the code I saw, just a hero.
         We might want a simple header or none. The user requested "adding a login button to the top right".
         So PublicProfilesView will handle its own top bar.
    -->

    <main 
      class="grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"
      :class="{
        'flex items-center justify-center': sessionState !== 'loggedIn' && sessionState !== 'loading' && !route.meta.isPublic,
      }"
    >
      <div v-if="sessionState === 'loading'" class="flex justify-center p-8">Loading...</div>
      
      <!-- LOGGED IN VIEW -->
      <template v-else-if="sessionState === 'loggedIn'">
          <Transition name="slide-fade">
            <div v-if="layoutMode === 'modern' && (isDirty || saveState === 'success')" 
                class="fixed bottom-24 md:bottom-auto md:top-24 left-1/2 -translate-x-1/2 z-40 p-1.5 pr-2 rounded-full shadow-2xl flex items-center gap-3 transition-all duration-300 backdrop-blur-xl border border-white/20 dark:border-white/10"
                :class="saveState === 'success' ? 'bg-teal-500/20 text-teal-600 dark:text-teal-300 shadow-teal-500/10' : 'bg-white/80 dark:bg-gray-900/80 shadow-black/10'">
                
                <div class="pl-2 pr-1 flex items-center gap-2">
                    <span v-if="saveState === 'success'" class="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
                    <span v-else class="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                    <p class="text-xs font-semibold whitespace-nowrap">
                        {{ saveState === 'success' ? '已保存更改' : '未保存更改' }}
                    </p>
                </div>

                <div class="flex items-center gap-1">
                    <button v-if="saveState !== 'success'" @click="handleDiscard" class="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-white/10">
                        放弃
                    </button>
                    <button @click="handleSave" :disabled="saveState !== 'idle'" class="px-4 py-1.5 text-xs font-bold bg-primary-600 hover:bg-primary-500 text-white rounded-full shadow-lg shadow-primary-500/30 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none">
                        {{ saveState === 'saving' ? '保存中...' : (saveState === 'success' ? '完成' : '立即保存') }}
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

      <!-- PUBLIC ROUTE VIEW (Not logged in, but isPublic) -->
      <template v-else-if="route.meta.isPublic">
         <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
      </template>
      
      <!-- LOGIN VIEW (Not logged in, not public) -->
      <template v-else>
         <!-- 
           If a Custom Login Path is configured, accessing protected routes directly (like /settings, /nodes)
           should NOT trigger the Login component (which reveals the login box).
           Instead, it should show 404/Disguise.
           Only if NO custom path is set, do we fallback to the default Login component.
         -->
         <component 
            :is="sessionStore.publicConfig?.customLoginPath ? NotFound : Login" 
            :login="login" 
         />
      </template>

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
