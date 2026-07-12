import type { CategoryWithCounts } from './category.repository.js';

export interface CategoryDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  defaultDepreciationRate: number | null;
  defaultUsefulLifeMonths: number | null;
  childCount: number;
  assetCount: number;
  createdAt: string;
}

export interface CategoryTreeNode extends CategoryDto {
  children: CategoryTreeNode[];
}

export function toCategoryDto(c: CategoryWithCounts): CategoryDto {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    parentId: c.parentId,
    defaultDepreciationRate: c.defaultDepreciationRate ? Number(c.defaultDepreciationRate) : null,
    defaultUsefulLifeMonths: c.defaultUsefulLifeMonths,
    childCount: c._count.children,
    assetCount: c._count.assets,
    createdAt: c.createdAt.toISOString(),
  };
}

/** Assemble a flat list of categories into a nested forest (roots + children). */
export function buildCategoryTree(flat: CategoryDto[]): CategoryTreeNode[] {
  const nodes = new Map<string, CategoryTreeNode>();
  for (const c of flat) nodes.set(c.id, { ...c, children: [] });

  const roots: CategoryTreeNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}
