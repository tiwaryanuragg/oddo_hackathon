import type { Request, Response } from 'express';
import { created, noContent, ok } from '../../../core/http/response.js';
import type { CategoryService } from './category.service.js';
import type { CategoryListQuery } from './category.schema.js';

export class CategoryController {
  constructor(private readonly service: CategoryService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const { view } = req.query as unknown as CategoryListQuery;
    const data = view === 'flat' ? await this.service.getFlat() : await this.service.getTree();
    ok(res, data);
  };

  get = async (req: Request, res: Response): Promise<void> => {
    ok(res, await this.service.getById(req.params.id!));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    created(res, await this.service.create(req.body, req.user!.id));
  };

  update = async (req: Request, res: Response): Promise<void> => {
    ok(res, await this.service.update(req.params.id!, req.body, req.user!.id));
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    await this.service.remove(req.params.id!, req.user!.id);
    noContent(res);
  };
}
