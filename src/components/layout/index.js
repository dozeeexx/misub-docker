/**
 * 布局组件模块
 * @author MiSub Team
 */

// 导出所有布局组件
export { default as Header } from './Header.vue';
export { default as Footer } from './Footer.vue';
export { default as AdaptiveGrid } from './AdaptiveGrid.vue';
export { default as DashboardSkeleton } from './DashboardSkeleton.vue';
export { default as MobileBottomNav } from './MobileBottomNav.vue';

// 组件列表
export const LayoutComponents = {
  Header,
  Footer,
  AdaptiveGrid,
  DashboardSkeleton,
  MobileBottomNav
};

// 默认导出
export default LayoutComponents;