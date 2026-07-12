import { Prisma, type PrismaClient } from '@prisma/client';

const withCounts = {
  _count: { select: { children: true, assets: true } },
} satisfies Prisma.CategoryInclude;

export type CategoryWithCounts = Prisma.CategoryGetPayload<{ include: typeof withCounts }>;

export interface CategoryWriteData {
  name?: string;
  slug?: string;
  description?: string | null;
  parentId?: string | null;
  defaultDepreciationRate?: number | null;
  defaultUsefulLifeMonths?: number | null;
}

export interface CategoryRepositoryContract {
  findAll(): Promise<CategoryWithCounts[]>;
  findAllEdges(): Promise<{ id: string; parentId: string | null }[]>;
  findById(id: string): Promise<CategoryWithCounts | null>;
  slugExists(slug: string): Promise<boolean>;
  exists(id: string): Promise<boolean>;
  create(data: CategoryWriteData): Promise<CategoryWithCounts>;
  update(id: string, data: CategoryWriteData): Promise<CategoryWithCounts>;
  delete(id: string): Promise<void>;
}

export class CategoryRepository implements CategoryRepositoryContract {
  constructor(private readonly prisma: PrismaClient) {}

  findAll(): Promise<CategoryWithCounts[]> {
    return this.prisma.category.findMany({ include: withCounts, orderBy: { name: 'asc' } });
  }

  /** Lightweight (id, parentId) projection used for cycle detection. */
  findAllEdges(): Promise<{ id: string; parentId: string | null }[]> {
    return this.prisma.category.findMany({ select: { id: true, parentId: true } });
  }

  findById(id: string): Promise<CategoryWithCounts | null> {
    return this.prisma.category.findUnique({ where: { id }, include: withCounts });
  }

  async slugExists(slug: string): Promise<boolean> {
    return (await this.prisma.category.count({ where: { slug } })) > 0;
  }

  async exists(id: string): Promise<boolean> {
    return (await this.prisma.category.count({ where: { id } })) > 0;
  }

  create(data: CategoryWriteData): Promise<CategoryWithCounts> {
    return this.prisma.category.create({
      data: {
        name: data.name!,
        slug: data.slug!,
        description: data.description ?? null,
        parentId: data.parentId ?? null,
        defaultDepreciationRate: data.defaultDepreciationRate ?? null,
        defaultUsefulLifeMonths: data.defaultUsefulLifeMonths ?? null,
      },
      include: withCounts,
    });
  }

  update(id: string, data: CategoryWriteData): Promise<CategoryWithCounts> {
    return this.prisma.category.update({ where: { id }, data, include: withCounts });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.category.delete({ where: { id } });
  }
}
