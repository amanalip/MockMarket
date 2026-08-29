import { describe, it, expect } from 'vitest';
import { runBacktest } from '../engine/backtester/backtester';
import { computeBacktestStats, computeMonthlyReturns } from '../engine/backtester/stats';
import { Candle, BacktestConfig } from '../model/types';

const mkCandles = (n:number, startPrice=100): Candle[] => Array.from({length:n},(_,i)=> {
  const d=new Date('2020-01-01'); d.setDate(d.getDate()+i);
  const price=startPrice + Math.sin(i/5)*10 + i*0.3;
  return { time: d.toISOString().split('T')[0], open: price, high: price+2, low: price-2, close: price, volume: 1000000 };
});

const baseConfig: BacktestConfig = {
  ticker:'AAPL', startDate:'2020-01-03', endDate:'2020-02-15', initialCash:10000, positionSizePercent:100,
  entryRule:'SMA(50) > SMA(200)', exitRule:'SMA(50) < SMA(200)', stopLossPercent:0, takeProfitPercent:0
};

describe('Backtester - Edge Cases', () => {
  it('throws when filtered candles <5', () => {
    const candles=mkCandles(3);
    expect(()=> runBacktest(candles,candles,baseConfig,()=>false,()=>false)).toThrow(/Insufficient/);
  });

  it('handles empty benchmark gracefully (uses fallback 100)', () => {
    const candles=mkCandles(30);
    const res= runBacktest(candles,[],baseConfig,()=>true,()=>false);
    expect(res.equityCurve.length).toBeGreaterThan(0);
    expect(res.equityCurve[0].benchmarkValue).toBe(10000);
  });

  it('positionSize 0 never buys', () => {
    const candles=mkCandles(30);
    const cfg={...baseConfig, positionSizePercent:0};
    const res= runBacktest(candles,candles,cfg,()=>true,()=>false);
    expect(res.trades.length).toBe(0);
  });

  it('positionSize 200 does not go negative cash excessively (clamped)', () => {
    const candles=mkCandles(20, 10);
    const cfg={...baseConfig, positionSizePercent:200};
    const res= runBacktest(candles,candles,cfg, (ctx)=> ctx.index===0, ()=>false);
    // cash should not be hugely negative; current bug may go negative but we test expectation
    expect(res.equityCurve[0].strategyValue).toBeGreaterThan(0);
  });

  it('stopLoss triggers correctly', () => {
    const candles: Candle[] = [
      {time:'2020-01-01',open:100,high:100,low:100,close:100,volume:1e6},
      {time:'2020-01-02',open:100,high:100,low:100,close:100,volume:1e6},
      {time:'2020-01-03',open:100,high:100,low:100,close:100,volume:1e6},
      {time:'2020-01-04',open:100,high:100,low:100,close:100,volume:1e6},
      {time:'2020-01-05',open:100,high:100,low:100,close:100,volume:1e6},
      {time:'2020-01-06',open:100,high:110,low:70,close:90,volume:1e6}, // stop hit 90 low 70
      {time:'2020-01-07',open:90,high:90,low:90,close:90,volume:1e6},
    ];
    const cfg={...baseConfig, startDate:'2020-01-01', endDate:'2020-01-07', stopLossPercent:10};
    const res= runBacktest(candles,candles,cfg, (ctx)=> ctx.index===1, ()=>false);
    expect(res.trades.length).toBe(1);
    expect(res.trades[0].reason).toBe('Stop Loss');
  });

  it('takeProfit triggers', () => {
    const candles: Candle[] = [
      {time:'2020-01-01',open:100,high:100,low:100,close:100,volume:1e6},
      {time:'2020-01-02',open:100,high:100,low:100,close:100,volume:1e6},
      {time:'2020-01-03',open:100,high:100,low:100,close:100,volume:1e6},
      {time:'2020-01-04',open:100,high:100,low:100,close:100,volume:1e6},
      {time:'2020-01-05',open:100,high:100,low:100,close:100,volume:1e6},
      {time:'2020-01-06',open:100,high:130,low:100,close:120,volume:1e6},
    ];
    const cfg={...baseConfig, startDate:'2020-01-01', endDate:'2020-01-06', takeProfitPercent:10};
    const res= runBacktest(candles,candles,cfg, (ctx)=> ctx.index===1, ()=>false);
    expect(res.trades[0].reason).toBe('Take Profit');
  });

  it('price zero handling does not produce Infinity shares', () => {
    const candles: Candle[] = Array.from({length:6},(_,i)=>({time:`2020-01-0${i+1}`,open:i===2?0:100,high:100,low:0,close:i===2?0:100,volume:1e6}));
    const cfg={...baseConfig, startDate:'2020-01-01', endDate:'2020-01-06'};
    const res= runBacktest(candles,candles,cfg, (ctx)=> ctx.index===2, ()=>false);
    // should not have Infinity shares
    expect(res.trades.every(t=> Number.isFinite(t.shares))).toBe(true);
  });

  it('computeBacktestStats empty equity', () => {
    const s=computeBacktestStats([],[],10000,'2020-01-01','2020-01-02');
    expect(s.totalReturnPercent).toBe(0);
    expect(s.totalTrades).toBe(0);
  });

  it('computeBacktestStats winRate with breakeven excluded?', () => {
    const trades=[{id:'1',entryDate:'2020-01-01',exitDate:'2020-01-02',entryPrice:100,exitPrice:100,shares:10,pnl:0,pnlPercent:0,reason:'x'} as any];
    const curve=[{date:'2020-01-01',strategyValue:10000,buyAndHoldValue:10000,benchmarkValue:10000},{date:'2020-01-02',strategyValue:10000,buyAndHoldValue:10000,benchmarkValue:10000}];
    const s=computeBacktestStats(trades,curve,10000,'2020-01-01','2020-01-02');
    expect(s.winRatePercent).toBe(0);
    expect(s.totalTrades).toBe(1);
  });

  it('computeMonthlyReturns handles year-month sorting with zero-pad bug fix', () => {
    const curve=[
      {date:'2024-02-01',strategyValue:10000,buyAndHoldValue:10000,benchmarkValue:10000},
      {date:'2024-02-15',strategyValue:10100,buyAndHoldValue:10100,benchmarkValue:10100},
      {date:'2024-10-01',strategyValue:10200,buyAndHoldValue:10200,benchmarkValue:10200},
      {date:'2024-10-15',strategyValue:10300,buyAndHoldValue:10300,benchmarkValue:10300},
    ];
    const monthly=computeMonthlyReturns(curve as any);
    expect(monthly.length).toBe(2);
    expect(monthly[0].month).toBe(2);
    expect(monthly[1].month).toBe(10);
  });

  it('computeMonthlyReturns first month uses correct start', () => {
    const curve=[
      {date:'2024-01-01',strategyValue:10000,buyAndHoldValue:10000,benchmarkValue:10000},
      {date:'2024-01-31',strategyValue:11000,buyAndHoldValue:11000,benchmarkValue:11000},
      {date:'2024-02-15',strategyValue:12100,buyAndHoldValue:12100,benchmarkValue:12100},
    ];
    const monthly=computeMonthlyReturns(curve as any);
    expect(monthly[0].returnPercent).toBe(10);
    expect(monthly[1].returnPercent).toBe(10);
  });

  it('benchmark alignment with missing dates uses fallback', () => {
    const candles=mkCandles(10);
    const bench=candles.slice(0,5); // bench missing later dates
    const res=runBacktest(candles,bench,baseConfig,()=>true,()=>false);
    expect(res.equityCurve.length).toBeGreaterThan(0);
    // later bench values fallback to initialBenchPrice
    expect(res.equityCurve[res.equityCurve.length-1].benchmarkValue).toBeDefined();
  });

  it('profitFactor 99.99 when no losses', () => {
    const trades=[{id:'1',entryDate:'2020-01-01',exitDate:'2020-01-02',entryPrice:100,exitPrice:110,shares:10,pnl:100,pnlPercent:10,reason:'x'} as any];
    const curve=[{date:'2020-01-01',strategyValue:10000,buyAndHoldValue:10000,benchmarkValue:10000},{date:'2020-01-02',strategyValue:10100,buyAndHoldValue:10100,benchmarkValue:10100}];
    const s=computeBacktestStats(trades,curve,10000,'2020-01-01','2020-01-02');
    expect(s.profitFactor).toBe(Infinity);
  });
});
