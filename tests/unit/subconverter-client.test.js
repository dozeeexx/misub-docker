import { describe, it, expect } from 'vitest';
import { sanitizeConvertedSubscriptionContent } from '../../functions/modules/subscription/subconverter-client.js';

describe('subconverter-client sanitize', () => {
    it('keeps unicode and emoji in node names', () => {
        const input = 'proxies:\n  - {name: "🇭🇰 香港-HK-01", type: vless}\n';
        const result = sanitizeConvertedSubscriptionContent(input);

        expect(result.content).toBe(input);
        expect(result.replacedCount).toBe(0);
    });

    it('removes unsafe control chars only', () => {
        const input = 'name: "HK\u0000\u0007Node"\nproxies:\n  - type: ss\n';
        const result = sanitizeConvertedSubscriptionContent(input);

        expect(result.content).toBe('name: "HKNode"\nproxies:\n  - type: ss\n');
        expect(result.replacedCount).toBe(2);
    });
});
