import { describe, expect, it, vi } from 'vitest';
import {
    buildExternalNodesCallbackUrl,
    buildExternalNodesCacheKey,
    createExternalNodesToken,
    getExternalNodes,
    handleExternalNodesCallbackRequest,
    putExternalNodes,
    shouldUseExternalNodesCallback,
    verifyExternalNodesToken
} from '../../functions/services/external-nodes-callback-service.js';

describe('external nodes callback service', () => {
    it('uses callback only when inline URL or node count exceeds thresholds', () => {
        expect(shouldUseExternalNodesCallback({ inlineUrlLength: 6000, nodeCount: 80 })).toBe(false);
        expect(shouldUseExternalNodesCallback({ inlineUrlLength: 6001, nodeCount: 80 })).toBe(true);
        expect(shouldUseExternalNodesCallback({ inlineUrlLength: 6000, nodeCount: 81 })).toBe(true);
        expect(shouldUseExternalNodesCallback({ inlineUrlLength: 10, nodeCount: 1 })).toBe(false);
    });

    it('stores external nodes under a profile and content hash with short ttl', async () => {
        const kv = {
            get: vi.fn(async () => null),
            put: vi.fn(async () => undefined)
        };
        const env = { MISUB_KV: kv };
        const nodesText = 'ss://node-a#A\nss://node-b#B\n';

        const result = await putExternalNodes({ env, profileId: 'profile-a', nodesText });

        expect(result.nodeHash).toMatch(/^[a-f0-9]{64}$/);
        expect(result.cacheKey).toBe(buildExternalNodesCacheKey('profile-a', result.nodeHash));
        expect(kv.get).toHaveBeenCalledWith(result.cacheKey);
        expect(kv.put).toHaveBeenCalledWith(result.cacheKey, nodesText, { expirationTtl: 120 });
    });

    it('reuses existing temporary KV object instead of writing again', async () => {
        const kv = {
            get: vi.fn(async () => 'ss://cached#A\n'),
            put: vi.fn(async () => undefined)
        };

        const result = await putExternalNodes({ env: { MISUB_KV: kv }, profileId: 'profile-a', nodesText: 'ss://cached#A\n' });

        expect(result.reused).toBe(true);
        expect(kv.put).not.toHaveBeenCalled();
    });

    it('signs, verifies, and rejects tampered or expired callback tokens', async () => {
        const secret = 'unit-test-secret';
        const token = await createExternalNodesToken({ profileId: 'profile-a', nodeHash: 'a'.repeat(64), secret, expiresInSeconds: 120 });
        const verified = await verifyExternalNodesToken(token, secret);

        expect(verified.profileId).toBe('profile-a');
        expect(verified.nodeHash).toBe('a'.repeat(64));

        await expect(verifyExternalNodesToken(`${token}x`, secret)).rejects.toThrow(/invalid/i);

        const expired = await createExternalNodesToken({ profileId: 'profile-a', nodeHash: 'b'.repeat(64), secret, expiresInSeconds: -1 });
        await expect(verifyExternalNodesToken(expired, secret)).rejects.toThrow(/expired/i);
    });

    it('builds a public callback url without leaking the cache key', async () => {
        const token = 'payload.signature';
        const callbackUrl = buildExternalNodesCallbackUrl('https://misub.example/stable-token?target=clash&refresh=1', token);

        expect(callbackUrl).toBe('https://misub.example/api/external-nodes-callback?token=payload.signature');
        expect(callbackUrl).not.toContain('tmp_external_nodes');
        expect(callbackUrl).not.toContain('refresh=1');
    });

    it('serves cached callback nodes as plain text and returns 410 when cache is missing', async () => {
        const secret = 'unit-test-secret';
        const nodeHash = 'c'.repeat(64);
        const token = await createExternalNodesToken({ profileId: 'profile-a', nodeHash, secret, expiresInSeconds: 120 });
        const cacheKey = buildExternalNodesCacheKey('profile-a', nodeHash);
        const kv = {
            get: vi.fn(async (key) => key === cacheKey ? 'ss://node-a#A\n' : null)
        };

        const response = await handleExternalNodesCallbackRequest(
            new Request(`https://misub.example/api/external-nodes-callback?token=${encodeURIComponent(token)}`),
            { MISUB_KV: kv, CALLBACK_TOKEN_SECRET: secret }
        );

        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toContain('text/plain');
        expect(response.headers.get('Cache-Control')).toContain('no-store');
        expect(await response.text()).toBe('ss://node-a#A\n');

        const missingResponse = await handleExternalNodesCallbackRequest(
            new Request(`https://misub.example/api/external-nodes-callback?token=${encodeURIComponent(token)}`),
            { MISUB_KV: { get: vi.fn(async () => null) }, CALLBACK_TOKEN_SECRET: secret }
        );
        expect(missingResponse.status).toBe(410);
    });

    it('falls back to process memory cache when KV is unavailable', async () => {
        const nodesText = 'ss://memory-node#A\n';
        const putResult = await putExternalNodes({ env: {}, profileId: 'profile-memory', nodesText });
        const cached = await getExternalNodes({ env: {}, profileId: 'profile-memory', nodeHash: putResult.nodeHash });

        expect(cached).toBe(nodesText);
    });
});
