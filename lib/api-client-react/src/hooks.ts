/**
 * Custom (non-generated) React Query hooks for new API endpoints.
 */
import { useMutation, useQuery } from "@tanstack/react-query";
import type {
  UseMutationOptions,
  UseQueryOptions,
} from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MarketPrice {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  volume: number;
}

export interface AssetBalance {
  asset: string;
  balance: number;
  available: number;
  unrealizedPnl: number;
}

export interface CancelOrderResult {
  success: boolean;
  message: string;
}

// ---------------------------------------------------------------------------
// Market Prices — live 24hr ticker
// ---------------------------------------------------------------------------

export const getMarketPrices = (): Promise<MarketPrice[]> =>
  customFetch<MarketPrice[]>("/api/market/prices");

export const useMarketPrices = (
  options?: { query?: UseQueryOptions<MarketPrice[]> }
) =>
  useQuery<MarketPrice[]>({
    queryKey: ["market", "prices"],
    queryFn: getMarketPrices,
    refetchInterval: 10_000,
    staleTime: 5_000,
    ...options?.query,
  });

// ---------------------------------------------------------------------------
// Account Balance
// ---------------------------------------------------------------------------

export const getAccountBalance = (): Promise<AssetBalance[]> =>
  customFetch<AssetBalance[]>("/api/market/balance");

export const useAccountBalance = (
  options?: { query?: UseQueryOptions<AssetBalance[]> }
) =>
  useQuery<AssetBalance[]>({
    queryKey: ["account", "balance"],
    queryFn: getAccountBalance,
    refetchInterval: 30_000,
    staleTime: 15_000,
    ...options?.query,
  });

// ---------------------------------------------------------------------------
// Cancel Order
// ---------------------------------------------------------------------------

export interface CancelOrderVars { id: number }

export const cancelOrder = (vars: CancelOrderVars): Promise<CancelOrderResult> =>
  customFetch<CancelOrderResult>(`/api/orders/${vars.id}/cancel`, { method: "POST" });

export const useCancelOrder = (
  options?: UseMutationOptions<CancelOrderResult, unknown, CancelOrderVars>
) =>
  useMutation<CancelOrderResult, unknown, CancelOrderVars>({
    mutationFn: cancelOrder,
    ...options,
  });
