import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import { assetsApi, type Asset, type AssetEvent, type AssetListFilters, type DepreciationInfo, type PaginatedAssets, type RegisterAssetPayload, type UpdateAssetPayload } from '../api/assets.api';
import type { AssetStatus } from '@assetflow/shared';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const assetKeys = {
  all:         ['assets'] as const,
  lists:       () => [...assetKeys.all, 'list'] as const,
  list:        (filters: AssetListFilters) => [...assetKeys.lists(), filters] as const,
  details:     () => [...assetKeys.all, 'detail'] as const,
  detail:      (id: string) => [...assetKeys.details(), id] as const,
  history:     (id: string) => [...assetKeys.detail(id), 'history'] as const,
  depreciation:(id: string) => [...assetKeys.detail(id), 'depreciation'] as const,
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useAssets(filters: AssetListFilters = {}): UseQueryResult<PaginatedAssets> {
  return useQuery({
    queryKey: assetKeys.list(filters),
    queryFn:  () => assetsApi.list(filters),
  });
}

export function useAsset(id: string | undefined): UseQueryResult<Asset> {
  return useQuery({
    queryKey: assetKeys.detail(id!),
    queryFn:  () => assetsApi.get(id!),
    enabled:  Boolean(id),
  });
}

export function useAssetHistory(id: string | undefined): UseQueryResult<AssetEvent[]> {
  return useQuery({
    queryKey: assetKeys.history(id!),
    queryFn:  () => assetsApi.getHistory(id!),
    enabled:  Boolean(id),
  });
}

export function useAssetDepreciation(id: string | undefined): UseQueryResult<DepreciationInfo> {
  return useQuery({
    queryKey: assetKeys.depreciation(id!),
    queryFn:  () => assetsApi.getDepreciation(id!),
    enabled:  Boolean(id),
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useRegisterAsset(): UseMutationResult<Asset, Error, RegisterAssetPayload> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => assetsApi.register(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: assetKeys.lists() });
    },
  });
}

export function useUpdateAsset(id: string): UseMutationResult<Asset, Error, UpdateAssetPayload> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => assetsApi.update(id, payload),
    onSuccess: (data) => {
      qc.setQueryData(assetKeys.detail(id), data);
      void qc.invalidateQueries({ queryKey: assetKeys.lists() });
    },
  });
}

export function useChangeAssetStatus(
  id: string,
): UseMutationResult<Asset, Error, { status: AssetStatus; note?: string }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ status, note }) => assetsApi.changeStatus(id, status, note),
    onSuccess: (data) => {
      qc.setQueryData(assetKeys.detail(id), data);
      void qc.invalidateQueries({ queryKey: assetKeys.lists() });
      void qc.invalidateQueries({ queryKey: assetKeys.history(id) });
    },
  });
}

export function useRetireAsset(
  id: string,
): UseMutationResult<Asset, Error, { reason: string }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reason }) => assetsApi.retire(id, reason),
    onSuccess: (data) => {
      qc.setQueryData(assetKeys.detail(id), data);
      void qc.invalidateQueries({ queryKey: assetKeys.lists() });
      void qc.invalidateQueries({ queryKey: assetKeys.history(id) });
    },
  });
}
