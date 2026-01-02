
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { fetchInitialData, login as apiLogin, fetchPublicConfig } from '../lib/api';
import { useDataStore } from './useDataStore';
import router from '../router';

export const useSessionStore = defineStore('session', () => {
  const sessionState = ref('loading'); // loading, loggedIn, loggedOut
  const initialData = ref(null);
  const publicConfig = ref({ enablePublicPage: true }); // Default true until fetched

  async function checkSession() {
    try {
      // Parallel fetch of initial data (auth check) and public config
      // Note: fetchInitialData throws if unauthorized, fetchPublicConfig does not.
      const [data, pConfig] = await Promise.all([
        fetchInitialData().catch(e => {
          if (e.message === 'UNAUTHORIZED') return null;
          throw e;
        }),
        fetchInitialData.name ? fetchPublicConfig() : Promise.resolve({}) // Ensure api function is available
      ]);

      // Update public config
      if (pConfig) {
        publicConfig.value = pConfig;
      }

      if (data) {
        initialData.value = data;

        // 直接注入数据到 dataStore，避免 Dashboard 重复请求
        const dataStore = useDataStore();
        dataStore.hydrateFromData(data);

        sessionState.value = 'loggedIn';
      } else {
        sessionState.value = 'loggedOut';
      }
    } catch (error) {
      console.error("Session check failed:", error);
      // Attempt to fetch public config separately if main data fetch failed critically
      try {
        const pConfig = await fetchPublicConfig();
        if (pConfig) publicConfig.value = pConfig;
      } catch (ignore) { }

      sessionState.value = 'loggedOut';
    }
  }

  async function login(password) {
    try {
      const response = await apiLogin(password);
      if (response.ok) {
        handleLoginSuccess();
        // 登录成功后跳转到首页 (HomeView will show Dashboard)
        router.push({ path: '/' });
      } else {
        const errData = await response.json();
        throw new Error(errData.error || '登录失败');
      }
    } catch (e) {
      throw e;
    }
  }

  function handleLoginSuccess() {
    sessionState.value = 'loading';
    checkSession();
  }

  async function logout() {
    await fetch('/api/logout');
    sessionState.value = 'loggedOut';
    initialData.value = null;

    // 清除缓存数据
    const dataStore = useDataStore();
    dataStore.clearCachedData();

    // 跳转到首页（由于状态已变更为loggedOut，HomeView会自动渲染PublicProfilesView）
    router.push({ path: '/' });
  }

  return { sessionState, initialData, publicConfig, checkSession, login, logout };
});
