import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import {
  allocationApi,
  type AllocationDto,
  type AllocationFilters,
  type TransferDto,
  type TransferFilters,
  type ReturnDto,
  type ReturnFilters,
  type Paginated,
  type IssueAllocationPayload,
  type RevokeAllocationPayload,
  type CreateTransferPayload,
  type DecideTransferPayload,
  type RequestReturnPayload,
  type ProcessReturnPayload,
} from '../api/allocation.api';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const allocationKeys = {
  all:             ['allocations'] as const,
  lists:           () => [...allocationKeys.all, 'list'] as const,
  list:            (f: AllocationFilters) => [...allocationKeys.lists(), f] as const,
  detail:          (id: string) => [...allocationKeys.all, 'detail', id] as const,

  transfers:       ['transfers'] as const,
  transferLists:   () => [...allocationKeys.transfers, 'list'] as const,
  transferList:    (f: TransferFilters) => [...allocationKeys.transferLists(), f] as const,
  transferDetail:  (id: string) => [...allocationKeys.transfers, 'detail', id] as const,

  returns:         ['returns'] as const,
  returnLists:     () => [...allocationKeys.returns, 'list'] as const,
  returnList:      (f: ReturnFilters) => [...allocationKeys.returnLists(), f] as const,
  returnDetail:    (id: string) => [...allocationKeys.returns, 'detail', id] as const,
};

// ─── Allocation queries ───────────────────────────────────────────────────────

export function useAllocations(
  filters: AllocationFilters = {},
): UseQueryResult<Paginated<AllocationDto>> {
  return useQuery({
    queryKey: allocationKeys.list(filters),
    queryFn:  () => allocationApi.listAllocations(filters),
  });
}

export function useAllocation(id: string | undefined): UseQueryResult<AllocationDto> {
  return useQuery({
    queryKey: allocationKeys.detail(id!),
    queryFn:  () => allocationApi.getAllocation(id!),
    enabled:  Boolean(id),
  });
}

// ─── Allocation mutations ─────────────────────────────────────────────────────

export function useIssueAllocation(): UseMutationResult<AllocationDto, Error, IssueAllocationPayload> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => allocationApi.issueAllocation(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: allocationKeys.lists() });
    },
  });
}

export function useRevokeAllocation(
  id: string,
): UseMutationResult<AllocationDto, Error, RevokeAllocationPayload> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => allocationApi.revokeAllocation(id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: allocationKeys.lists() });
      qc.removeQueries({ queryKey: allocationKeys.detail(id) });
    },
  });
}

// ─── Transfer queries ─────────────────────────────────────────────────────────

export function useTransfers(
  filters: TransferFilters = {},
): UseQueryResult<Paginated<TransferDto>> {
  return useQuery({
    queryKey: allocationKeys.transferList(filters),
    queryFn:  () => allocationApi.listTransfers(filters),
  });
}

export function useTransfer(id: string | undefined): UseQueryResult<TransferDto> {
  return useQuery({
    queryKey: allocationKeys.transferDetail(id!),
    queryFn:  () => allocationApi.getTransfer(id!),
    enabled:  Boolean(id),
  });
}

// ─── Transfer mutations ───────────────────────────────────────────────────────

export function useRequestTransfer(): UseMutationResult<TransferDto, Error, CreateTransferPayload> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => allocationApi.requestTransfer(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: allocationKeys.transferLists() });
      void qc.invalidateQueries({ queryKey: allocationKeys.lists() });
    },
  });
}

export function useDecideTransfer(
  id: string,
): UseMutationResult<TransferDto, Error, DecideTransferPayload> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => allocationApi.decideTransfer(id, payload),
    onSuccess: (data) => {
      qc.setQueryData(allocationKeys.transferDetail(id), data);
      void qc.invalidateQueries({ queryKey: allocationKeys.transferLists() });
      void qc.invalidateQueries({ queryKey: allocationKeys.lists() });
    },
  });
}

export function useCancelTransfer(
  id: string,
): UseMutationResult<TransferDto, Error, void> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => allocationApi.cancelTransfer(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: allocationKeys.transferLists() });
      void qc.invalidateQueries({ queryKey: allocationKeys.lists() });
    },
  });
}

// ─── Return queries ───────────────────────────────────────────────────────────

export function useReturns(filters: ReturnFilters = {}): UseQueryResult<Paginated<ReturnDto>> {
  return useQuery({
    queryKey: allocationKeys.returnList(filters),
    queryFn:  () => allocationApi.listReturns(filters),
  });
}

export function useReturn(id: string | undefined): UseQueryResult<ReturnDto> {
  return useQuery({
    queryKey: allocationKeys.returnDetail(id!),
    queryFn:  () => allocationApi.getReturn(id!),
    enabled:  Boolean(id),
  });
}

// ─── Return mutations ─────────────────────────────────────────────────────────

export function useRequestReturn(): UseMutationResult<ReturnDto, Error, RequestReturnPayload> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => allocationApi.requestReturn(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: allocationKeys.returnLists() });
      void qc.invalidateQueries({ queryKey: allocationKeys.lists() });
    },
  });
}

export function useProcessReturn(
  id: string,
): UseMutationResult<ReturnDto, Error, ProcessReturnPayload> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => allocationApi.processReturn(id, payload),
    onSuccess: (data) => {
      qc.setQueryData(allocationKeys.returnDetail(id), data);
      void qc.invalidateQueries({ queryKey: allocationKeys.returnLists() });
      void qc.invalidateQueries({ queryKey: allocationKeys.lists() });
    },
  });
}
