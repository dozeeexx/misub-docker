import { describe, expect, it, vi } from 'vitest';
import { runOperatorChain } from '../../functions/utils/operator-runner.js';

describe('operator runner', () => {
  it('runs script operators through the restricted DSL without dynamic code execution', async () => {
    const functionSpy = vi.spyOn(globalThis, 'Function').mockImplementation(() => {
      throw new Error('dynamic code execution disabled');
    });
    const urls = ['ss://YWVzLTEyOC1nY206cGFzcw@example.com:8388#HKNode'];

    try {
      const result = await runOperatorChain(urls, [
        {
          type: 'script',
          params: {
            dsl: [
              { action: 'rename', template: '{name} Scripted' },
              { action: 'filter', field: 'name', op: 'contains', value: 'HKNode' }
            ]
          }
        }
      ], { target: 'clash' });

      expect(result).toHaveLength(1);
      expect(decodeURIComponent(result[0])).toContain('#HKNode Scripted');
      expect(functionSpy).not.toHaveBeenCalled();
    } finally {
      functionSpy.mockRestore();
    }
  });

  it('does not execute legacy script code when dynamic code execution is disabled', async () => {
    const functionSpy = vi.spyOn(globalThis, 'Function').mockImplementation(() => {
      throw new Error('dynamic code execution disabled');
    });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const urls = ['ss://YWVzLTEyOC1nY206cGFzcw@example.com:8388#HKNode'];

    try {
      const result = await runOperatorChain(urls, [
        {
          type: 'script',
          params: {
            code: 'return $proxies.map(p => ({ ...p, name: `${p.name} Scripted` }))'
          }
        }
      ], { target: 'clash' });

      expect(result).toHaveLength(1);
      expect(decodeURIComponent(result[0])).toContain('#HKNode');
      expect(decodeURIComponent(result[0])).not.toContain('Scripted');
      expect(functionSpy).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith('[Operator] Legacy script code is disabled; use params.dsl instead.');
    } finally {
      functionSpy.mockRestore();
      warnSpy.mockRestore();
    }
  });

});
