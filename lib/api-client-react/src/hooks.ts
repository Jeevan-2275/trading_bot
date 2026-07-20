/**
 * Custom (non-generated) React Query hooks — only for things not in the OpenAPI spec.
 */
import { useMutation } from "@tanstack/react-query";
import type { UseMutationOptions } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

// ---------------------------------------------------------------------------
// Cancel Order (not in OpenAPI spec)
// ---------------------------------------------------------------------------

export interface CancelOrderResult {
  success: boolean;
  message: string;
}

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
