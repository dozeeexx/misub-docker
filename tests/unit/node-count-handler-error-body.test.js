import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleNodeCountRequest } from '../../functions/modules/handlers/node-handler.js';
import { StorageFactory } from '../../functions/storage-adapter.js';

describe('handleNodeCountRequest error body handling', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('treats HTTP 200 upstream error text as a failed manual node update', async () => {
        const errorText = 'failed to fetch remote profile with status 400 Bad Request';
        const createAdapterSpy = vi.spyOn(StorageFactory, 'createAdapter');

        vi.stubGlobal('fetch', vi.fn(async () => new Response(errorText, { status: 200 })));

        const request = new Request('http://local/api/node_count', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ url: 'https://airport.example/sub' })
        });

        const response = await handleNodeCountRequest(request, {});
        const data = await response.json();

        expect(data.success).toBe(false);
        expect(data.errorType).toBe('server');
        expect(data.error).toContain('HTTP 400');
        expect(data.count).toBe(0);
        expect(createAdapterSpy).not.toHaveBeenCalled();
    });
});
