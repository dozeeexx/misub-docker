import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './assets/main.css'
import App from './App.vue'
import router from './router'
import { handleError } from './utils/errorHandler.js'

// 全局错误处理
if (typeof window !== 'undefined') {
  // 处理未捕获的Promise拒绝
  window.addEventListener('unhandledrejection', (event) => {
    handleError(event.reason, 'Unhandled Promise Rejection', {
      type: 'promise_rejection'
    });
    event.preventDefault();
  });

  // 处理全局JavaScript错误
  window.addEventListener('error', (event) => {
    handleError(event.error || new Error(event.message), 'Global JavaScript Error', {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      tagName: event.target?.tagName
    });
  });

  // 处理资源加载错误
  window.addEventListener('error', (event) => {
    if (event.target !== window) {
      handleError(new Error(`Resource load failed: ${event.target.src || event.target.href}`), 'Resource Load Error', {
        tagName: event.target.tagName,
        src: event.target.src || event.target.href
      });
    }
  }, true);
}



const pinia = createPinia()
const app = createApp(App)

// 全局错误处理插件
app.config.errorHandler = (error, instance, info) => {
  handleError(error, 'Vue Component Error', {
    component: instance?.$options?.name || 'Unknown',
    info
  });

};

app.use(pinia)
app.use(router) // Use Router
app.mount('#app')
