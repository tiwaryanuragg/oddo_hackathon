import { AppError } from '../../../core/errors/app-error.js';
import { slugify } from '../../../core/utils/slug.js';
import { eventBus } from '../../../core/events/index.js';
import type { CategoryRepositoryContract } from './category.repository.js';
import {
  buildCategoryTree,
  toCategoryDto,
  type CategoryDto,
  type CategoryTreeNode,
} from './category.mapper.js';
import type { CreateCategoryInput, UpdateCategoryInput } from './category.schema.js';

export class CategoryService {
  constructor(private readonly repo: CategoryRepositoryContract) {}

  async getTree(): Promise<CategoryTreeNode[]> {
    const all = await this.repo.findAll();
    return buildCategoryTree(all.map(toCategoryDto));
  }

  async getFlat(): Promise<CategoryDto[]> {
    const all = await this.repo.findAll();
    return all.map(toCategoryDto);
  }

  async getById(id: string): Promise<CategoryDto> {
    const cat = await this.repo.findById(id);
    if (!cat) throw AppError.notFound('Category not found');
    return toCategoryDto(cat);
  }

  async create(input: CreateCategoryInput, actorId: string): Promise<CategoryDto> {
    if (input.parentId && !(await this.repo.exists(input.parentId))) {
      throw AppError.badRequest('Parent category does not exist', { parentId: ['Not found'] });
    }
    const slug = await this.uniqueSlug(input.name);
    const cat = await this.repo.create({ ...input, slug });
    eventBus.emit('audit.activity', {
      action: 'category.created',
      entityType: 'Category',
      entityId: cat.id,
      actorId,
      metadata: { name: cat.name },
    });
    return toCategoryDto(cat);
  }

  async update(id: string, input: UpdateCategoryInput, actorId: string): Promise<CategoryDto> {
    const existing = await this.repo.findById(id);
    if (!existing) throw AppError.notFound('Category not found');

    if (input.parentId !== undefined && input.parentId !== null) {
      await this.assertValidParent(id, input.parentId);
    }

    const cat = await this.repo.update(id, input);
    eventBus.emit('audit.activity', {
      action: 'category.updated',
      entityType: 'Category',
      entityId: cat.id,
      actorId,
    });
    return toCategoryDto(cat);
  }

  async remove(id: string, actorId: string): Promise<void> {
    const cat = await this.repo.findById(id);
    if (!cat) throw AppError.notFound('Category not found');
    if (cat._count.children > 0) {
      throw AppError.conflict('Cannot delete a category that has sub-categories. Remove them first.');
    }
    if (cat._count.assets > 0) {
      throw AppError.conflict('Cannot delete a category that still classifies assets.');
    }
    await this.repo.delete(id);
    eventBus.emit('audit.activity', {
      action: 'category.deleted',
      entityType: 'Category',
      entityId: id,
      actorId,
    });
  }

  /** A category cannot be its own parent, nor a child of one of its descendants. */
  private async assertValidParent(id: string, parentId: string): Promise<void> {
    if (parentId === id) {
      throw AppError.badRequest('A category cannot be its own parent', { parentId: ['Invalid parent'] });
    }
    if (!(await this.repo.exists(parentId))) {
      throw AppError.badRequest('Parent category does not exist', { parentId: ['Not found'] });
    }
    const descendants = this.descendantsOf(id, await this.repo.findAllEdges());
    if (descendants.has(parentId)) {
      throw AppError.badRequest('Cannot move a category under one of its own descendants', {
        parentId: ['Would create a cycle'],
      });
    }
  }

  private descendantsOf(rootId: string, edges: { id: string; parentId: string | null }[]): Set<string> {
    const childrenOf = new Map<string, string[]>();
    for (const e of edges) {
      if (e.parentId) {
        const list = childrenOf.get(e.parentId) ?? [];
        list.push(e.id);
        childrenOf.set(e.parentId, list);
      }
    }
    const result = new Set<string>();
    const stack = [rootId];
    while (stack.length) {
      const current = stack.pop()!;
      for (const child of childrenOf.get(current) ?? []) {
        if (!result.has(child)) {
          result.add(child);
          stack.push(child);
        }
      }
    }
    return result;
  }

  private async uniqueSlug(name: string): Promise<string> {
    const base = slugify(name);
    let candidate = base;
    let n = 1;
    while (await this.repo.slugExists(candidate)) {
      n += 1;
      candidate = `${base}-${n}`;
    }
    return candidate;
  }
}
