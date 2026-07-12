import { describe, expect, it } from 'vitest';
import { passwordService } from '../password.service.js';

describe('passwordService', () => {
  it('produces a hash different from the plaintext', async () => {
    const hash = await passwordService.hash('Str0ngPass');
    expect(hash).not.toBe('Str0ngPass');
    expect(hash.length).toBeGreaterThan(20);
  });

  it('verifies a correct password and rejects a wrong one', async () => {
    const hash = await passwordService.hash('Str0ngPass');
    expect(await passwordService.verify('Str0ngPass', hash)).toBe(true);
    expect(await passwordService.verify('WrongPass1', hash)).toBe(false);
  });
});
