import { describe, it, expect } from 'vitest';
import { calculatePositionUpdate, revaluePosition } from '../engine/trading/portfolio';
import { Position } from '../model/types';

const basePos: Position = {
  ticker: 'AAPL',
  shares: 10,
  avgCost: 100,
  totalCost: 1000,
  currentPrice: 100,
  currentValue: 1000,
  unrealizedPnL: 0,
  unrealizedPnLPercent: 0,
  realizedPnL: 50,
};

describe('Portfolio Position Logic - Edges', () => {
  it('buy new position creates correct avgCost and realizedPnL zero', () => {
    const { updatedPosition, realizedPnL } = calculatePositionUpdate(undefined, 'buy', 10, 50, 0);
    expect(updatedPosition!.shares).toBe(10);
    expect(updatedPosition!.avgCost).toBe(50);
    expect(updatedPosition!.totalCost).toBe(500);
    expect(realizedPnL).toBe(0);
  });

  it('buy averages cost basis correctly', () => {
    const { updatedPosition } = calculatePositionUpdate(basePos, 'buy', 10, 200, 0);
    expect(updatedPosition!.shares).toBe(20);
    expect(updatedPosition!.totalCost).toBe(3000); // 1000+2000
    expect(updatedPosition!.avgCost).toBe(150);
  });

  it('buy with fee keeps cost basis without fee but realizedPnL unchanged', () => {
    const { updatedPosition } = calculatePositionUpdate(basePos, 'buy', 10, 100, 10);
    // fee not in totalCost per implementation
    expect(updatedPosition!.totalCost).toBe(2000);
    expect(updatedPosition!.realizedPnL).toBe(50);
  });

  it('sell partial calculates realized PnL including fee', () => {
    const { updatedPosition, realizedPnL } = calculatePositionUpdate(basePos, 'sell', 5, 120, 2);
    // cost 5*100=500, proceeds 600, pnl 600-500-2=98
    expect(realizedPnL).toBe(98);
    expect(updatedPosition!.shares).toBe(5);
    expect(updatedPosition!.totalCost).toBe(500);
    expect(updatedPosition!.realizedPnL).toBe(148); // 50+98
  });

  it('sell full returns null position', () => {
    const { updatedPosition, realizedPnL } = calculatePositionUpdate(basePos, 'sell', 10, 150, 0);
    expect(updatedPosition).toBeNull();
    expect(realizedPnL).toBe(500);
  });

  it('sell throws if insufficient shares', () => {
    expect(() => calculatePositionUpdate(basePos, 'sell', 20, 100, 0)).toThrow(/Insufficient shares/);
    expect(() => calculatePositionUpdate(undefined, 'sell', 1, 100, 0)).toThrow();
  });

  it('revaluePosition updates value and unrealized correctly', () => {
    const rev = revaluePosition(basePos, 150);
    expect(rev.currentPrice).toBe(150);
    expect(rev.currentValue).toBe(1500);
    expect(rev.unrealizedPnL).toBe(500);
    expect(rev.unrealizedPnLPercent).toBe(50);
  });

  it('revalue with zero price yields -100% unrealized', () => {
    const rev = revaluePosition(basePos, 0);
    expect(rev.currentValue).toBe(0);
    expect(rev.unrealizedPnL).toBe(-1000);
  });

  it('revalue with same price preserves values', () => {
    const rev = revaluePosition(basePos, 100);
    expect(rev.currentValue).toBe(1000);
    expect(rev.unrealizedPnL).toBe(0);
  });

  it('floating rounding preserves consistency shares*avgCost approx totalCost', () => {
    let pos: Position | undefined = undefined;
    for(let i=0;i<5;i++){
      const { updatedPosition } = calculatePositionUpdate(pos, 'buy', 3, 33.333, 0);
      pos = updatedPosition!;
    }
    // 15 shares
    expect(pos!.shares).toBe(15);
    // avgCost * shares approx totalCost within 0.05 due to rounding
    expect(Math.abs(pos!.shares * pos!.avgCost - pos!.totalCost)).toBeLessThan(0.05);
  });

  it('sell with fee loss scenario', () => {
    const pos: Position = { ...basePos, avgCost: 100, shares: 10, totalCost:1000, realizedPnL:0 };
    const { realizedPnL } = calculatePositionUpdate(pos, 'sell', 10, 90, 5);
    // 900-1000-5 = -105
    expect(realizedPnL).toBe(-105);
  });
});
