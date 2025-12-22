
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { fetchInitialData, login as apiLogin } from '../lib/api';
import { useDataStore } from './useDataStore';

export const useSessionStore = defineStore('session', () => {
  const sessionState = ref('loading'); // loading, loggedIn, loggedOut
  const initialData = ref(null);

  async function checkSession() {
    try {
      const data = await fetchInitialData();
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
      sessionState.value = 'loggedOut';
    }
  }

  async function login(password) {
    try {
      const response = await apiLogin(password);
      if (response.ok) {
        handleLoginSuccess();
      } else {
        const errData = await response.json();
        throw new Error(errData.error || '登录失败');
      }
    } catch(e) {
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
  }

  return { sessionState, initialData, checkSession, login, logout };
});
