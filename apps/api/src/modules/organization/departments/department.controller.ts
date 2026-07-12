import type { Request, Response } from 'express';
import { created, noContent, ok } from '../../../core/http/response.js';
import type { DepartmentService } from './department.service.js';
import type { DepartmentListQuery } from './department.schema.js';

export class DepartmentController {
  constructor(private readonly service: DepartmentService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.list(req.query as unknown as DepartmentListQuery);
    ok(res, result);
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
