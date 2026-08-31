import { Trade, Order, Candle, TradingAccountState } from '../../model/types';
import { OrderRequest, ExecutionResult } from './order-types';
import { calculatePositionUpdate, revaluePosition } from './portfolio';

export class TradingEngine {
  private state: TradingAccountState;

  constructor(initialCash = 100000, commissionPerTrade = 0) {
    this.state = {
      cash: initialCash,
      reservedCash: 0,
      availableCash: initialCash,
      startingCash: initialCash,
      commissionPerTrade,
      realizedPnL: 0,
      positions: {},
      trades: [],
      orders: [],
    };
  }

  getState(): TradingAccountState {
    return {
      ...this.state,
      positions: Object.fromEntries(
        Object.entries(this.state.positions).map(([k, v]) => [k, { ...v }])
      ),
      trades: [...this.state.trades],
      orders: [...this.state.orders.map((o) => ({ ...o }))],
    };
  }

  setCommission(fee: number): void {
    if (!Number.isFinite(fee) || fee < 0) return;
    this.state.commissionPerTrade = fee;
  }

  setCash(amount: number): void {
    if (!Number.isFinite(amount) || amount < this.state.reservedCash) return;
    this.state.cash = amount;
    this.syncCashBalances();
  }

  setStartingCash(amount: number): void {
    if (!Number.isFinite(amount) || amount < 0) return;
    this.state.startingCash = amount;
    this.state.cash = amount;
    this.state.reservedCash = 0;
    this.state.availableCash = amount;
    this.state.realizedPnL = 0;
    this.state.positions = {};
    this.state.trades = [];
    this.state.orders = [];
  }

  placeOrder(req: OrderRequest, candle?: Candle): ExecutionResult {
    const ticker = req.ticker.trim().toUpperCase();
    if (!ticker) {
      return { success: false, filled: false, error: 'Ticker is required.' };
    }
    req = { ...req, ticker };

    if (!Number.isFinite(req.shares) || !Number.isInteger(req.shares) || req.shares <= 0) {
      return { success: false, filled: false, error: 'Share count must be positive integer.' };
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
      const hasLimit = req.limitPrice !== undefined && req.limitPrice !== null;
      const hasStop = req.stopPrice !== undefined && req.stopPrice !== null;
      const priceToCheck = hasLimit ? req.limitPrice! : hasStop ? req.stopPrice! : candle?.close ?? 0;
      if (priceToCheck <= 0 || !Number.isFinite(priceToCheck)) {
        return { success: false, filled: false, error: 'Limit price must be positive.' };
      }
      if (!Number.isFinite(req.shares) || !Number.isInteger(req.shares) || req.shares <= 0) {
        return { success: false, filled: false, error: 'Share count must be positive integer.' };
      }
      const requiredCash = req.shares * priceToCheck + fee;
      if (this.state.availableCash < requiredCash) {
        return {
          success: false,
          filled: false,
          error: `Insufficient cash to reserve order. Need $${requiredCash.toFixed(2)}, available: $${this.state.availableCash.toFixed(2)}.`,
        };
      }
    } else {
      const pos = this.state.positions[ticker];
      const pendingSellShares = this.state.orders
        .filter((o) => o.ticker === ticker && o.side === 'sell' && o.status === 'pending')
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
      expiresAt: req.expiresAt,
      reservedCash: req.side === 'buy'
        ? req.shares * (req.limitPrice ?? req.stopPrice ?? candle?.close ?? 0) + fee
        : 0,
      status: 'pending',
    };

    this.state.orders.unshift(newOrder);
    this.syncCashBalances();

    // If candle is provided, check if it triggers immediately
    if (candle) {
      const filled = this.checkAndFillOrder(newOrder, candle);
      if (filled) {
        return {
          success: true,
          filled: true,
          orderId: newOrder.id,
          filledPrice: newOrder.filledPrice,
          shares: newOrder.shares,
        };
      }
      const terminalStatus = newOrder.status as Order['status'];
      if (terminalStatus === 'rejected' || terminalStatus === 'expired') {
        return {
          success: false,
          filled: false,
          orderId: newOrder.id,
          error: `Order ${terminalStatus} at execution.`,
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
      order.reservedCash = 0;
      this.syncCashBalances();
      return true;
    }
    return false;
  }

  processPendingOrders(candle: Candle, ticker: string): Order[] {
    ticker = ticker.trim().toUpperCase();
    const filled: Order[] = [];
    const pendingOrders = this.state.orders.filter(
      (o) => o.status === 'pending' && o.ticker === ticker
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
    if (candle.time < order.createdAt) return false;
    if (order.expiresAt && candle.time > order.expiresAt) {
      order.status = 'expired';
      order.reservedCash = 0;
      this.syncCashBalances();
      return false;
    }
    if (!candle || !Number.isFinite(candle.low) || !Number.isFinite(candle.high) || !Number.isFinite(candle.open) || !Number.isFinite(candle.close)) return false;

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
      if (order.stopPrice !== undefined && Number.isFinite(order.stopPrice)) {
        if (order.side === 'sell' && candle.low <= order.stopPrice) {
          shouldFill = true;
          fillPrice = Math.min(order.stopPrice, candle.open);
        } else if (order.side === 'buy' && candle.high >= order.stopPrice) {
          shouldFill = true;
          fillPrice = Math.max(order.stopPrice, candle.open);
        }
      }
    } else if (order.type === 'take_profit') {
      if (order.stopPrice !== undefined && Number.isFinite(order.stopPrice)) {
        if (order.side === 'sell' && candle.high >= order.stopPrice) {
          shouldFill = true;
          fillPrice = Math.max(order.stopPrice, candle.open);
        } else if (order.side === 'buy' && candle.low <= order.stopPrice) {
          shouldFill = true;
          fillPrice = Math.min(order.stopPrice, candle.open);
        }
      }
    }

    if (shouldFill) {
      return this.executeFill(order, fillPrice, candle.time);
    }

    return false;
  }

  private executeFill(order: Order, fillPrice: number, timestamp: string): boolean {
    if (!Number.isFinite(fillPrice) || fillPrice <= 0) {
      order.status = 'rejected';
      order.reservedCash = 0;
      this.syncCashBalances();
      return false;
    }
    const fee = this.state.commissionPerTrade;

    if (order.side === 'buy') {
      const totalCost = order.shares * fillPrice + fee;
      const spendableCash = this.state.availableCash + order.reservedCash;
      if (!Number.isFinite(totalCost) || spendableCash < totalCost) {
        order.status = 'rejected';
        order.reservedCash = 0;
        this.syncCashBalances();
        return false;
      }
      this.state.cash -= totalCost;
      const currentPos = this.state.positions[order.ticker];
      const { updatedPosition } = calculatePositionUpdate(currentPos, 'buy', order.shares, fillPrice, fee);
      if (updatedPosition) {
        updatedPosition.ticker = order.ticker;
        this.state.positions[order.ticker] = updatedPosition;
      }

      order.status = 'filled';
      order.reservedCash = 0;
      order.filledAt = timestamp;
      order.filledPrice = fillPrice;
      this.syncCashBalances();

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
        order.status = 'rejected';
        order.reservedCash = 0;
        this.syncCashBalances();
        return false;
      }

      const grossProceeds = order.shares * fillPrice;
      const netProceeds = grossProceeds - fee;
      this.state.cash += netProceeds;

      const { updatedPosition, realizedPnL } = calculatePositionUpdate(currentPos, 'sell', order.shares, fillPrice, fee);
      this.state.realizedPnL = Number((this.state.realizedPnL + realizedPnL).toFixed(2));
      if (updatedPosition) {
        this.state.positions[order.ticker] = updatedPosition;
      } else {
        delete this.state.positions[order.ticker];
      }

      order.status = 'filled';
      order.reservedCash = 0;
      order.filledAt = timestamp;
      order.filledPrice = fillPrice;
      this.syncCashBalances();

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
    return true;
  }

  executeMarketOrder(req: OrderRequest, candle: Candle): ExecutionResult {
    const ticker = req.ticker.trim().toUpperCase();
    if (!ticker) {
      return { success: false, filled: false, error: 'Ticker is required.' };
    }
    req = { ...req, ticker };
    const fillPrice = candle.close;
    const fee = this.state.commissionPerTrade;

    if (!Number.isFinite(req.shares) || !Number.isInteger(req.shares) || req.shares <= 0) {
      return { success: false, filled: false, error: 'Share count must be positive integer.' };
    }
    if (!Number.isFinite(fillPrice) || fillPrice <= 0) {
      return { success: false, filled: false, error: 'Price must be positive.' };
    }

    if (req.side === 'buy') {
      const totalCost = req.shares * fillPrice + fee;
      if (this.state.availableCash < totalCost) {
        return {
          success: false,
          filled: false,
          error: `Insufficient cash. Need $${totalCost.toFixed(2)}, available: $${this.state.availableCash.toFixed(2)}.`,
        };
      }

      this.state.cash -= totalCost;
      this.syncCashBalances();
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
      this.syncCashBalances();

      const { updatedPosition, realizedPnL } = calculatePositionUpdate(currentPos, 'sell', req.shares, fillPrice, fee);
      this.state.realizedPnL = Number((this.state.realizedPnL + realizedPnL).toFixed(2));
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
    priceMap = Object.fromEntries(
      Object.entries(priceMap).map(([ticker, price]) => [ticker.trim().toUpperCase(), price])
    );
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

  private syncCashBalances(): void {
    this.state.reservedCash = this.state.orders.reduce(
      (sum, order) => sum + (order.status === 'pending' && order.side === 'buy' ? order.reservedCash : 0),
      0
    );
    this.state.availableCash = this.state.cash - this.state.reservedCash;
  }
}
