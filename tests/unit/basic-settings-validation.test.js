import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import BasicSettings from '../../src/components/settings/sections/BasicSettings.vue';
import { createI18n } from '../../src/i18n/index.js';

const showToast = vi.fn();

vi.mock('../../src/stores/toast', () => ({
  useToastStore: () => ({ showToast })
}));

const mountBasicSettings = (settings) => mount(BasicSettings, {
  props: {
    settings,
    disguiseConfig: {
      enabled: false,
      pageType: 'default',
      redirectUrl: ''
    }
  },
  global: {
    plugins: [createI18n({ initialLocale: 'zh-CN' })],
    stubs: {
      Switch: {
        template: '<div />'
      }
    }
  }
});

describe('BasicSettings validation feedback', () => {
  beforeEach(() => {
    showToast.mockReset();
  });

  it('keeps reserved tokens in the field and shows inline error state', async () => {
    const wrapper = mountBasicSettings({
      FileName: '',
      mytoken: 'settings',
      profileToken: 'profile-token',
      customLoginPath: 'login',
      enablePublicPage: true
    });

    await wrapper.vm.$nextTick();

    expect(wrapper.props().settings.mytoken).toBe('settings');
    expect(wrapper.text()).toContain('系统保留路径不可用作自定义订阅 Token');
    expect(wrapper.props().settings.customLoginPath).toBe('login');
    expect(wrapper.text()).toContain('"/login" 是系统保留路径，不可用作自定义管理后台路径');
  });

  it('shows inline error for token characters that cannot form safe paths', async () => {
    const wrapper = mountBasicSettings({
      FileName: '',
      mytoken: ':',
      profileToken: 'profile:token',
      customLoginPath: 'login',
      enablePublicPage: true
    });

    await wrapper.vm.$nextTick();

    expect(wrapper.props().settings.mytoken).toBe(':');
    expect(wrapper.props().settings.profileToken).toBe('profile:token');
    expect(wrapper.text()).toContain('Token 仅允许字母、数字、下划线和中划线');
  });
});
