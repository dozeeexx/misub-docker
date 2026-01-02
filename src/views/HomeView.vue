<script setup>
import { defineAsyncComponent, computed } from 'vue';
import { useSessionStore } from '../stores/session';
import { storeToRefs } from 'pinia';

// Lazy load components
const DashboardView = defineAsyncComponent(() => import('./DashboardView.vue'));
const PublicProfilesView = defineAsyncComponent(() => import('./PublicProfilesView.vue'));

const sessionStore = useSessionStore();
const { sessionState, publicConfig } = storeToRefs(sessionStore);
import { useRouter } from 'vue-router';

const router = useRouter();

const currentView = computed(() => {
    // If logged using 'loggedIn' state, show Dashboard
    if (sessionState.value === 'loggedIn') {
        return DashboardView;
    }
    
    // If public page is disabled, redirect to login
    // Note: We should wait for sessionState to be determined (not loading)
    if (sessionState.value === 'loggedOut' && publicConfig.value && !publicConfig.value.enablePublicPage) {
        // Use a side effect or just render Login component?
        // Rendering Login component directly here is cleaner than router.push inside computed
        // But we have a route for /login. Let's redirect.
        // Actually, redirecting inside computed is bad practice.
        // However, we are in a top-level view wrapper.
        // Let's return a "redirect" placeholder or handle it in watchEffect.
        return null;
    }
    
    // Otherwise show Public Profiles
    return PublicProfilesView;
});

import { watchEffect } from 'vue';

watchEffect(() => {
    if (sessionState.value === 'loggedOut' && publicConfig.value && !publicConfig.value.enablePublicPage) {
        router.replace('/login');
    }
});
</script>

<template>
    <component :is="currentView" />
</template>
