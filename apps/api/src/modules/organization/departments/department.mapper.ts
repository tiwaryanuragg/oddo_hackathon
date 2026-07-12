import type { DepartmentWithRelations } from './department.repository.js';

export interface DepartmentDto {
  id: string;
  name: string;
  code: string;
  description: string | null;
  manager: { id: string; firstName: string; lastName: string; email: string } | null;
  memberCount: number;
  assetCount: number;
  createdAt: string;
}

export function toDepartmentDto(d: DepartmentWithRelations): DepartmentDto {
  return {
    id: d.id,
    name: d.name,
    code: d.code,
    description: d.description,
    manager: d.manager,
    memberCount: d._count.members,
    assetCount: d._count.assets,
    createdAt: d.createdAt.toISOString(),
  };
}
