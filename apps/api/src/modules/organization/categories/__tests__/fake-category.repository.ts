import type {
  CategoryRepositoryContract,
  CategoryWithCounts,
  CategoryWriteData,
} from '../category.repository.js';

/** In-memory CategoryRepository for unit tests. */
export class FakeCategoryRepository implements CategoryRepositoryContract {
  readonly items = new Map<string, CategoryWithCounts>();
  private seq = 0;

  private build(data: CategoryWriteData & { id?: string }): CategoryWithCounts {
    const id = data.id ?? `cat_${(this.seq += 1)}`;
    return {
      id,
      name: data.name ?? 'Category',
      slug: data.slug ?? id,
      description: data.description ?? null,
      parentId: data.parentId ?? null,
      defaultDepreciationRate: null,
      defaultUsefulLifeMonths: data.defaultUsefulLifeMonths ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { children: 0, assets: 0 },
    };
  }

  seed(data: CategoryWriteData & { id: string }): CategoryWithCounts {
    const node = this.build(data);
    this.items.set(node.id, node);
    this.recount();
    return node;
  }

  private recount(): void {
    for (const node of this.items.values()) node._count.children = 0;
    for (const node of this.items.values()) {
      if (node.parentId && this.items.has(node.parentId)) {
        this.items.get(node.parentId)!._count.children += 1;
      }
    }
  }

  async findAll(): Promise<CategoryWithCounts[]> {
    return [...this.items.values()];
  }

  async findAllEdges(): Promise<{ id: string; parentId: string | null }[]> {
    return [...this.items.values()].map((c) => ({ id: c.id, parentId: c.parentId }));
  }

  async findById(id: string): Promise<CategoryWithCounts | null> {
    return this.items.get(id) ?? null;
  }

  async slugExists(slug: string): Promise<boolean> {
    return [...this.items.values()].some((c) => c.slug === slug);
  }

  async exists(id: string): Promise<boolean> {
    return this.items.has(id);
  }

  async create(data: CategoryWriteData): Promise<CategoryWithCounts> {
    const node = this.build(data);
    this.items.set(node.id, node);
    this.recount();
    return node;
  }

  async update(id: string, data: CategoryWriteData): Promise<CategoryWithCounts> {
    const node = this.items.get(id);
    if (!node) throw new Error('not found');
    Object.assign(node, data);
    this.recount();
    return node;
  }

  async delete(id: string): Promise<void> {
    this.items.delete(id);
    this.recount();
  }
}
