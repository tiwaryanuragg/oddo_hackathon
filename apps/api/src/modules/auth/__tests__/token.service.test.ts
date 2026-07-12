import { describe, expect, it } from 'vitest';
import { Role, UserStatus } from '@assetflow/shared';
import { tokenService } from '../token.service.js';
import { AppError } from '../../../core/errors/app-error.js';

const subject = { id: 'user_1', email: 'admin@assetflow.local', role: Role.ADMIN, status: UserStatus.ACTIVE };

describe('tokenService', () => {
  it('signs and verifies an access token round-trip', () => {
    const token = tokenService.signAccessToken(subject);
    const payload = tokenService.verifyAccessToken(token);
    expect(payload.sub).toBe('user_1');
    expect(payload.email).toBe('admin@assetflow.local');
    expect(payload.role).toBe(Role.ADMIN);
    expect(payload.type).toBe('access');
  });

  it('rejects a tampered token with an AppError', () => {
    const token = `${tokenService.signAccessToken(subject)}tampered`;
    expect(() => tokenService.verifyAccessToken(token)).toThrow(AppError);
  });

  it('hashes refresh tokens deterministically and irreversibly', () => {
    const raw = tokenService.generateRefreshToken();
    const hashA = tokenService.hashRefreshToken(raw);
    const hashB = tokenService.hashRefreshToken(raw);
    expect(hashA).toBe(hashB);
    expect(hashA).not.toBe(raw);
  });

  it('generates unique refresh tokens', () => {
    expect(tokenService.generateRefreshToken()).not.toBe(tokenService.generateRefreshToken());
  });
});
