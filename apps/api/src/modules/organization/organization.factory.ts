import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';

import { DepartmentRepository } from './departments/department.repository.js';
import { DepartmentService } from './departments/department.service.js';
import { DepartmentController } from './departments/department.controller.js';
import { buildDepartmentRouter } from './departments/department.routes.js';

import { CategoryRepository } from './categories/category.repository.js';
import { CategoryService } from './categories/category.service.js';
import { CategoryController } from './categories/category.controller.js';
import { buildCategoryRouter } from './categories/category.routes.js';

import { UserRepository } from './users/user.repository.js';
import { UserService } from './users/user.service.js';
import { UserController } from './users/user.controller.js';
import { buildUserRouter } from './users/user.routes.js';

/**
 * Composition root for the Organization module. Wires the three sub-modules
 * (departments, categories, users) and returns a single Router that mounts each
 * at its resource path.
 */
export function createOrganizationModule(prisma: PrismaClient): Router {
  const router = Router();

  const departments = new DepartmentController(new DepartmentService(new DepartmentRepository(prisma)));
  const categories = new CategoryController(new CategoryService(new CategoryRepository(prisma)));
  const users = new UserController(new UserService(new UserRepository(prisma)));

  router.use('/departments', buildDepartmentRouter(departments));
  router.use('/categories', buildCategoryRouter(categories));
  router.use('/users', buildUserRouter(users));

  return router;
}
