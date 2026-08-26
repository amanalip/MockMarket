import { OrderSide, OrderType, OrderStatus } from '../../model/types';

export interface OrderRequest {
  ticker: string;
  side: OrderSide;
  type: OrderType;
  shares: number;
  limitPrice?: number;
  stopPrice?: number;
  date: string;
}

export interface ExecutionResult {
  success: boolean;
  orderId?: string;
  filled: boolean;
  filledPrice?: number;
  shares?: number;
  totalCost?: number;
  fee?: number;
  realizedPnL?: number;
  error?: string;
}

export interface OrderRecord {
  id: string;
  ticker: string;
  side: OrderSide;
  type: OrderType;
  shares: number;
  limitPrice?: number;
  stopPrice?: number;
  createdAt: string;
  status: OrderStatus;
  filledAt?: string;
  filledPrice?: number;
}
