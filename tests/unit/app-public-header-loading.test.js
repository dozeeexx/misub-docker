import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import App from '../../src/App.vue';

vi.mock('vue-router', () => ({
  useRoute: () => ({
    meta: { isPublic: true },
    fullPath: '/vps'
  })
}));

vi.mock('../../src/stores/theme', () => ({
  useThemeStore: () => ({
    theme: ref(''),
    initTheme: vi.fn()
  })
}));

vi.mock('../../src/stores/session', () => ({
  useSessionStore: () => ({
    sessionState: ref('loading'),
    publicHeaderFooter: ref({ vpsPublicHeaderEnabled: true, vpsPublicFooterEnabled: true }),
    publicConfig: { customLoginPath: '' },
    subscriptionConfig: { isDefaultPassword: false },
    checkSession: vi.fn().mockResolvedValue(undefined),
    login: vi.fn(),
    logout: vi.fn()
  })
}));

vi.mock('../../src/stores/toast', () => ({
  useToastStore: () => ({
    showToast: vi.fn()
  })
}));

vi.mock('../../src/stores/useDataStore', () => ({
  useDataStore: () => ({
    fetchData: vi.fn().mockResolvedValue(undefined),
    saveData: vi.fn().mockResolvedValue(undefined),
    isDirty: ref(false),
    saveState: ref('idle')
  })
}));

vi.mock('../../src/stores/ui', () => ({
  useUIStore: () => ({
    layoutMode: ref('classic')
  })
}));

describe('App public loading state', () => {
  it('does not render the public header while session config is still loading', () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          NavBar: true,
          Header: { template: '<div data-testid="header">header</div>' },
          Footer: true,
          Toast: true,
          SavePrompt: true,
          ScrollToTop: true,
          Dashboard: true,
          RouteErrorBoundary: { template: '<slot />' },
          'router-view': { template: '<div />' }
        }
      }
    });

    expect(wrapper.find('[data-testid="header"]').exists()).toBe(false);
  });
});
