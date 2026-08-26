import { Position, Trade, Order, Candle } from '../../model/types';
import { OrderRequest, ExecutionResult } from './order-types';
import { calculatePositionUpdate, revaluePosition } from './portfolio';

export interface TradingAccountState {
  cash: number;
  startingCash: number;
  commissionPerTrade: number;
  positions: Record<string, Position>;
  trades: Trade[];
  orders: Order[];
}

export class TradingEngine {
  private state: TradingAccountState;

  constructor(initialCash = 100000, commissionPerTrade = 0) {
    this.state = {
      cash: initialCash,
      startingCash: initialCash,
      commissionPerTrade,
      positions: {},
      trades: [],
      orders: [],
    };
  }

  getState(): TradingAccountState {
    return {
      ...this.state,
      positions: { ...this.state.positions },
      trades: [...this.state.trades],
      orders: [...this.state.orders],
    };
  }

  setCommission(fee: number): void {
    this.state.commissionPerTrade = fee;
  }

  setStartingCash(amount: number): void {
    this.state.startingCash = amount;
    this.state.cash = amount;
    this.state.positions = {};
    this.state.trades = [];
    this.state.orders = [];
  }

  placeOrder(req: OrderRequest, candle?: Candle): ExecutionResult {
    if (req.shares <= 0) {
      return { success: false, filled: false, error: 'Share count must be positive.' };
    }

    if (req.type === 'market') {
      if (!candle) {
        return { success: false, filled: false, error: 'Market orders require an active candle.' };
      }
      return this.executeMarketOrder(req, candle);
    }

    // Pending Order (limit, stop_loss, take_profit)
    const fee = this.state.commissionPerTrade;

    if (req.side === 'buy') {
      const priceToCheck = req.limitPrice || candle?.close || 0;
      if (priceToCheck <= 0) {
        return { success: false, filled: false, error: 'Limit price must be positive.' };
      }
      const requiredCash = req.shares * priceToCheck + fee;
      if (this.state.cash < requiredCash) {
        return {
          success: false,
          filled: false,
          error: `Insufficient cash to reserve order. Need $${requiredCash.toFixed(2)}, available: $${this.state.cash.toFixed(2)}.`,
        };
      }
    } else {
      // Sell limit/stop
      const pos = this.state.positions[req.ticker];
      const pendingSellShares = this.state.orders
        .filter((o) => o.ticker === req.ticker && o.side === 'sell' && o.status === 'pending')
        .reduce((sum, o) => sum + o.shares, 0);

      const availableShares = (pos?.shares || 0) - pendingSellShares;
      if (availableShares < req.shares) {
        return {
          success: false,
          filled: false,
          error: `Insufficient available shares. Owned: ${pos?.shares || 0}, already in open orders: ${pendingSellShares}.`,
        };
      }
    }

    const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newOrder: Order = {
      id: orderId,
      ticker: req.ticker,
      side: req.side,
      type: req.type,
      shares: req.shares,
      limitPrice: req.limitPrice,
      stopPrice: req.stopPrice,
      createdAt: req.date || candle?.time || new Date().toISOString().split('T')[0],
      status: 'pending',
    };

    this.state.orders.unshift(newOrder);

    // If candle is provided, check if it triggers immediately
    if (candle) {
      this.checkAndFillOrder(newOrder, candle);
      if (newOrder.status === 'filled') {
        return {
          success: true,
          filled: true,
          orderId: newOrder.id,
          filledPrice: newOrder.filledPrice,
          shares: newOrder.shares,
        };
      }
    }

    return {
      success: true,
      filled: false,
      orderId: newOrder.id,
    };
  }

  cancelOrder(orderId: string): boolean {
    const order = this.state.orders.find((o) => o.id === orderId);
    if (order && order.status === 'pending') {
      order.status = 'cancelled';
      return true;
    }
    return false;
  }

  processPendingOrders(candle: Candle, ticker: string): Order[] {
    const filled: Order[] = [];
    const pendingOrders = this.state.orders.filter(
      (o) => o.status === 'pending' && o.ticker.toUpperCase() === ticker.toUpperCase()
    );

    for (const order of pendingOrders) {
      if (this.checkAndFillOrder(order, candle)) {
        filled.push(order);
      }
    }

    return filled;
  }

  private checkAndFillOrder(order: Order, candle: Candle): boolean {
    if (order.status !== 'pending') return false;

    let shouldFill = false;
    let fillPrice = candle.close;

    if (order.type === 'limit') {
      if (order.side === 'buy' && order.limitPrice !== undefined) {
        if (candle.low <= order.limitPrice) {
          shouldFill = true;
          fillPrice = Math.min(order.limitPrice, candle.open);
        }
      } else if (order.side === 'sell' && order.limitPrice !== undefined) {
        if (candle.high >= order.limitPrice) {
          shouldFill = true;
          fillPrice = Math.max(order.limitPrice, candle.open);
        }
      }
    } else if (order.type === 'stop_loss') {
      if (order.stopPrice !== undefined && candle.low <= order.stopPrice) {
        shouldFill = true;
        fillPrice = Math.min(order.stopPrice, candle.open);
      }
    } else if (order.type === 'take_profit') {
      if (order.stopPrice !== undefined && candle.high >= order.stopPrice) {
        shouldFill = true;
        fillPrice = Math.max(order.stopPrice, candle.open);
      }
    }

    if (shouldFill) {
      this.executeFill(order, fillPrice, candle.time);
      return true;
    }

    return false;
  }

  private executeFill(order: Order, fillPrice: number, timestamp: string): void {
    const fee = this.state.commissionPerTrade;

    if (order.side === 'buy') {
      const totalCost = order.shares * fillPrice + fee;
      if (this.state.cash < totalCost) {
        order.status = 'cancelled';
        return;
      }
      this.state.cash -= totalCost;
      const currentPos = this.state.positions[order.ticker];
      const { updatedPosition } = calculatePositionUpdate(currentPos, 'buy', order.shares, fillPrice, fee);
      if (updatedPosition) {
        updatedPosition.ticker = order.ticker;
        this.state.positions[order.ticker] = updatedPosition;
      }

      order.status = 'filled';
      order.filledAt = timestamp;
      order.filledPrice = fillPrice;

      const trade: Trade = {
        id: `trade_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        ticker: order.ticker,
        side: 'buy',
        type: order.type,
        shares: order.shares,
        price: fillPrice,
        total: Number(totalCost.toFixed(2)),
        fee,
        timestamp,
      };
      this.state.trades.unshift(trade);
    } else {
      // Sell
      const currentPos = this.state.positions[order.ticker];
      if (!currentPos || currentPos.shares < order.shares) {
        order.status = 'cancelled';
        return;
      }

      const grossProceeds = order.shares * fillPrice;
      const netProceeds = grossProceeds - fee;
      this.state.cash += netProceeds;

      const { updatedPosition } = calculatePositionUpdate(currentPos, 'sell', order.shares, fillPrice, fee);
      if (updatedPosition) {
        this.state.positions[order.ticker] = updatedPosition;
      } else {
        delete this.state.positions[order.ticker];
      }

      order.status = 'filled';
      order.filledAt = timestamp;
      order.filledPrice = fillPrice;

      const trade: Trade = {
        id: `trade_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        ticker: order.ticker,
        side: 'sell',
        type: order.type,
        shares: order.shares,
        price: fillPrice,
        total: Number(grossProceeds.toFixed(2)),
        fee,
        timestamp,
      };
      this.state.trades.unshift(trade);
    }
  }

  executeMarketOrder(req: OrderRequest, candle: Candle): ExecutionResult {
    const fillPrice = candle.close;
    const fee = this.state.commissionPerTrade;

    if (req.shares <= 0) {
      return { success: false, filled: false, error: 'Share count must be positive.' };
    }

    if (req.side === 'buy') {
      const totalCost = req.shares * fillPrice + fee;
      if (this.state.cash < totalCost) {
        return {
          success: false,
          filled: false,
          error: `Insufficient cash. Need $${totalCost.toFixed(2)}, available: $${this.state.cash.toFixed(2)}.`,
        };
      }

      this.state.cash -= totalCost;
      const currentPos = this.state.positions[req.ticker];
      const { updatedPosition } = calculatePositionUpdate(currentPos, 'buy', req.shares, fillPrice, fee);
      if (updatedPosition) {
        updatedPosition.ticker = req.ticker;
        this.state.positions[req.ticker] = updatedPosition;
      }

      const trade: Trade = {
        id: `trade_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        ticker: req.ticker,
        side: 'buy',
        type: 'market',
        shares: req.shares,
        price: fillPrice,
        total: Number(totalCost.toFixed(2)),
        fee,
        timestamp: req.date || candle.time,
      };
      this.state.trades.unshift(trade);

      return {
        success: true,
        filled: true,
        filledPrice: fillPrice,
        shares: req.shares,
        totalCost: Number(totalCost.toFixed(2)),
        fee,
      };
    } else {
      // Sell
      const currentPos = this.state.positions[req.ticker];
      if (!currentPos || currentPos.shares < req.shares) {
        return {
          success: false,
          filled: false,
          error: `Insufficient shares. Owned: ${currentPos?.shares || 0}, requested: ${req.shares}.`,
        };
      }

      const grossProceeds = req.shares * fillPrice;
      const netProceeds = grossProceeds - fee;
      this.state.cash += netProceeds;

      const { updatedPosition, realizedPnL } = calculatePositionUpdate(currentPos, 'sell', req.shares, fillPrice, fee);
      if (updatedPosition) {
        this.state.positions[req.ticker] = updatedPosition;
      } else {
        delete this.state.positions[req.ticker];
      }

      const trade: Trade = {
        id: `trade_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        ticker: req.ticker,
        side: 'sell',
        type: 'market',
        shares: req.shares,
        price: fillPrice,
        total: Number(grossProceeds.toFixed(2)),
        fee,
        timestamp: req.date || candle.time,
      };
      this.state.trades.unshift(trade);

      return {
        success: true,
        filled: true,
        filledPrice: fillPrice,
        shares: req.shares,
        totalCost: Number(grossProceeds.toFixed(2)),
        fee,
        realizedPnL,
      };
    }
  }

  updatePrices(priceMap: Record<string, number>): void {
    Object.keys(this.state.positions).forEach((ticker) => {
      const newPrice = priceMap[ticker];
      if (newPrice !== undefined && this.state.positions[ticker]) {
        this.state.positions[ticker] = revaluePosition(this.state.positions[ticker], newPrice);
      }
    });
  }

  getTotalPortfolioValue(): number {
    const invested = Object.values(this.state.positions).reduce(
      (sum, pos) => sum + pos.currentValue,
      0
    );
    return Number((this.state.cash + invested).toFixed(2));
  }
}
