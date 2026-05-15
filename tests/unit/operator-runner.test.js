import { describe, expect, it } from 'vitest';
import { runOperatorChain } from '../../functions/utils/operator-runner.js';

describe('operator runner', () => {
  it('runs script operators without relying on direct eval fallback', async () => {
    const urls = ['ss://YWVzLTEyOC1nY206cGFzcw@example.com:8388#HKNode'];

    const result = await runOperatorChain(urls, [
      {
        type: 'script',
        params: {
          code: 'return $proxies.map(p => ({ ...p, name: `${p.name} Scripted` }))'
        }
      }
    ], { target: 'clash' });

    expect(result).toHaveLength(1);
    expect(decodeURIComponent(result[0])).toContain('#HKNode Scripted');
  });
});
