import { describe, expect, it } from 'vitest';
import { hashOpaqueValue, hashPassword, verifyPassword } from '@/lib/public-service/auth';

describe('public service auth primitives', () => {
  it('hashes and verifies passwords without storing plaintext', () => {
    const password = 'correct horse battery staple';
    const stored = hashPassword(password);
    expect(stored).toMatch(/^scrypt:[^:]+:[0-9a-f]+$/);
    expect(stored).not.toContain(password);
    expect(verifyPassword(password, stored)).toBe(true);
    expect(verifyPassword('wrong password', stored)).toBe(false);
  });

  it('creates deterministic opaque hashes for token lookup', () => {
    expect(hashOpaqueValue('token-a')).toBe(hashOpaqueValue('token-a'));
    expect(hashOpaqueValue('token-a')).not.toBe(hashOpaqueValue('token-b'));
  });
});
