import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './assets/main.css'
import App from './App.vue'

// PWA Service Worker 注册
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      console.log('SW registered: ', registration);
      
      // 监听 Service Worker 更新
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // 通知应用有新版本可用
              newWorker.postMessage({ type: 'SW_UPDATE_AVAILABLE' });
            }
          });
        }
      });
      
    } catch (error) {
      console.log('SW registration failed: ', error);
    }
  });
}

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.mount('#app')
