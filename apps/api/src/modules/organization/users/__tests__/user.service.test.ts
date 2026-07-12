import { beforeEach, describe, expect, it } from 'vitest';
import { Role, UserStatus } from '@assetflow/shared';
import { UserService } from '../user.service.js';
import { FakeUserRepository } from './fake-user.repository.js';
import { AppError } from '../../../../core/errors/app-error.js';

describe('UserService — role promotion', () => {
  let repo: FakeUserRepository;
  let service: UserService;

  beforeEach(() => {
    repo = new FakeUserRepository();
    service = new UserService(repo);
  });

  it('promotes a subordinate below the actor rank and writes a role-change log', async () => {
    const admin = repo.seedUser({ role: Role.ADMIN });
    const target = repo.seedUser({ role: Role.EMPLOYEE });

    const dto = await service.promote(
      target.id,
      { role: Role.MANAGER, reason: 'Team lead' },
      { id: admin.id, role: Role.ADMIN },
    );

    expect(dto.role).toBe(Role.MANAGER);
    expect(repo.roleChangeLogs).toHaveLength(1);
    expect(repo.roleChangeLogs[0]).toMatchObject({
      toRole: Role.MANAGER,
      fromRole: Role.EMPLOYEE,
      changedById: admin.id,
    });
  });

  it('forbids assigning a role at or above the actor rank', async () => {
    const admin = repo.seedUser({ role: Role.ADMIN });
    const target = repo.seedUser({ role: Role.EMPLOYEE });
    await expect(
      service.promote(target.id, { role: Role.ADMIN }, { id: admin.id, role: Role.ADMIN }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('forbids changing the role of a peer/superior', async () => {
    const admin = repo.seedUser({ role: Role.ADMIN });
    const otherAdmin = repo.seedUser({ role: Role.ADMIN });
    await expect(
      service.promote(otherAdmin.id, { role: Role.MANAGER }, { id: admin.id, role: Role.ADMIN }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('forbids self-promotion', async () => {
    const admin = repo.seedUser({ role: Role.ADMIN });
    await expect(
      service.promote(admin.id, { role: Role.MANAGER }, { id: admin.id, role: Role.ADMIN }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('rejects a no-op promotion to the same role', async () => {
    const admin = repo.seedUser({ role: Role.ADMIN });
    const target = repo.seedUser({ role: Role.MANAGER });
    await expect(
      service.promote(target.id, { role: Role.MANAGER }, { id: admin.id, role: Role.ADMIN }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it('blocks demoting the last remaining administrator', async () => {
    // Only one admin exists in the system; a SUPER_ADMIN actor tries to demote it.
    const lastAdmin = repo.seedUser({ role: Role.ADMIN, status: UserStatus.ACTIVE });
    await expect(
      service.promote(lastAdmin.id, { role: Role.MANAGER }, { id: 'super', role: Role.SUPER_ADMIN }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('allows demoting an admin when others remain', async () => {
    repo.seedUser({ role: Role.ADMIN, status: UserStatus.ACTIVE });
    const target = repo.seedUser({ role: Role.ADMIN, status: UserStatus.ACTIVE });
    const dto = await service.promote(
      target.id,
      { role: Role.MANAGER },
      { id: 'super', role: Role.SUPER_ADMIN },
    );
    expect(dto.role).toBe(Role.MANAGER);
  });
});

describe('UserService — status transitions', () => {
  let repo: FakeUserRepository;
  let service: UserService;

  beforeEach(() => {
    repo = new FakeUserRepository();
    service = new UserService(repo);
  });

  it('activates a pending user', async () => {
    const admin = repo.seedUser({ role: Role.ADMIN });
    const pending = repo.seedUser({ role: Role.EMPLOYEE, status: UserStatus.PENDING });
    const dto = await service.update(pending.id, { status: UserStatus.ACTIVE }, { id: admin.id, role: Role.ADMIN });
    expect(dto.status).toBe(UserStatus.ACTIVE);
  });

  it('rejects an illegal status transition', async () => {
    const admin = repo.seedUser({ role: Role.ADMIN });
    const gone = repo.seedUser({ role: Role.EMPLOYEE, status: UserStatus.DEACTIVATED });
    await expect(
      service.update(gone.id, { status: UserStatus.ACTIVE }, { id: admin.id, role: Role.ADMIN }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('forbids changing your own status', async () => {
    const admin = repo.seedUser({ role: Role.ADMIN, status: UserStatus.ACTIVE });
    await expect(
      service.update(admin.id, { status: UserStatus.SUSPENDED }, { id: admin.id, role: Role.ADMIN }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('forbids managing a user of equal or higher role', async () => {
    const admin = repo.seedUser({ role: Role.ADMIN });
    const superUser = repo.seedUser({ role: Role.SUPER_ADMIN });
    await expect(
      service.update(superUser.id, { firstName: 'Nope' }, { id: admin.id, role: Role.ADMIN }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});
