import { describe, expect, it } from 'vitest';
import { resolveRequestContext } from '../../functions/modules/subscription/request-context.js';

const config = {
  mytoken: 'stable-token',
  profileToken: 'profiles'
};

describe('subscription request context routing', () => {
  it('keeps the canonical direct token and profile share paths supported', () => {
    expect(resolveRequestContext(new URL('https://example.com/stable-token'), config, [])).toEqual({
      token: 'stable-token',
      profileIdentifier: null
    });

    expect(resolveRequestContext(new URL('https://example.com/profiles/group-a'), config, [])).toEqual({
      token: 'profiles',
      profileIdentifier: 'group-a'
    });
  });

  it('keeps /sub as the only explicit subscription route prefix', () => {
    expect(resolveRequestContext(new URL('https://example.com/sub/stable-token'), config, [])).toEqual({
      token: 'stable-token',
      profileIdentifier: null
    });

    expect(resolveRequestContext(new URL('https://example.com/sub/profiles/group-a'), config, [])).toEqual({
      token: 'profiles',
      profileIdentifier: 'group-a'
    });
  });

  it('does not treat /s or /sam as explicit subscription route prefixes', () => {
    expect(resolveRequestContext(new URL('https://example.com/s/stable-token'), config, [])).toEqual({
      token: 's',
      profileIdentifier: 'stable-token'
    });

    expect(resolveRequestContext(new URL('https://example.com/sam/stable-token'), config, [])).toEqual({
      token: 'sam',
      profileIdentifier: 'stable-token'
    });
  });
});
