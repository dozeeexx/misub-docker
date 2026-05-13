import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CopyLinkModal from '../../src/components/modals/CopyLinkModal.vue';

function mountModal(props = {}) {
  return mount(CopyLinkModal, {
    props: {
      show: true,
      token: 'share-token',
      profile: { id: 'p1', customId: 'daily', name: '日常使用' },
      ...props
    },
    global: {
      plugins: [createPinia()],
      stubs: {
        Modal: {
          props: ['show'],
          template: '<section><header><slot name="title" /></header><main><slot name="body" /></main><footer><slot name="footer" /></footer></section>'
        }
      }
    }
  });
}

describe('CopyLinkModal client-oriented UX', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it('shows simple client cards before manual format choices', () => {
    const wrapper = mountModal();

    expect(wrapper.text()).toContain('选择客户端，一键复制推荐链接');
    expect(wrapper.text()).toContain('Clash Verge Rev');
    expect(wrapper.text()).toContain('Mihomo Party');
    expect(wrapper.text()).toContain('Hiddify');
    expect(wrapper.text()).toContain('已自动选择兼容格式，高级用户仍可复制指定格式。');
  });

  it('copies the recommended link when a client card is clicked', async () => {
    const writeText = vi.fn().mockResolvedValue();
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const wrapper = mountModal();

    await wrapper.get('[data-testid="client-quick-link-hiddify"]').trigger('click');

    expect(writeText).toHaveBeenCalledWith('http://localhost:3000/share-token/daily?clash');
  });
});
