import { describe, expect, it } from 'vitest';
import { buildClientQuickLinks } from '../../src/utils/client-quick-links.js';

describe('client quick links', () => {
  const baseOptions = {
    origin: 'https://misub.example',
    token: 'share-token',
    profile: { id: 'p1', customId: 'daily', name: '日常使用' }
  };

  it('builds user-facing recommended client links without exposing format jargon first', () => {
    const links = buildClientQuickLinks(baseOptions);

    expect(links.map(link => link.name)).toEqual([
      'Clash Verge Rev',
      'Mihomo Party',
      'Hiddify',
      'Sing-box',
      'Shadowrocket',
      'Quantumult X',
      'Surge',
      'Loon'
    ]);
    expect(links[0]).toMatchObject({
      id: 'clash-verge-rev',
      badge: '推荐',
      url: 'https://misub.example/share-token/daily?clash',
      summary: expect.stringContaining('桌面')
    });
    expect(links[2]).toMatchObject({
      id: 'hiddify',
      url: 'https://misub.example/share-token/daily?clash',
      summary: expect.stringContaining('自动适配')
    });
  });

  it('generates encoded one-tap import links for clients with URL schemes', () => {
    const links = buildClientQuickLinks(baseOptions);
    const hiddify = links.find(link => link.id === 'hiddify');
    const shadowrocket = links.find(link => link.id === 'shadowrocket');

    expect(hiddify.importUrl).toBe(`hiddify://import/${encodeURIComponent('https://misub.example/share-token/daily?clash')}`);
    expect(shadowrocket.importUrl).toContain('shadowrocket://add/sub://');
    expect(shadowrocket.importUrl).toContain('remark=%E6%97%A5%E5%B8%B8%E4%BD%BF%E7%94%A8');
  });

  it('returns no links when stable profile token is missing', () => {
    expect(buildClientQuickLinks({ ...baseOptions, token: '' })).toEqual([]);
    expect(buildClientQuickLinks({ ...baseOptions, token: 'auto' })).toEqual([]);
  });
});
