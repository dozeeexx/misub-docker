import { describe, it, expect } from 'vitest';
import { isBrowserAgent, determineTargetFormat } from '../../functions/modules/subscription/user-agent-utils.js';

describe('User-Agent Utils', () => {
    describe('isBrowserAgent', () => {
        it('should identify standard browsers as browsers', () => {
            const browsers = [
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0'
            ];
            browsers.forEach(ua => {
                expect(isBrowserAgent(ua)).toBe(true);
            });
        });

        it('should excluding known proxy clients even if they contain browser keywords', () => {
            const proxies = [
                'Clash/1.0',
                'Clash.Meta/1.0',
                'Mozilla/5.0 (compatible; Clash/1.0)', // Hypothetical mixed UA
                'Shadowrocket/2.1.82 (iOS; 14.6; Scale/3.0)',
                'Quantumult%20X/1.0.22 (iPhone13,2; iOS 14.6)',
                'v2rayNG/1.6.25 (Linux; Android 11; Pixel 4 XL Build/RQ3A.210605.005) Go/1.16.5',
                'NekoBox/1.0'
            ];
            proxies.forEach(ua => {
                expect(isBrowserAgent(ua)).toBe(false);
            });
        });

        it('should return false for empty or non-browser UAs', () => {
            expect(isBrowserAgent('')).toBe(false);
            expect(isBrowserAgent(null)).toBe(false);
            expect(isBrowserAgent('curl/7.64.1')).toBe(false);
            expect(isBrowserAgent('PostmanRuntime/7.26.8')).toBe(false);
        });
    });

    describe('determineTargetFormat', () => {
        it('should prioritize URL search params', () => {
            const params = new URLSearchParams('?target=singbox');
            expect(determineTargetFormat('Clash/1.0', params)).toBe('singbox');

            const params2 = new URLSearchParams('?clash=1');
            expect(determineTargetFormat('Other/1.0', params2)).toBe('clash');
        });

        it('should normalize v2ray/trojan params to base64', () => {
            const params = new URLSearchParams('?v2ray=true');
            expect(determineTargetFormat('Any', params)).toBe('base64');

            const params2 = new URLSearchParams('?trojan=true');
            expect(determineTargetFormat('Any', params2)).toBe('base64');
        });

        it('should detect format from User-Agent when no params', () => {
            const params = new URLSearchParams('');
            expect(determineTargetFormat('Clash.Meta/1.0', params)).toBe('clash');
            expect(determineTargetFormat('ClashVerge/1.0', params)).toBe('clash');
            expect(determineTargetFormat('Shadowrocket/2.0', params)).toBe('base64');
            expect(determineTargetFormat('sing-box/1.0', params)).toBe('singbox');
            expect(determineTargetFormat('Quantumult X', params)).toBe('quanx');
            expect(determineTargetFormat('Loon/2.1', params)).toBe('loon');
        });

        it('should fallback to base64 for unknown UAs', () => {
            const params = new URLSearchParams('');
            expect(determineTargetFormat('UnknownClient/1.0', params)).toBe('base64');
            expect(determineTargetFormat('curl/7.0', params)).toBe('base64');
        });
    });
});
