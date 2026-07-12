import type { Request, Response } from 'express';
import { created, ok, paginate } from '../../core/http/response.js';
import type { AssetService } from './asset.service.js';
import type {
  AssetQuery,
  ChangeStatusInput,
  RegisterAssetInput,
  RetireAssetInput,
  UpdateAssetInput,
} from './asset.schema.js';

export class AssetController {
  constructor(private readonly service: AssetService) {}

  // GET /assets
  list = async (req: Request, res: Response): Promise<void> => {
    const query = req.query as unknown as AssetQuery;
    const result = await this.service.list(query);
    const { items, total, page, limit } = result;
    ok(res, paginate(items, total, page, limit));
  };

  // POST /assets
  register = async (req: Request, res: Response): Promise<void> => {
    const asset = await this.service.register(
      req.body as RegisterAssetInput,
      req.user!.id,
    );
    created(res, asset);
  };

  // GET /assets/:id
  get = async (req: Request, res: Response): Promise<void> => {
    ok(res, await this.service.getById(req.params.id!));
  };

  // PATCH /assets/:id
  update = async (req: Request, res: Response): Promise<void> => {
    ok(
      res,
      await this.service.update(req.params.id!, req.body as UpdateAssetInput, req.user!.id),
    );
  };

  // PATCH /assets/:id/status
  changeStatus = async (req: Request, res: Response): Promise<void> => {
    ok(
      res,
      await this.service.changeStatus(
        req.params.id!,
        req.body as ChangeStatusInput,
        req.user!.id,
      ),
    );
  };

  // POST /assets/:id/retire
  retire = async (req: Request, res: Response): Promise<void> => {
    ok(
      res,
      await this.service.retire(req.params.id!, req.body as RetireAssetInput, req.user!.id),
    );
  };

  // GET /assets/:id/history
  getHistory = async (req: Request, res: Response): Promise<void> => {
    ok(res, await this.service.getHistory(req.params.id!));
  };

  // GET /assets/:id/qr?format=svg|png
  getQr = async (req: Request, res: Response): Promise<void> => {
    const format = (req.query.format as 'svg' | 'png') || 'svg';
    const { buffer, contentType } = await this.service.generateQr(req.params.id!, format);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 24h cache
    res.send(buffer);
  };

  // GET /assets/:id/depreciation
  getDepreciation = async (req: Request, res: Response): Promise<void> => {
    ok(res, await this.service.getDepreciation(req.params.id!));
  };
}
