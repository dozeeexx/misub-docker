import { describe, expect, it } from 'vitest';
import yaml from 'js-yaml';
import { generateBuiltinClashConfig } from '../../functions/modules/subscription/builtin-clash-generator.js';
import { generateBuiltinSurgeConfig } from '../../functions/modules/subscription/builtin-surge-generator.js';
import { generateBuiltinLoonConfig } from '../../functions/modules/subscription/builtin-loon-generator.js';
import { generateBuiltinSingboxConfig } from '../../functions/modules/subscription/builtin-singbox-generator.js';
import { generateBuiltinQuanxConfig } from '../../functions/modules/subscription/builtin-quanx-generator.js';

const RELAY_NODE_LIST = [
    'trojan://pass@hk.example.com:443?sni=hk.example.com#香港入口-HK-01',
    'trojan://pass@us.example.com:443?sni=us.example.com#美国落地-US-01',
    'ss://YWVzLTI1Ni1nY206cGFzcw@sg.example.com:8388#狮城-SG-01'
].join('\n');

describe('内置 Relay 分流等级', () => {
    it('Mihomo/Meta 不应输出 relay 策略组，链式代理应通过 dialer-proxy 实现', () => {
        const parsed = yaml.load(generateBuiltinClashConfig(RELAY_NODE_LIST, { ruleLevel: 'relay' }));

        expect(parsed['proxy-groups'].some(group => group.type === 'relay')).toBe(false);
        expect(parsed.proxies.some(proxy => proxy.name?.startsWith('🔗 链式代理 - ') && proxy['dialer-proxy'] === '入口节点')).toBe(true);

        const relayGroup = parsed['proxy-groups'].find(group => group.name === '🔗 链式代理');
        expect(relayGroup?.type).toBe('select');
        expect(relayGroup?.proxies.some(name => name.startsWith('🔗 链式代理 - '))).toBe(true);
        expect(relayGroup?.proxies).not.toContain('入口节点');
        expect(relayGroup?.proxies).not.toContain('落地节点');
    });

    it('Surge/Loon Relay 分流应输出原生 relay 策略组', () => {
        const surge = generateBuiltinSurgeConfig(RELAY_NODE_LIST, { ruleLevel: 'relay' });
        const loon = generateBuiltinLoonConfig(RELAY_NODE_LIST, { ruleLevel: 'relay' });

        expect(surge).toContain('🔗 链式代理 = relay, 入口节点, 落地节点');
        expect(loon).toContain('🔗 链式代理 = relay, 入口节点, 落地节点');
    });

    it('Sing-box Relay 分流应使用 detour 表达链式出站', () => {
        const parsed = JSON.parse(generateBuiltinSingboxConfig(RELAY_NODE_LIST, { ruleLevel: 'relay' }));

        expect(parsed.outbounds.some(outbound => outbound.tag?.startsWith('🔗 链式代理 - ') && outbound.detour === '入口节点')).toBe(true);
        const relaySelector = parsed.outbounds.find(outbound => outbound.tag === '🔗 链式代理');
        expect(relaySelector?.type).toBe('selector');
        expect(relaySelector?.outbounds.some(tag => tag.startsWith('🔗 链式代理 - '))).toBe(true);
    });

    it('QuanX 不支持真链式时应保持 static 降级而不是输出 relay', () => {
        const quanx = generateBuiltinQuanxConfig(RELAY_NODE_LIST, { ruleLevel: 'relay' });

        expect(quanx).toContain('static=🔗 链式代理');
        expect(quanx).not.toContain('relay=🔗 链式代理');
    });
});
