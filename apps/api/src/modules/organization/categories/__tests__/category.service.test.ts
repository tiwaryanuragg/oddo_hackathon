import { beforeEach, describe, expect, it } from 'vitest';
import { CategoryService } from '../category.service.js';
import { FakeCategoryRepository } from './fake-category.repository.js';
import { buildCategoryTree, toCategoryDto } from '../category.mapper.js';

const ACTOR = 'admin_1';

describe('CategoryService', () => {
  let repo: FakeCategoryRepository;
  let service: CategoryService;

  beforeEach(() => {
    repo = new FakeCategoryRepository();
    service = new CategoryService(repo);
  });

  it('generates a unique slug when names collide', async () => {
    const a = await service.create({ name: 'Laptops' }, ACTOR);
    const b = await service.create({ name: 'Laptops' }, ACTOR);
    expect(a.slug).toBe('laptops');
    expect(b.slug).toBe('laptops-2');
  });

  it('rejects creating under a non-existent parent', async () => {
    await expect(service.create({ name: 'X', parentId: 'nope' }, ACTOR)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('prevents a category from becoming its own parent', async () => {
    const a = repo.seed({ id: 'a', name: 'A', slug: 'a' });
    await expect(service.update(a.id, { parentId: a.id }, ACTOR)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('prevents reparenting under a descendant (cycle)', async () => {
    repo.seed({ id: 'a', name: 'A', slug: 'a' });
    repo.seed({ id: 'b', name: 'B', slug: 'b', parentId: 'a' });
    repo.seed({ id: 'c', name: 'C', slug: 'c', parentId: 'b' });
    // Try to move A under C — C is a descendant of A → cycle.
    await expect(service.update('a', { parentId: 'c' }, ACTOR)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('allows a valid reparent', async () => {
    repo.seed({ id: 'a', name: 'A', slug: 'a' });
    repo.seed({ id: 'b', name: 'B', slug: 'b' });
    const moved = await service.update('b', { parentId: 'a' }, ACTOR);
    expect(moved.parentId).toBe('a');
  });

  it('blocks deleting a category that has children', async () => {
    repo.seed({ id: 'a', name: 'A', slug: 'a' });
    repo.seed({ id: 'b', name: 'B', slug: 'b', parentId: 'a' });
    await expect(service.remove('a', ACTOR)).rejects.toMatchObject({ statusCode: 409 });
  });

  it('builds a nested tree from a flat list', async () => {
    repo.seed({ id: 'a', name: 'A', slug: 'a' });
    repo.seed({ id: 'b', name: 'B', slug: 'b', parentId: 'a' });
    repo.seed({ id: 'c', name: 'C', slug: 'c', parentId: 'b' });
    const tree = await service.getTree();
    expect(tree).toHaveLength(1);
    expect(tree[0]!.id).toBe('a');
    expect(tree[0]!.children[0]!.id).toBe('b');
    expect(tree[0]!.children[0]!.children[0]!.id).toBe('c');
  });
});

describe('buildCategoryTree (mapper)', () => {
  it('treats orphaned parents as roots', () => {
    const flat = [
      toCategoryDto({
        id: 'x',
        name: 'X',
        slug: 'x',
        description: null,
        parentId: 'missing',
        defaultDepreciationRate: null,
        defaultUsefulLifeMonths: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { children: 0, assets: 0 },
      }),
    ];
    const tree = buildCategoryTree(flat);
    expect(tree).toHaveLength(1);
    expect(tree[0]!.id).toBe('x');
  });
});
