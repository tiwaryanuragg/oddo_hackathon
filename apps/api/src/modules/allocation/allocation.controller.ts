import type { Request, Response } from 'express';
import { ok, created, paginate } from '../../core/http/response.js';
import type { AllocationService } from './allocation.service.js';
import type {
  IssueAllocationInput,
  RevokeAllocationInput,
  AllocationQuery,
  CreateTransferInput,
  DecideTransferInput,
  TransferQuery,
  RequestReturnInput,
  ProcessReturnInput,
  ReturnQuery,
} from './allocation.schema.js';

export class AllocationController {
  constructor(private readonly service: AllocationService) {}

  // ══ ALLOCATIONS ═════════════════════════════════════════════════════════════

  // GET /allocations
  listAllocations = async (req: Request, res: Response): Promise<void> => {
    const query = req.query as unknown as AllocationQuery;
    const result = await this.service.listAllocations(query);
    const { items, total, page, limit } = result;
    ok(res, paginate(items, total, page, limit));
  };

  // POST /allocations
  issueAllocation = async (req: Request, res: Response): Promise<void> => {
    const dto = await this.service.issueAllocation(req.body as IssueAllocationInput, req.user!.id);
    created(res, dto);
  };

  // GET /allocations/:id
  getAllocation = async (req: Request, res: Response): Promise<void> => {
    ok(res, await this.service.getAllocationById(req.params.id!));
  };

  // DELETE /allocations/:id  (soft revoke)
  revokeAllocation = async (req: Request, res: Response): Promise<void> => {
    ok(
      res,
      await this.service.revokeAllocation(req.params.id!, req.body as RevokeAllocationInput, req.user!.id),
    );
  };

  // ══ TRANSFERS ════════════════════════════════════════════════════════════════

  // GET /allocations/transfers
  listTransfers = async (req: Request, res: Response): Promise<void> => {
    const query = req.query as unknown as TransferQuery;
    const result = await this.service.listTransfers(query);
    const { items, total, page, limit } = result;
    ok(res, paginate(items, total, page, limit));
  };

  // POST /allocations/transfers
  requestTransfer = async (req: Request, res: Response): Promise<void> => {
    const dto = await this.service.requestTransfer(req.body as CreateTransferInput, req.user!.id);
    created(res, dto);
  };

  // GET /allocations/transfers/:id
  getTransfer = async (req: Request, res: Response): Promise<void> => {
    ok(res, await this.service.getTransferById(req.params.id!));
  };

  // PATCH /allocations/transfers/:id/decide
  decideTransfer = async (req: Request, res: Response): Promise<void> => {
    ok(
      res,
      await this.service.decideTransfer(req.params.id!, req.body as DecideTransferInput, req.user!.id),
    );
  };

  // DELETE /allocations/transfers/:id
  cancelTransfer = async (req: Request, res: Response): Promise<void> => {
    ok(res, await this.service.cancelTransfer(req.params.id!, req.user!.id));
  };

  // ══ RETURNS ═══════════════════════════════════════════════════════════════

  // GET /allocations/returns
  listReturns = async (req: Request, res: Response): Promise<void> => {
    const query = req.query as unknown as ReturnQuery;
    const result = await this.service.listReturns(query);
    const { items, total, page, limit } = result;
    ok(res, paginate(items, total, page, limit));
  };

  // POST /allocations/returns
  requestReturn = async (req: Request, res: Response): Promise<void> => {
    const dto = await this.service.requestReturn(req.body as RequestReturnInput, req.user!.id);
    created(res, dto);
  };

  // GET /allocations/returns/:id
  getReturn = async (req: Request, res: Response): Promise<void> => {
    ok(res, await this.service.getReturnById(req.params.id!));
  };

  // PATCH /allocations/returns/:id/process
  processReturn = async (req: Request, res: Response): Promise<void> => {
    ok(
      res,
      await this.service.processReturn(req.params.id!, req.body as ProcessReturnInput, req.user!.id),
    );
  };
}
