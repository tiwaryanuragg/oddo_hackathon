import { beforeEach, describe, expect, it } from 'vitest';
import { Role, UserStatus } from '@assetflow/shared';
import { AuthService } from '../auth.service.js';
import { passwordService } from '../password.service.js';
import { tokenService } from '../token.service.js';
import { FakeAuthRepository } from './fake-auth.repository.js';
import { AppError } from '../../../core/errors/app-error.js';

const ctx = { ip: '127.0.0.1', userAgent: 'vitest' };
const PASSWORD = 'Str0ngPass';

async function activeUser(repo: FakeAuthRepository, email = 'jane@corp.com') {
  return repo.seedUser({
    email,
    passwordHash: await passwordService.hash(PASSWORD),
    role: Role.ADMIN,
    status: UserStatus.ACTIVE,
  });
}

describe('AuthService', () => {
  let repo: FakeAuthRepository;
  let service: AuthService;

  beforeEach(() => {
    repo = new FakeAuthRepository();
    service = new AuthService(repo);
  });

  describe('signup', () => {
    it('creates a PENDING employee and rejects duplicates', async () => {
      const dto = await service.signup(
        { email: 'new@corp.com', password: PASSWORD, firstName: 'New', lastName: 'User' },
        ctx,
      );
      expect(dto.status).toBe(UserStatus.PENDING);
      expect(dto.role).toBe(Role.EMPLOYEE);
      expect((dto as unknown as { passwordHash?: string }).passwordHash).toBeUndefined();

      await expect(
        service.signup(
          { email: 'new@corp.com', password: PASSWORD, firstName: 'Dup', lastName: 'User' },
          ctx,
        ),
      ).rejects.toBeInstanceOf(AppError);
    });
  });

  describe('login', () => {
    it('issues tokens for valid credentials', async () => {
      await activeUser(repo);
      const { user, tokens } = await service.login({ email: 'jane@corp.com', password: PASSWORD }, ctx);
      expect(user.email).toBe('jane@corp.com');
      expect(tokens.accessToken).toBeTruthy();
      expect(tokens.refreshToken).toBeTruthy();
      // A refresh token was persisted.
      expect(repo.refreshTokens.size).toBe(1);
      // Access token carries the right subject.
      expect(tokenService.verifyAccessToken(tokens.accessToken).sub).toBe(user.id);
    });

    it('rejects a wrong password with 401', async () => {
      await activeUser(repo);
      await expect(
        service.login({ email: 'jane@corp.com', password: 'nope' }, ctx),
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('rejects an unknown email with 401 (no enumeration)', async () => {
      await expect(
        service.login({ email: 'ghost@corp.com', password: PASSWORD }, ctx),
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('rejects a non-active account with 403', async () => {
      repo.seedUser({
        email: 'pending@corp.com',
        passwordHash: await passwordService.hash(PASSWORD),
        status: UserStatus.PENDING,
      });
      await expect(
        service.login({ email: 'pending@corp.com', password: PASSWORD }, ctx),
      ).rejects.toMatchObject({ statusCode: 403 });
    });
  });

  describe('refresh', () => {
    it('rotates the refresh token and revokes the old one', async () => {
      await activeUser(repo);
      const { tokens } = await service.login({ email: 'jane@corp.com', password: PASSWORD }, ctx);

      const rotated = await service.refresh(tokens.refreshToken, ctx);
      expect(rotated.tokens.refreshToken).not.toBe(tokens.refreshToken);

      // The original token is now revoked.
      const oldHash = tokenService.hashRefreshToken(tokens.refreshToken);
      const old = await repo.findRefreshTokenByHash(oldHash);
      expect(old?.revokedAt).toBeTruthy();
      expect(old?.replacedById).toBeTruthy();
    });

    it('detects reuse of a revoked token and kills all sessions', async () => {
      await activeUser(repo);
      const { tokens } = await service.login({ email: 'jane@corp.com', password: PASSWORD }, ctx);
      const first = await service.refresh(tokens.refreshToken, ctx);

      // Replaying the original (now revoked) token → theft response.
      await expect(service.refresh(tokens.refreshToken, ctx)).rejects.toBeInstanceOf(AppError);

      // Every session for the user is revoked, including the freshly rotated one.
      const active = await repo.listActiveRefreshTokens((await repo.findUserByEmail('jane@corp.com'))!.id, new Date());
      expect(active).toHaveLength(0);
      // Sanity: the rotated token existed before the purge.
      expect(first.tokens.refreshToken).toBeTruthy();
    });

    it('rejects a missing or unknown refresh token', async () => {
      await expect(service.refresh(undefined, ctx)).rejects.toBeInstanceOf(AppError);
      await expect(service.refresh('garbage', ctx)).rejects.toBeInstanceOf(AppError);
    });
  });

  describe('resetPassword', () => {
    it('changes the password with a valid token and revokes sessions', async () => {
      const user = await activeUser(repo);
      await service.login({ email: 'jane@corp.com', password: PASSWORD }, ctx); // create a session

      const raw = tokenService.generateRefreshToken();
      await repo.createResetToken(user.id, tokenService.hashRefreshToken(raw), tokenService.resetTokenExpiryDate());

      await service.resetPassword({ token: raw, password: 'BrandNew123' });

      // Old password no longer works; new one does.
      await expect(
        service.login({ email: 'jane@corp.com', password: PASSWORD }, ctx),
      ).rejects.toMatchObject({ statusCode: 401 });
      const relogin = await service.login({ email: 'jane@corp.com', password: 'BrandNew123' }, ctx);
      expect(relogin.tokens.accessToken).toBeTruthy();
    });

    it('rejects an already-used token', async () => {
      const user = await activeUser(repo, 'kate@corp.com');
      const raw = tokenService.generateRefreshToken();
      await repo.createResetToken(user.id, tokenService.hashRefreshToken(raw), tokenService.resetTokenExpiryDate());

      await service.resetPassword({ token: raw, password: 'BrandNew123' });
      await expect(
        service.resetPassword({ token: raw, password: 'Another123' }),
      ).rejects.toBeInstanceOf(AppError);
    });
  });

  describe('sessions', () => {
    it('lists and revokes active sessions', async () => {
      const user = await activeUser(repo);
      await service.login({ email: 'jane@corp.com', password: PASSWORD }, ctx);
      await service.login({ email: 'jane@corp.com', password: PASSWORD }, ctx);

      let sessions = await service.listSessions(user.id);
      expect(sessions).toHaveLength(2);

      await service.revokeSession(user.id, sessions[0]!.id);
      sessions = await service.listSessions(user.id);
      expect(sessions).toHaveLength(1);
    });

    it('refuses to revoke another user session', async () => {
      const owner = await activeUser(repo, 'owner@corp.com');
      const other = await activeUser(repo, 'other@corp.com');
      await service.login({ email: 'owner@corp.com', password: PASSWORD }, ctx);
      const ownerSessions = await service.listSessions(owner.id);

      await expect(
        service.revokeSession(other.id, ownerSessions[0]!.id),
      ).rejects.toBeInstanceOf(AppError);
    });
  });
});
