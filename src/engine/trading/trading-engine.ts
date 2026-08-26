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

  getTotalRealizedPnL(): number {
    return Number(
      this.state.trades
        .filter((t) => t.side === 'sell')
        .reduce((sum, t) => {
          return sum + (t.total - t.fee);
        }, 0)
        .toFixed(2)
    );
  }
}
