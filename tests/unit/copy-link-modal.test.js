import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import CopyLinkModal from '../../src/components/modals/CopyLinkModal.vue';

const mountModal = () => mount(CopyLinkModal, {
  props: {
    show: true,
    profile: { id: 'p1', customId: 'demo', name: 'Demo' },
    token: 'profiles'
  },
  global: {
    plugins: [createPinia()],
    stubs: {
      Teleport: true
    }
  }
});

describe('CopyLinkModal subscription formats', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    window.history.replaceState({}, '', '/public');
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined)
      }
    });
  });

  it('copies the Clash/Mihomo link with builtin engine to avoid external converter 400s', async () => {
    const wrapper = mountModal();

    const clashItem = wrapper.findAll('[data-testid="copy-link-client"]').find(item => item.text().includes('Clash / Mihomo（内置）'));
    expect(clashItem).toBeTruthy();

    await clashItem.trigger('click');

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'http://localhost:3000/profiles/demo?target=clash&builtin=1'
    );
  });

  it('still exposes an explicit external converter Clash link for users who need it', async () => {
    const wrapper = mountModal();

    const externalItem = wrapper.findAll('[data-testid="copy-link-client"]').find(item => item.text().includes('第三方转换'));
    expect(externalItem).toBeTruthy();

    await externalItem.trigger('click');

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'http://localhost:3000/profiles/demo?target=clash&engine=external'
    );
  });
});
