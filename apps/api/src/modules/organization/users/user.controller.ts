import type { Request, Response } from 'express';
import { ok } from '../../../core/http/response.js';
import type { Actor, UserService } from './user.service.js';
import type { UserListQuery } from './user.schema.js';

function actor(req: Request): Actor {
  return { id: req.user!.id, role: req.user!.role };
}

export class UserController {
  constructor(private readonly service: UserService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    ok(res, await this.service.list(req.query as unknown as UserListQuery));
  };

  get = async (req: Request, res: Response): Promise<void> => {
    ok(res, await this.service.getById(req.params.id!));
  };

  update = async (req: Request, res: Response): Promise<void> => {
    ok(res, await this.service.update(req.params.id!, req.body, actor(req)));
  };

  promote = async (req: Request, res: Response): Promise<void> => {
    ok(res, await this.service.promote(req.params.id!, req.body, actor(req)));
  };
}
