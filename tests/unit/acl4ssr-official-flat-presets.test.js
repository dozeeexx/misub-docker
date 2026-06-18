import { describe, it, expect } from 'vitest';
import { TRANSFORM_ASSETS } from '../../src/constants/transform-assets.js';
import {
    OFFICIAL_ACL4SSR_FLAT_PRESETS,
    OFFICIAL_ACL4SSR_FLAT_PRESET_ASSETS,
    OFFICIAL_ACL4SSR_FORBIDDEN_GROUP_LABELS,
    isOfficialAcl4ssrFlatPresetUrl,
    normalizeOfficialAcl4ssrTemplateText,
    validateOfficialAcl4ssrFlatTemplate
} from '../../src/shared/acl4ssr-official-flat-presets.js';

describe('Official ACL4SSR flat presets', () => {
    it('exposes every allowlisted no-country official ACL4SSR config as a preset asset', () => {
        const urls = new Set(TRANSFORM_ASSETS.configs.map(asset => asset.url));
        expect(OFFICIAL_ACL4SSR_FLAT_PRESETS).toHaveLength(25);
        expect(OFFICIAL_ACL4SSR_FLAT_PRESET_ASSETS).toHaveLength(OFFICIAL_ACL4SSR_FLAT_PRESETS.length);

        for (const preset of OFFICIAL_ACL4SSR_FLAT_PRESETS) {
            expect(isOfficialAcl4ssrFlatPresetUrl(preset.url)).toBe(true);
            expect(urls.has(preset.url), `${preset.file} should be present in TRANSFORM_ASSETS`).toBe(true);
        }
    });

    it('keeps official ACL4SSR flat preset metadata Clash-only and free of forbidden group labels', () => {
        for (const asset of OFFICIAL_ACL4SSR_FLAT_PRESET_ASSETS) {
            expect(asset.sourceType).toBe('preset');
            expect(asset.group).toBe('ACL4SSR Official Flat');
            expect(asset.compatibleClients).toEqual(['clash', 'mihomo', 'clash-meta']);
            for (const label of OFFICIAL_ACL4SSR_FORBIDDEN_GROUP_LABELS) {
                expect(`${asset.name} ${asset.description}`).not.toContain(label);
            }
        }
    });

    it('normalizes official relative rules paths to raw GitHub URLs', () => {
        const preset = OFFICIAL_ACL4SSR_FLAT_PRESETS.find(item => item.file === 'ACL4SSR.ini');
        const template = [
            '[custom]',
            'ruleset=🎯 全球直连,rules/ACL4SSR/Clash/LocalAreaNetwork.list',
            'ruleset=🚀 节点选择,clash-classic:rules/ACL4SSR/Clash/ProxyGFWlist.list',
            'custom_proxy_group=🚀 节点选择`select`[]DIRECT`.*'
        ].join('\n');

        const normalized = normalizeOfficialAcl4ssrTemplateText(preset.url, template);
        expect(normalized).toContain('https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/LocalAreaNetwork.list');
        expect(normalized).toContain('clash-classic:https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ProxyGFWlist.list');
        expect(normalized).not.toContain('rules/ACL4SSR/');
    });

    it('rejects official templates if country/region node groups appear', () => {
        const preset = OFFICIAL_ACL4SSR_FLAT_PRESETS.find(item => item.file === 'ACL4SSR_Online.ini');
        const template = [
            '[custom]',
            'ruleset=🚀 节点选择,https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ProxyGFWlist.list',
            'custom_proxy_group=🚀 节点选择`select`[]🇭🇰 香港节点`[]DIRECT',
            'custom_proxy_group=🇭🇰 香港节点`url-test`(港|HK)`http://www.gstatic.com/generate_204`300,,50'
        ].join('\n');

        const validation = validateOfficialAcl4ssrFlatTemplate(preset.url, template);
        expect(validation.ok).toBe(false);
        expect(validation.errors.join('\n')).toContain('🇭🇰 香港节点');
    });
});
