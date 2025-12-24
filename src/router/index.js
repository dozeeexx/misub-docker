import { createRouter, createWebHistory } from 'vue-router';

// Lazy load views for better performance
const DashboardView = () => import('../views/DashboardView.vue');
const SubscriptionGroupsView = () => import('../views/SubscriptionGroupsView.vue');
const ManualNodesView = () => import('../views/ManualNodesView.vue');
const MySubscriptionsView = () => import('../views/MySubscriptionsView.vue');
const SettingsView = () => import('../views/SettingsView.vue');

const routes = [
    {
        path: '/',
        name: 'Dashboard',
        component: DashboardView,
        meta: { title: '仪表盘' }
    },
    {
        path: '/groups',
        name: 'SubscriptionGroups',
        component: SubscriptionGroupsView,
        meta: { title: '订阅组' }
    },
    {
        path: '/nodes',
        name: 'ManualNodes',
        component: ManualNodesView,
        meta: { title: '手工节点' }
    },
    {
        path: '/subscriptions',
        name: 'MySubscriptions',
        component: MySubscriptionsView,
        meta: { title: '我的订阅' }
    },
    {
        path: '/settings',
        name: 'Settings',
        component: SettingsView,
        meta: { title: '设置' }
    }
];

const router = createRouter({
    history: createWebHistory(),
    routes,
    scrollBehavior(to, from, savedPosition) {
        if (savedPosition) {
            return savedPosition;
        } else {
            return { top: 0 };
        }
    }
});

router.beforeEach((to, from, next) => {
    document.title = to.meta.title ? `${to.meta.title} - MISUB` : 'MISUB';
    next();
});

export default router;
