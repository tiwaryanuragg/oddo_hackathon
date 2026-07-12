import { Prisma, type PrismaClient } from '@prisma/client';

const withRelations = {
  manager: { select: { id: true, firstName: true, lastName: true, email: true } },
  _count: { select: { members: true, assets: true } },
} satisfies Prisma.DepartmentInclude;

export type DepartmentWithRelations = Prisma.DepartmentGetPayload<{ include: typeof withRelations }>;

export interface DepartmentListArgs {
  skip: number;
  take: number;
  search?: string | undefined;
  sortBy: 'name' | 'code' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}

export interface DepartmentWriteData {
  name?: string;
  code?: string;
  description?: string | null;
  managerId?: string | null;
}

export interface DepartmentRepositoryContract {
  list(args: DepartmentListArgs): Promise<[DepartmentWithRelations[], number]>;
  findById(id: string): Promise<DepartmentWithRelations | null>;
  create(data: DepartmentWriteData): Promise<DepartmentWithRelations>;
  update(id: string, data: DepartmentWriteData): Promise<DepartmentWithRelations>;
  delete(id: string): Promise<void>;
  userExists(id: string): Promise<boolean>;
}

export class DepartmentRepository implements DepartmentRepositoryContract {
  constructor(private readonly prisma: PrismaClient) {}

  async list(args: DepartmentListArgs): Promise<[DepartmentWithRelations[], number]> {
    const where: Prisma.DepartmentWhereInput = args.search
      ? {
          OR: [
            { name: { contains: args.search, mode: 'insensitive' } },
            { code: { contains: args.search, mode: 'insensitive' } },
          ],
        }
      : {};

    return this.prisma.$transaction([
      this.prisma.department.findMany({
        where,
        include: withRelations,
        orderBy: { [args.sortBy]: args.sortOrder },
        skip: args.skip,
        take: args.take,
      }),
      this.prisma.department.count({ where }),
    ]);
  }

  findById(id: string): Promise<DepartmentWithRelations | null> {
    return this.prisma.department.findUnique({ where: { id }, include: withRelations });
  }

  create(data: DepartmentWriteData): Promise<DepartmentWithRelations> {
    return this.prisma.department.create({
      data: {
        name: data.name!,
        code: data.code!,
        description: data.description ?? null,
        managerId: data.managerId ?? null,
      },
      include: withRelations,
    });
  }

  update(id: string, data: DepartmentWriteData): Promise<DepartmentWithRelations> {
    return this.prisma.department.update({ where: { id }, data, include: withRelations });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.department.delete({ where: { id } });
  }

  async userExists(id: string): Promise<boolean> {
    return (await this.prisma.user.count({ where: { id } })) > 0;
  }
}
