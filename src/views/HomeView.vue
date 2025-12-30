<script setup>
import { defineAsyncComponent, computed } from 'vue';
import { useSessionStore } from '../stores/session';
import { storeToRefs } from 'pinia';

// Lazy load components
const DashboardView = defineAsyncComponent(() => import('./DashboardView.vue'));
const PublicProfilesView = defineAsyncComponent(() => import('./PublicProfilesView.vue'));

const sessionStore = useSessionStore();
const { sessionState } = storeToRefs(sessionStore);

const currentView = computed(() => {
    // If logged using 'loggedIn' state, show Dashboard
    if (sessionState.value === 'loggedIn') {
        return DashboardView;
    }
    // Otherwise show Public Profiles
    return PublicProfilesView;
});
</script>

<template>
    <component :is="currentView" />
</template>
