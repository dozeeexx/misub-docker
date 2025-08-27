
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useThemeStore = defineStore('theme', () => {
  const theme = ref('light');

  function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      theme.value = savedTheme;
    } else {
      // 如果没有保存的主题，检查系统偏好
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      theme.value = prefersDark ? 'dark' : 'light';
    }
    updateThemeClass();
  }

  function toggleTheme() {
    theme.value = theme.value === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', theme.value);
    updateThemeClass();
  }

  function updateThemeClass() {
    if (theme.value === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // 动态更新状态栏主题颜色
    updateStatusBarTheme();
  }
  
  function updateStatusBarTheme() {
    // 更新主题颜色的 meta 标签
    const themeColorMeta = document.querySelector('meta[name="theme-color"]:not([media])');
    if (themeColorMeta) {
      if (theme.value === 'dark') {
        themeColorMeta.setAttribute('content', '#0f172a'); // 深色模式背景色
      } else {
        themeColorMeta.setAttribute('content', '#f8fafc'); // 浅色模式背景色
      }
    }
    
    // 更新 iOS 状态栏样式
    const statusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (statusBarMeta) {
      if (theme.value === 'dark') {
        statusBarMeta.setAttribute('content', 'black-translucent'); // 深色模式：黑色半透明
      } else {
        statusBarMeta.setAttribute('content', 'default'); // 浅色模式：黑色文字
      }
    }
  }

  return { theme, initTheme, toggleTheme };
});
