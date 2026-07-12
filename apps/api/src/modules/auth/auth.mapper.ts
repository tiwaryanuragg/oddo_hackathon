import type { User } from '@prisma/client';
import type { Role, UserStatus } from '@assetflow/shared';

/** Public, safe representation of a user — never exposes `passwordHash`. */
export interface UserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  status: UserStatus;
  departmentId: string | null;
  jobTitle: string | null;
  avatarUrl: string | null;
  phone: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

export function toUserDto(user: User): UserDto {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role as Role,
    status: user.status as UserStatus,
    departmentId: user.departmentId,
    jobTitle: user.jobTitle,
    avatarUrl: user.avatarUrl,
    phone: user.phone,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}
