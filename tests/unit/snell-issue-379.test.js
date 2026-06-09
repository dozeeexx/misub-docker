import { describe, it, expect } from 'vitest';
import { parseSurgeConfig } from '../../src/utils/protocolConverter.js';

describe('Issue #379: snell 节点添加无效', () => {
  it('应正确解析用户提供的 Surge Snell 配置（带空格的键值对）', () => {
    // 用户在 issue 中提供的配置
    const config = '🇺🇸 USA Racknerd = snell, 192.xx.xx.212, 12345, psk = 9GBbVNzAuxqijVahyOra, version = 5, reuse = true, tfo = true';

    const nodes = parseSurgeConfig(config);

    expect(nodes).toHaveLength(1);
    expect(nodes[0].name).toBe('🇺🇸 USA Racknerd');
    expect(nodes[0].protocol).toBe('snell');
    expect(nodes[0].url).toContain('snell://');
    expect(nodes[0].url).toContain('192.xx.xx.212');
    expect(nodes[0].url).toContain('12345');
    expect(nodes[0].url).toContain('9GBbVNzAuxqijVahyOra');
    expect(nodes[0].url).toContain('version=5');
    expect(nodes[0].url).toContain('reuse=true');
    expect(nodes[0].url).toContain('tfo=true');
  });
});
