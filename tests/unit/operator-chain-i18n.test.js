import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import OperatorChain from '../../src/components/features/Operators/OperatorChain.vue';
import { createI18n } from '../../src/i18n/index.js';

const englishGlobal = () => ({
  plugins: [createI18n({ initialLocale: 'en-US' })],
  stubs: {
    FilterEditor: true,
    RenameEditor: true,
    SortEditor: true,
    DedupEditor: true,
    Input: true
  }
});

const expectNoChineseOrKeys = (text) => {
  expect(text).not.toMatch(/[\u4e00-\u9fff]/);
  expect(text).not.toContain('operators.');
};

describe('operator chain English translations', () => {
  it('renders empty state and add buttons in English', () => {
    const wrapper = mount(OperatorChain, {
      props: { modelValue: [] },
      global: englishGlobal()
    });

    expect(wrapper.text()).toContain('Start chained processing');
    expect(wrapper.text()).toContain('Add operators to customize your subscription node processing workflow.');
    expect(wrapper.text()).toContain('Filter nodes');
    expect(wrapper.text()).toContain('Regex rename');
    expect(wrapper.text()).toContain('Script execution');
    expect(wrapper.text()).toContain('Node sorting');
    expect(wrapper.text()).toContain('Smart deduplication');
    expectNoChineseOrKeys(wrapper.text());
  });
});
